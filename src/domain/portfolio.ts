export interface StockInput {
  symbol: string
  name: string
  quantity: number
  currentPrice: number
}

export interface AllocationInput {
  symbol: string
  targetPercent: number
}

export interface QuoteInput {
  symbol: string
  name: string
  currentPrice: number
}

export interface PortfolioInput {
  positions: StockInput[]
  allocations: AllocationInput[]
  quotes: QuoteInput[]
}

export interface ProposedTrade {
  symbol: string
  name: string
  side: 'buy' | 'sell'
  quantity: number
  currentPrice: number
  amount: number
  currentPercent: number
  targetPercent: number
}

export interface RebalanceResult {
  totalValue: number
  trades: ProposedTrade[]
}

const ALLOCATION_TOLERANCE_PERCENT = 1e-8

export class Stock {
  readonly symbol: string
  readonly name: string
  readonly quantity: number
  private readonly price: number

  constructor(input: StockInput) {
    this.symbol = normalizeSymbol(input.symbol)
    this.name = input.name.trim()
    this.quantity = input.quantity
    this.price = input.currentPrice
  }

  currentPrice(): number {
    return this.price
  }

  get value(): number {
    return this.quantity * this.price
  }
}

export class Portfolio {
  readonly positions: readonly Stock[]
  readonly allocations: readonly AllocationInput[]
  readonly quotes: readonly QuoteInput[]

  constructor(input: PortfolioInput) {
    this.positions = input.positions.map((position) => new Stock(position))
    this.allocations = input.allocations.map((allocation) => ({
      symbol: normalizeSymbol(allocation.symbol),
      targetPercent: allocation.targetPercent,
    }))
    this.quotes = input.quotes.map((quote) => ({
      symbol: normalizeSymbol(quote.symbol),
      name: quote.name.trim(),
      currentPrice: quote.currentPrice,
    }))
    this.validate()
  }

  rebalance(): RebalanceResult {
    const positions = new Map(this.positions.map((position) => [position.symbol, position]))
    const allocations = new Map(this.allocations.map((allocation) => [allocation.symbol, allocation]))
    const quotes = new Map(this.quotes.map((quote) => [quote.symbol, quote]))
    const totalValue = this.positions.reduce((sum, position) => {
      const nextTotal = sum + position.value
      if (!Number.isFinite(position.value) || !Number.isFinite(nextTotal)) {
        throw new Error('El valor total de la cartera debe ser finito.')
      }
      return nextTotal
    }, 0)

    const symbols = new Set([...positions.keys(), ...allocations.keys()])
    const trades: ProposedTrade[] = []

    for (const symbol of symbols) {
      const position = positions.get(symbol)
      const allocation = allocations.get(symbol)
      const quote = quotes.get(symbol)
      const currentPrice = position?.currentPrice() ?? quote?.currentPrice
      if (currentPrice === undefined) {
        throw new Error(`Falta el precio simulado de ${symbol}.`)
      }

      const currentValue = position?.value ?? 0
      const targetPercent = allocation?.targetPercent ?? 0
      const targetValue = totalValue * (targetPercent / 100)
      const difference = targetValue - currentValue
      if (!Number.isFinite(targetValue) || !Number.isFinite(difference)) {
        throw new Error('La propuesta excede los límites numéricos permitidos.')
      }
      const comparisonScale = Math.max(1, totalValue, currentValue, targetValue)
      if (Math.abs(difference) <= Number.EPSILON * comparisonScale * 8) continue

      const quantity = Math.abs(difference) / currentPrice
      if (!Number.isFinite(quantity)) {
        throw new Error(`La cantidad propuesta para ${symbol} excede los límites numéricos permitidos.`)
      }

      trades.push({
        symbol,
        name: position?.name ?? quote!.name,
        side: difference > 0 ? 'buy' : 'sell',
        quantity,
        currentPrice,
        amount: Math.abs(difference),
        currentPercent: totalValue === 0 ? 0 : (currentValue / totalValue) * 100,
        targetPercent,
      })
    }

    return { totalValue, trades }
  }

  private validate(): void {
    const positionSymbols = new Set<string>()
    const allocationSymbols = new Set<string>()
    const quoteSymbols = new Set<string>()

    for (const position of this.positions) {
      validateName(position.name)
      if (positionSymbols.has(position.symbol)) {
        throw new Error(`La posición ${position.symbol} está duplicada.`)
      }
      positionSymbols.add(position.symbol)
      if (!Number.isFinite(position.quantity) || position.quantity < 0) {
        throw new Error(`La cantidad de ${position.symbol} debe ser un número finito no negativo.`)
      }
      validatePrice(position.symbol, position.currentPrice())
      if (!Number.isFinite(position.value)) {
        throw new Error(`El valor de ${position.symbol} excede los límites numéricos permitidos.`)
      }
    }

    let allocationTotal = 0
    for (const allocation of this.allocations) {
      if (allocationSymbols.has(allocation.symbol)) {
        throw new Error(`El objetivo de ${allocation.symbol} está duplicado.`)
      }
      allocationSymbols.add(allocation.symbol)
      if (!Number.isFinite(allocation.targetPercent) || allocation.targetPercent < 0 || allocation.targetPercent > 100) {
        throw new Error(`El objetivo de ${allocation.symbol} debe estar entre 0 y 100%.`)
      }
      allocationTotal += allocation.targetPercent
    }

    if (this.allocations.length === 0 && this.positions.length > 0) {
      throw new Error('Define objetivos que sumen 100%.')
    }
    if (this.allocations.length > 0 && Math.abs(allocationTotal - 100) > ALLOCATION_TOLERANCE_PERCENT) {
      throw new Error('Los objetivos deben sumar 100%.')
    }

    for (const quote of this.quotes) {
      validateName(quote.name)
      if (quoteSymbols.has(quote.symbol)) {
        throw new Error(`El precio simulado de ${quote.symbol} está duplicado.`)
      }
      quoteSymbols.add(quote.symbol)
      validatePrice(quote.symbol, quote.currentPrice)
      if (positionSymbols.has(quote.symbol)) {
        throw new Error(`Usa un solo precio para ${quote.symbol}.`)
      }
      if (!allocationSymbols.has(quote.symbol)) {
        throw new Error(`El precio simulado de ${quote.symbol} no tiene un objetivo.`)
      }
    }

    for (const symbol of allocationSymbols) {
      if (!positionSymbols.has(symbol) && !quoteSymbols.has(symbol)) {
        throw new Error(`Falta el precio simulado de ${symbol}.`)
      }
    }
  }
}

export function calculateRebalance(input: PortfolioInput): RebalanceResult {
  return new Portfolio(input).rebalance()
}

export function validatePortfolioInput(value: unknown): PortfolioInput {
  if (!isRecord(value)) throw new Error('Los datos de la cartera no son válidos.')

  const input: PortfolioInput = {
    positions: readArray(value.positions, 'positions').map((entry) => {
      if (!isRecord(entry)) throw new Error('Una posición de la cartera no es válida.')
      return {
        symbol: readString(entry.symbol, 'symbol'),
        name: readString(entry.name, 'name'),
        quantity: readNumber(entry.quantity, 'quantity'),
        currentPrice: readNumber(entry.currentPrice, 'currentPrice'),
      }
    }),
    allocations: readArray(value.allocations, 'allocations').map((entry) => {
      if (!isRecord(entry)) throw new Error('Un objetivo de la cartera no es válido.')
      return {
        symbol: readString(entry.symbol, 'symbol'),
        targetPercent: readNumber(entry.targetPercent, 'targetPercent'),
      }
    }),
    quotes: readArray(value.quotes, 'quotes').map((entry) => {
      if (!isRecord(entry)) throw new Error('Un precio simulado no es válido.')
      return {
        symbol: readString(entry.symbol, 'symbol'),
        name: readString(entry.name, 'name'),
        currentPrice: readNumber(entry.currentPrice, 'currentPrice'),
      }
    }),
  }

  return input
}

function normalizeSymbol(value: string): string {
  const symbol = value.trim().toUpperCase()
  if (!/^[A-Z0-9.-]{1,12}$/.test(symbol)) throw new Error('Cada símbolo debe tener entre 1 y 12 caracteres válidos.')
  return symbol
}

function validateName(name: string): void {
  if (!name.trim()) throw new Error('Cada acción necesita un nombre.')
}

function validatePrice(symbol: string, price: number): void {
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`El precio de ${symbol} debe ser finito y mayor que cero.`)
  }
}

function readArray(value: unknown, key: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`El campo ${key} debe ser una lista.`)
  return value
}

function readString(value: unknown, key: string): string {
  if (typeof value !== 'string') throw new Error(`El campo ${key} debe ser texto.`)
  return value
}

function readNumber(value: unknown, key: string): number {
  if (typeof value !== 'number') throw new Error(`El campo ${key} debe ser numérico.`)
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
