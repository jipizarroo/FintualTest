import type { PurchaseLot } from '../../domain/portfolio'

export type PortfolioTableRow = {
  id: string
  symbol: string
  name: string
  quantity: number
  currentPrice: number
  targetPercent: number
  averagePurchasePrice: number | null
  lots: PurchaseLot[]
}

export type PortfolioSortOrder = 'desc' | 'asc'

export const PORTFOLIO_PAGE_SIZE = 10

export function sortPortfolioRows(
  rows: readonly PortfolioTableRow[],
  order: PortfolioSortOrder,
): PortfolioTableRow[] {
  return [...rows].sort((left, right) => {
    const leftValue = left.quantity * left.currentPrice
    const rightValue = right.quantity * right.currentPrice
    if (leftValue !== rightValue) {
      return order === 'desc' ? rightValue - leftValue : leftValue - rightValue
    }
    return left.symbol < right.symbol ? -1 : left.symbol > right.symbol ? 1 : 0
  })
}

export function paginatePortfolioRows(
  rows: readonly PortfolioTableRow[],
  pageIndex: number,
): { rows: PortfolioTableRow[]; pageIndex: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(rows.length / PORTFOLIO_PAGE_SIZE))
  const safePageIndex = Math.min(
    Math.max(0, Math.floor(pageIndex)),
    totalPages - 1,
  )
  const firstRow = safePageIndex * PORTFOLIO_PAGE_SIZE

  return {
    rows: rows.slice(firstRow, firstRow + PORTFOLIO_PAGE_SIZE),
    pageIndex: safePageIndex,
    totalPages,
  }
}
