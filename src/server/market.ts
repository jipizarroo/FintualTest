import { createServerFn } from '@tanstack/react-start'
import {
  validateMarketQuotesInput,
  type MarketQuote,
  type MarketQuotesInput,
  type MarketQuotesResult,
} from '../domain/market'

const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'
const MAX_CONCURRENT_REQUESTS = 4
const REQUEST_TIMEOUT_MS = 8_000

type QuoteOutcome =
  | { quote: MarketQuote }
  | { error: MarketQuotesResult['errors'][number] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseYahooQuote(symbol: string, payload: unknown): MarketQuote | undefined {
  if (!isRecord(payload) || !isRecord(payload.chart) || payload.chart.error != null) {
    return undefined
  }

  const result = payload.chart.result
  if (!Array.isArray(result) || !isRecord(result[0]) || !isRecord(result[0].meta)) {
    return undefined
  }

  const meta = result[0].meta
  const price = meta.regularMarketPrice
  const timestamp = meta.regularMarketTime
  if (
    meta.symbol !== symbol ||
    meta.currency !== 'USD' ||
    typeof price !== 'number' ||
    !Number.isFinite(price) ||
    price <= 0 ||
    typeof timestamp !== 'number' ||
    !Number.isInteger(timestamp) ||
    timestamp <= 0
  ) {
    return undefined
  }

  const quoteDate = new Date(timestamp * 1000)
  if (!Number.isFinite(quoteDate.getTime())) return undefined

  return {
    symbol,
    price,
    currency: 'USD',
    asOf: quoteDate.toISOString(),
    source: 'Yahoo Finance',
  }
}

async function fetchYahooQuote(symbol: string): Promise<QuoteOutcome> {
  let response: Response
  try {
    response = await fetch(
      `${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      {
        headers: { 'User-Agent': 'Balance/1.0' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    )
  } catch {
    return { error: { symbol, message: 'No se pudo conectar con Yahoo Finance.' } }
  }

  if (!response.ok) {
    const message =
      response.status === 429
        ? 'Yahoo Finance limitó la consulta.'
        : 'Yahoo Finance no devolvió una cotización.'
    return { error: { symbol, message } }
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return { error: { symbol, message: 'Yahoo Finance devolvió datos inválidos.' } }
  }

  const quote = parseYahooQuote(symbol, payload)
  if (!quote) {
    return { error: { symbol, message: 'No hay una cotización válida en USD.' } }
  }

  return { quote }
}

export async function fetchMarketQuotes(
  input: MarketQuotesInput,
): Promise<MarketQuotesResult> {
  const outcomes: Array<QuoteOutcome | undefined> = input.symbols.map(() => undefined)
  let nextIndex = 0

  const workers = Array.from(
    { length: Math.min(MAX_CONCURRENT_REQUESTS, input.symbols.length) },
    async () => {
      while (true) {
        const index = nextIndex
        nextIndex += 1
        const symbol = input.symbols[index]
        if (symbol === undefined) return
        outcomes[index] = await fetchYahooQuote(symbol)
      }
    },
  )

  await Promise.all(workers)
  const completed = outcomes.filter(
    (outcome): outcome is QuoteOutcome => outcome !== undefined,
  )

  return {
    quotes: completed.flatMap((outcome) => ('quote' in outcome ? [outcome.quote] : [])),
    errors: completed.flatMap((outcome) => ('error' in outcome ? [outcome.error] : [])),
    fetchedAt: new Date().toISOString(),
  }
}

export const getMarketQuotes = createServerFn({ method: 'POST' })
  .validator(validateMarketQuotesInput)
  .handler(({ data }) => fetchMarketQuotes(data))
