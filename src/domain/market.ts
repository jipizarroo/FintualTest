export type MarketQuotesInput = {
  symbols: string[]
}

export type MarketQuote = {
  symbol: string
  price: number
  currency: 'USD'
  asOf: string
  source: 'Yahoo Finance'
}

export type MarketQuotesResult = {
  quotes: MarketQuote[]
  errors: { symbol: string; message: string }[]
  fetchedAt: string
}

const SYMBOL_PATTERN = /^[A-Z][A-Z0-9]*(?:[.-][A-Z0-9]+)?$/

export function validateMarketQuotesInput(value: unknown): MarketQuotesInput {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('symbols' in value) ||
    !Array.isArray(value.symbols)
  ) {
    throw new Error('Los símbolos de cotización no son válidos.')
  }

  const rawSymbols = value.symbols as unknown[]
  if (rawSymbols.length > 20) {
    throw new Error('Se admiten hasta 20 símbolos por consulta.')
  }

  const symbols = new Set<string>()
  for (const rawSymbol of rawSymbols) {
    if (typeof rawSymbol !== 'string') {
      throw new Error('Los símbolos de cotización no son válidos.')
    }

    const symbol = rawSymbol.trim().toUpperCase()
    if (symbol.length > 12 || !SYMBOL_PATTERN.test(symbol)) {
      throw new Error('Los símbolos de cotización no son válidos.')
    }

    symbols.add(symbol)
  }

  return { symbols: [...symbols] }
}
