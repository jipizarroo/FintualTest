import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PortfolioInput } from '../../domain/portfolio'
import {
  clearPortfolioStorage,
  loadPortfolioStorage,
  savePortfolioStorage,
} from './storage'

const storageKey = 'balance.portfolio.v1'
const input: PortfolioInput = {
  positions: [{
    symbol: 'AAPL',
    name: 'Apple',
    currentPrice: 100,
    lots: [
      { quantity: 0.5, purchasePrice: 80 },
      { quantity: 0.5, purchasePrice: 100 },
    ],
  }],
  allocations: [{ symbol: 'AAPL', targetPercent: 95 }],
  quotes: [{ symbol: 'TSLA', name: 'Tesla', currentPrice: 200 }],
}

function createStorage(initialValue?: string) {
  const entries = new Map<string, string>()
  if (initialValue !== undefined) entries.set(storageKey, initialValue)

  return {
    entries,
    getItem: vi.fn((key: string) => entries.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => entries.set(key, value)),
    removeItem: vi.fn((key: string) => entries.delete(key)),
  }
}

function useStorage(storage: ReturnType<typeof createStorage>) {
  vi.stubGlobal('window', { localStorage: storage })
}

afterEach(() => vi.unstubAllGlobals())

describe('portfolio storage', () => {
  it('saves and reloads positions, quotes, and incomplete target allocations', () => {
    const storage = createStorage()
    useStorage(storage)

    expect(savePortfolioStorage(input)).toBe(true)
    expect(storage.entries.get(storageKey)).toBe(
      JSON.stringify({ version: 2, input }),
    )
    expect(loadPortfolioStorage()).toEqual({ status: 'saved', input })
  })

  it('migrates v1 in memory without writing or inventing costs', () => {
    const legacyInput = {
      positions: [
        { symbol: 'AAPL', name: 'Apple', quantity: 1, currentPrice: 100 },
        { symbol: 'NVDA', name: 'NVIDIA', quantity: 0, currentPrice: 50 },
      ],
      allocations: [{ symbol: 'AAPL', targetPercent: 95 }],
      quotes: [{ symbol: 'TSLA', name: 'Tesla', currentPrice: 200 }],
    }
    const serialized = JSON.stringify({ version: 1, input: legacyInput })
    const storage = createStorage(serialized)
    useStorage(storage)

    expect(loadPortfolioStorage()).toEqual({
      status: 'saved',
      input: {
        positions: [
          {
            symbol: 'AAPL',
            name: 'Apple',
            currentPrice: 100,
            lots: [{ quantity: 1, purchasePrice: null }],
          },
          {
            symbol: 'NVDA',
            name: 'NVIDIA',
            currentPrice: 50,
            lots: [],
          },
        ],
        allocations: [{ symbol: 'AAPL', targetPercent: 95 }],
        quotes: [{ symbol: 'TSLA', name: 'Tesla', currentPrice: 200 }],
      },
    })
    expect(storage.entries.get(storageKey)).toBe(serialized)
    expect(storage.setItem).not.toHaveBeenCalled()
  })


  it('returns empty without writing when no portfolio is saved', () => {
    const storage = createStorage()
    useStorage(storage)

    expect(loadPortfolioStorage()).toEqual({ status: 'empty' })
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('removes a saved portfolio', () => {
    const storage = createStorage(JSON.stringify({ version: 1, input }))
    useStorage(storage)

    expect(clearPortfolioStorage()).toBe(true)
    expect(storage.entries.has(storageKey)).toBe(false)
  })

  it.each([
    { name: 'JSON is malformed', serialized: '{' },
    {
      name: 'the saved shape is invalid',
      serialized: JSON.stringify({ version: 1, input: {} }),
    },
    {
      name: 'a number is not finite',
      serialized:
        '{"version":1,"input":{"positions":[{"symbol":"AAPL","name":"Apple","quantity":1e309,"currentPrice":100}],"allocations":[{"symbol":"AAPL","targetPercent":95}],"quotes":[]}}',
    },
    {
      name: 'a lot has a negative quantity',
      serialized: JSON.stringify({
        version: 2,
        input: {
          ...input,
          positions: [{
            symbol: 'AAPL',
            name: 'Apple',
            currentPrice: 100,
            lots: [{ quantity: -1, purchasePrice: null }],
          }],
        },
      }),
    },
    {
      name: 'a lot has a non-positive purchase price',
      serialized: JSON.stringify({
        version: 2,
        input: {
          ...input,
          positions: [{
            symbol: 'AAPL',
            name: 'Apple',
            currentPrice: 100,
            lots: [{ quantity: 1, purchasePrice: 0 }],
          }],
        },
      }),
    },
    {
      name: 'the version is unknown',
      serialized: JSON.stringify({ version: 3, input }),
    },
  ])('leaves saved data untouched when $name', ({ serialized }) => {
    const storage = createStorage(serialized)
    useStorage(storage)

    expect(loadPortfolioStorage()).toEqual({ status: 'error' })
    expect(storage.entries.get(storageKey)).toBe(serialized)
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('reports read errors', () => {
    const storage = createStorage()
    storage.getItem.mockImplementation(() => {
      throw new Error('blocked')
    })
    useStorage(storage)

    expect(loadPortfolioStorage()).toEqual({ status: 'error' })
  })

  it('does not write invalid portfolio data', () => {
    const storage = createStorage()
    useStorage(storage)
    const invalidInput: PortfolioInput = {
      ...input,
      positions: [{
        symbol: 'AAPL',
        name: 'Apple',
        currentPrice: 100,
        lots: [{ quantity: -1, purchasePrice: null }],
      }],
    }

    expect(savePortfolioStorage(invalidInput)).toBe(false)
    expect(storage.setItem).not.toHaveBeenCalled()
  })


  it('reports write errors', () => {
    const storage = createStorage()
    storage.setItem.mockImplementation(() => {
      throw new Error('blocked')
    })
    useStorage(storage)

    expect(savePortfolioStorage(input)).toBe(false)
  })

  it('reports remove errors', () => {
    const storage = createStorage()
    storage.removeItem.mockImplementation(() => {
      throw new Error('blocked')
    })
    useStorage(storage)

    expect(clearPortfolioStorage()).toBe(false)
  })
})
