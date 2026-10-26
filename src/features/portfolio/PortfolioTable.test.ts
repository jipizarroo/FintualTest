import { describe, expect, it } from 'vitest'

import {
  paginatePortfolioRows,
  sortPortfolioRows,
  type PortfolioTableRow,
} from './portfolio-table-model'

function row(symbol: string, quantity: number, currentPrice: number): PortfolioTableRow {
  return {
    id: symbol,
    symbol,
    name: symbol,
    quantity,
    currentPrice,
    targetPercent: 0,
    averagePurchasePrice: null,
    lots: [],
  }
}

function rows(count: number): PortfolioTableRow[] {
  return Array.from({ length: count }, (_, index) =>
    row(`STOCK${index}`, 1, index + 1),
  )
}

describe('sortPortfolioRows', () => {
  const portfolioRows = [
    row('MSFT', 1, 100),
    row('TSLA', 1, 50),
    row('AAPL', 1, 50),
  ]

  it('sorts by numeric value and then by symbol', () => {
    expect(sortPortfolioRows(portfolioRows, 'desc').map(({ symbol }) => symbol)).toEqual([
      'MSFT',
      'AAPL',
      'TSLA',
    ])
  })

  it('supports the reverse order and leaves the input unchanged', () => {
    expect(sortPortfolioRows(portfolioRows, 'asc').map(({ symbol }) => symbol)).toEqual([
      'AAPL',
      'TSLA',
      'MSFT',
    ])
    expect(portfolioRows.map(({ symbol }) => symbol)).toEqual(['MSFT', 'TSLA', 'AAPL'])
  })
})

describe('paginatePortfolioRows', () => {
  it.each([
    { count: 10, totalPages: 1, lastPageRows: 10 },
    { count: 11, totalPages: 2, lastPageRows: 1 },
    { count: 23, totalPages: 3, lastPageRows: 3 },
  ])('shows the expected pages for $count rows', ({ count, totalPages, lastPageRows }) => {
    const portfolioRows = rows(count)
    const firstPage = paginatePortfolioRows(portfolioRows, 0)
    const lastPage = paginatePortfolioRows(portfolioRows, totalPages - 1)

    expect(firstPage.totalPages).toBe(totalPages)
    expect(firstPage.rows).toHaveLength(10)
    expect(lastPage.rows).toHaveLength(lastPageRows)
  })

  it('clamps the page after the row count decreases', () => {
    const page = paginatePortfolioRows(rows(11), 2)

    expect(page.pageIndex).toBe(1)
    expect(page.totalPages).toBe(2)
    expect(page.rows).toHaveLength(1)
  })
})
