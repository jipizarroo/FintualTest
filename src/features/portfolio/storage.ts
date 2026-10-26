import {
  summarizeLots,
  validatePortfolioInput,
  type PortfolioInput,
} from '../../domain/portfolio'

const storageKey = 'balance.portfolio.v1'

export type PortfolioStorageRead =
  | { status: 'empty' }
  | { status: 'saved'; input: PortfolioInput }
  | { status: 'error' }

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function hasValidNumbers(input: PortfolioInput): boolean {
  return (
    input.positions.every((position) => {
      const { quantity } = summarizeLots(position.lots)
      return (
        Number.isFinite(position.currentPrice) &&
        position.currentPrice > 0 &&
        Number.isFinite(quantity * position.currentPrice)
      )
    }) &&
    input.allocations.every(
      (allocation) =>
        Number.isFinite(allocation.targetPercent) &&
        allocation.targetPercent >= 0 &&
        allocation.targetPercent <= 100,
    ) &&
    input.quotes.every(
      (quote) => Number.isFinite(quote.currentPrice) && quote.currentPrice > 0,
    )
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function migrateV1Input(value: unknown): unknown {
  if (!isRecord(value) || !Array.isArray(value.positions)) {
    throw new Error('Los datos de la cartera v1 no son válidos.')
  }

  return {
    ...value,
    positions: value.positions.map((position) => {
      if (!isRecord(position)) {
        throw new Error('Una posición de la cartera v1 no es válida.')
      }

      return {
        symbol: position.symbol,
        name: position.name,
        currentPrice: position.currentPrice,
        lots:
          position.quantity === 0
            ? []
            : [{ quantity: position.quantity, purchasePrice: null }],
      }
    }),
  }
}

export function loadPortfolioStorage(): PortfolioStorageRead {
  const storage = browserStorage()
  if (!storage) return { status: 'error' }

  try {
    const serialized = storage.getItem(storageKey)
    if (serialized === null) return { status: 'empty' }

    const envelope: unknown = JSON.parse(serialized)
    if (!isRecord(envelope) || !('version' in envelope) || !('input' in envelope)) {
      return { status: 'error' }
    }

    let input: PortfolioInput
    if (envelope.version === 1) {
      input = validatePortfolioInput(migrateV1Input(envelope.input))
    } else if (envelope.version === 2) {
      input = validatePortfolioInput(envelope.input)
    } else {
      return { status: 'error' }
    }

    if (!hasValidNumbers(input)) return { status: 'error' }

    return { status: 'saved', input }
  } catch {
    return { status: 'error' }
  }
}

export function savePortfolioStorage(input: PortfolioInput): boolean {
  const storage = browserStorage()
  if (!storage) return false

  try {
    const validatedInput = validatePortfolioInput(input)
    if (!hasValidNumbers(validatedInput)) return false
    storage.setItem(
      storageKey,
      JSON.stringify({ version: 2, input: validatedInput }),
    )
    return true
  } catch {
    return false
  }
}

export function clearPortfolioStorage(): boolean {
  const storage = browserStorage()
  if (!storage) return false

  try {
    storage.removeItem(storageKey)
    return true
  } catch {
    return false
  }
}
