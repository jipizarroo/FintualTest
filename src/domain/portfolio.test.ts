import { describe, expect, it } from 'vitest'
import {
  calculateRebalance,
  Portfolio,
  summarizeLots,
  type PortfolioInput,
} from './portfolio'

describe('summarizeLots', () => {
  it('calculates the weighted average and ignores unknown costs for zero quantities', () => {
    const summary = summarizeLots([
      { quantity: 2, purchasePrice: 100 },
      { quantity: 1, purchasePrice: 200 },
      { quantity: 0, purchasePrice: null },
    ])

    expect(summary.quantity).toBe(3)
    expect(summary.averagePurchasePrice).toBeCloseTo(400 / 3)
  })

  it('returns null when a held purchase has no cost or total quantity is zero', () => {
    expect(summarizeLots([
      { quantity: 2, purchasePrice: 100 },
      { quantity: 1, purchasePrice: null },
    ])).toEqual({ quantity: 3, averagePurchasePrice: null })
    expect(summarizeLots([
      { quantity: 0, purchasePrice: 100 },
    ])).toEqual({ quantity: 0, averagePurchasePrice: null })
  })

  it.each([
    {
      name: 'negative quantity',
      lots: [{ quantity: -1, purchasePrice: null }],
    },
    {
      name: 'non-finite quantity',
      lots: [{ quantity: Number.POSITIVE_INFINITY, purchasePrice: null }],
    },
    {
      name: 'non-positive purchase price',
      lots: [{ quantity: 1, purchasePrice: 0 }],
    },
    {
      name: 'non-finite purchase price',
      lots: [{ quantity: 1, purchasePrice: Number.POSITIVE_INFINITY }],
    },
    {
      name: 'quantity overflow',
      lots: [
        { quantity: 1e308, purchasePrice: null },
        { quantity: 1e308, purchasePrice: null },
      ],
    },
    {
      name: 'purchase cost overflow',
      lots: [
        { quantity: 8e307, purchasePrice: 2 },
        { quantity: 8e307, purchasePrice: 2 },
      ],
    },
  ])('rejects $name', ({ lots }) => {
    expect(() => summarizeLots(lots)).toThrow()
  })
})


describe('calculateRebalance', () => {
  it('proposes dollar-based buys and sells for held and target-only symbols', () => {
    const result = calculateRebalance({
      positions: [
        {
          symbol: 'MSFT',
          name: 'Microsoft',
          currentPrice: 100,
          lots: [{ quantity: 2, purchasePrice: 10 }],
        },
        {
          symbol: 'AAPL',
          name: 'Apple',
          currentPrice: 100,
          lots: [{ quantity: 1, purchasePrice: 25 }],
        },
      ],
      allocations: [
        { symbol: 'MSFT', targetPercent: 50 },
        { symbol: 'AAPL', targetPercent: 40 },
        { symbol: 'TSLA', targetPercent: 10 },
      ],
      quotes: [{ symbol: 'TSLA', name: 'Tesla', currentPrice: 50 }],
    })

    expect(result.totalValue).toBe(300)
    expect(result.trades).toEqual([
      expect.objectContaining({ symbol: 'MSFT', side: 'sell', quantity: 0.5, amount: 50, targetPercent: 50 }),
      expect.objectContaining({ symbol: 'AAPL', side: 'buy', quantity: 0.2, amount: 20, targetPercent: 40 }),
      expect.objectContaining({ symbol: 'TSLA', side: 'buy', quantity: 0.6, amount: 30, targetPercent: 10 }),
    ])
  })

  it('liquidates a held symbol missing from the target allocation', () => {
    const result = calculateRebalance({
      positions: [
        {
          symbol: 'NVDA',
          name: 'NVIDIA',
          currentPrice: 100,
          lots: [{ quantity: 1, purchasePrice: null }],
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft',
          currentPrice: 100,
          lots: [{ quantity: 1, purchasePrice: null }],
        },
      ],
      allocations: [{ symbol: 'MSFT', targetPercent: 100 }],
      quotes: [],
    })

    expect(result.trades).toEqual([
      expect.objectContaining({ symbol: 'NVDA', side: 'sell', quantity: 1, amount: 100, targetPercent: 0 }),
      expect.objectContaining({ symbol: 'MSFT', side: 'buy', quantity: 1, amount: 100, targetPercent: 100 }),
    ])
  })

  it('returns no trades when the portfolio has zero value', () => {
    expect(calculateRebalance({
      positions: [],
      allocations: [{ symbol: 'SPY', targetPercent: 100 }],
      quotes: [{ symbol: 'SPY', name: 'S&P 500 ETF', currentPrice: 500 }],
    })).toEqual({ totalValue: 0, trades: [] })
  })

  it('does not propose residual trades for an already balanced portfolio', () => {
    const positions = [
      {
        symbol: 'AAPL',
        name: 'Apple',
        currentPrice: 3.33,
        lots: [{ quantity: 1, purchasePrice: null }],
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft',
        currentPrice: 6.68,
        lots: [{ quantity: 1, purchasePrice: null }],
      },
    ]
    const total = 10.01

    expect(calculateRebalance({
      positions,
      allocations: [
        { symbol: 'AAPL', targetPercent: (3.33 / total) * 100 },
        { symbol: 'MSFT', targetPercent: (6.68 / total) * 100 },
      ],
      quotes: [],
    }).trades).toEqual([])
  })

  it('rejects invalid weights, duplicate symbols, and a second price for a held symbol', () => {
    const input: PortfolioInput = {
      positions: [{
        symbol: 'AAPL',
        name: 'Apple',
        currentPrice: 100,
        lots: [{ quantity: 1, purchasePrice: null }],
      }],
      allocations: [{ symbol: 'AAPL', targetPercent: 95 }],
      quotes: [],
    }

    expect(() => new Portfolio(input)).toThrow('Los objetivos deben sumar 100%.')
    expect(() => new Portfolio({ ...input, allocations: [
      { symbol: 'AAPL', targetPercent: 50 },
      { symbol: ' aapl ', targetPercent: 50 },
    ] })).toThrow('El objetivo de AAPL está duplicado.')
    expect(() => new Portfolio({ ...input, allocations: [{ symbol: 'AAPL', targetPercent: 100 }], quotes: [
      { symbol: 'AAPL', name: 'Apple', currentPrice: 101 },
    ] })).toThrow('Usa un solo precio para AAPL.')
  })

  it('rejects non-finite position values and totals', () => {
    expect(() => new Portfolio({
      positions: [{
        symbol: 'AAPL',
        name: 'Apple',
        currentPrice: 2,
        lots: [{ quantity: Number.MAX_VALUE, purchasePrice: null }],
      }],
      allocations: [{ symbol: 'AAPL', targetPercent: 100 }],
      quotes: [],
    })).toThrow('El valor de AAPL excede los límites numéricos permitidos.')

    expect(() => calculateRebalance({
      positions: [
        {
          symbol: 'AAA',
          name: 'AAA Inc.',
          currentPrice: Number.MAX_VALUE,
          lots: [{ quantity: 1, purchasePrice: null }],
        },
        {
          symbol: 'BBB',
          name: 'BBB Inc.',
          currentPrice: Number.MAX_VALUE,
          lots: [{ quantity: 1, purchasePrice: null }],
        },
      ],
      allocations: [
        { symbol: 'AAA', targetPercent: 50 },
        { symbol: 'BBB', targetPercent: 50 },
      ],
      quotes: [],
    })).toThrow('El valor total de la cartera debe ser finito.')
  })
})
