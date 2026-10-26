import { describe, expect, it } from 'vitest'
import { calculateRebalance, Portfolio, type PortfolioInput } from './portfolio'

describe('calculateRebalance', () => {
  it('proposes dollar-based buys and sells for held and target-only symbols', () => {
    const result = calculateRebalance({
      positions: [
        { symbol: 'MSFT', name: 'Microsoft', quantity: 2, currentPrice: 100 },
        { symbol: 'AAPL', name: 'Apple', quantity: 1, currentPrice: 100 },
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
        { symbol: 'NVDA', name: 'NVIDIA', quantity: 1, currentPrice: 100 },
        { symbol: 'MSFT', name: 'Microsoft', quantity: 1, currentPrice: 100 },
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
      { symbol: 'AAPL', name: 'Apple', quantity: 1, currentPrice: 3.33 },
      { symbol: 'MSFT', name: 'Microsoft', quantity: 1, currentPrice: 6.68 },
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
      positions: [{ symbol: 'AAPL', name: 'Apple', quantity: 1, currentPrice: 100 }],
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
      positions: [{ symbol: 'AAPL', name: 'Apple', quantity: Number.MAX_VALUE, currentPrice: 2 }],
      allocations: [{ symbol: 'AAPL', targetPercent: 100 }],
      quotes: [],
    })).toThrow('El valor de AAPL excede los límites numéricos permitidos.')

    expect(() => calculateRebalance({
      positions: [
        { symbol: 'AAA', name: 'AAA Inc.', quantity: 1, currentPrice: Number.MAX_VALUE },
        { symbol: 'BBB', name: 'BBB Inc.', quantity: 1, currentPrice: Number.MAX_VALUE },
      ],
      allocations: [
        { symbol: 'AAA', targetPercent: 50 },
        { symbol: 'BBB', targetPercent: 50 },
      ],
      quotes: [],
    })).toThrow('El valor total de la cartera debe ser finito.')
  })
})
