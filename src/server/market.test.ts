import { afterEach, describe, expect, it, vi } from 'vitest'
import { validateMarketQuotesInput } from '../domain/market'
import { fetchMarketQuotes } from './market'

const MARKET_TIME = 1_792_785_601

function yahooPayload(symbol: string, overrides: Record<string, unknown> = {}) {
  return {
    chart: {
      result: [
        {
          meta: {
            symbol,
            currency: 'USD',
            regularMarketPrice: 347.725,
            regularMarketTime: MARKET_TIME,
            ...overrides,
          },
        },
      ],
      error: null,
    },
  }
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('market quote requests', () => {
  it('normalizes and deduplicates symbols, then rejects invalid input', () => {
    expect(
      validateMarketQuotesInput({ symbols: [' aapl ', 'MSFT', 'AAPL'] }),
    ).toEqual({ symbols: ['AAPL', 'MSFT'] })

    expect(() => validateMarketQuotesInput({ symbols: ['BAD$'] })).toThrow()
    expect(() =>
      validateMarketQuotesInput({ symbols: Array.from({ length: 21 }, () => 'AAPL') }),
    ).toThrow()
  })

  it('returns an empty result without contacting the provider', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchMarketQuotes({ symbols: [] })

    expect(result.quotes).toEqual([])
    expect(result.errors).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns the latest USD quote and its provider timestamp', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(yahooPayload('AAPL')))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchMarketQuotes({ symbols: ['AAPL'] })

    expect(result.quotes).toEqual([
      {
        symbol: 'AAPL',
        price: 347.725,
        currency: 'USD',
        asOf: new Date(MARKET_TIME * 1000).toISOString(),
        source: 'Yahoo Finance',
      },
    ])
    expect(result.errors).toEqual([])
    expect(Number.isNaN(Date.parse(result.fetchedAt))).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d',
      expect.objectContaining({
        headers: { 'User-Agent': 'Balance/1.0' },
        signal: expect.any(AbortSignal),
      }),
    )
  })

  it('returns successful quotes when another symbol fails', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/MSFT?')) return jsonResponse({}, 404)
      return jsonResponse(yahooPayload('AAPL'))
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchMarketQuotes({ symbols: ['AAPL', 'MSFT'] })

    expect(result.quotes.map(({ symbol }) => symbol)).toEqual(['AAPL'])
    expect(result.errors.map(({ symbol }) => symbol)).toEqual(['MSFT'])
  })

  it('returns a per-symbol error when Yahoo Finance limits the request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 429)))

    const result = await fetchMarketQuotes({ symbols: ['AAPL'] })

    expect(result.quotes).toEqual([])
    expect(result.errors.map(({ symbol }) => symbol)).toEqual(['AAPL'])
  })

  it('returns a per-symbol error when the network request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const result = await fetchMarketQuotes({ symbols: ['AAPL'] })

    expect(result.quotes).toEqual([])
    expect(result.errors.map(({ symbol }) => symbol)).toEqual(['AAPL'])
  })

  it('returns a per-symbol error when Yahoo Finance sends invalid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{')))

    const result = await fetchMarketQuotes({ symbols: ['AAPL'] })

    expect(result.quotes).toEqual([])
    expect(result.errors.map(({ symbol }) => symbol)).toEqual(['AAPL'])
  })

  it.each([
    ['symbol mismatch', { symbol: 'MSFT' }],
    ['non-USD currency', { currency: 'CAD' }],
    ['missing price', { regularMarketPrice: null }],
    ['invalid timestamp', { regularMarketTime: 0 }],
  ])('rejects a provider response with %s', async (_name, overrides) => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(yahooPayload('AAPL', overrides)),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchMarketQuotes({ symbols: ['AAPL'] })

    expect(result.quotes).toEqual([])
    expect(result.errors.map(({ symbol }) => symbol)).toEqual(['AAPL'])
  })

  it('limits simultaneous provider requests to four', async () => {
    let activeRequests = 0
    let maxActiveRequests = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      activeRequests += 1
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests)
      await new Promise((resolve) => setTimeout(resolve, 0))
      activeRequests -= 1
      const symbol = String(input).split('/').at(-1)?.split('?')[0] ?? ''
      return jsonResponse(yahooPayload(symbol))
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchMarketQuotes({ symbols: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META'] })

    expect(maxActiveRequests).toBe(4)
  })
})
