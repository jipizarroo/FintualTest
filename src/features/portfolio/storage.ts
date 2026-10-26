import { validatePortfolioInput, type PortfolioInput } from '../../domain/portfolio'

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

function hasFiniteNumbers(input: PortfolioInput): boolean {
  return (
    input.positions.every(
      (position) =>
        Number.isFinite(position.quantity) &&
        Number.isFinite(position.currentPrice),
    ) &&
    input.allocations.every((allocation) =>
      Number.isFinite(allocation.targetPercent),
    ) &&
    input.quotes.every((quote) => Number.isFinite(quote.currentPrice))
  )
}

export function loadPortfolioStorage(): PortfolioStorageRead {
  const storage = browserStorage()
  if (!storage) return { status: 'error' }

  try {
    const serialized = storage.getItem(storageKey)
    if (serialized === null) return { status: 'empty' }

    const value: unknown = JSON.parse(serialized)
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      !('version' in value) ||
      value.version !== 1 ||
      !('input' in value)
    ) {
      return { status: 'error' }
    }

    const input = validatePortfolioInput(value.input)
    if (!hasFiniteNumbers(input)) return { status: 'error' }

    return { status: 'saved', input }
  } catch {
    return { status: 'error' }
  }
}

export function savePortfolioStorage(input: PortfolioInput): boolean {
  const storage = browserStorage()
  if (!storage) return false

  try {
    storage.setItem(storageKey, JSON.stringify({ version: 1, input }))
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
