import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { MarketQuote } from '@/domain/market'
import {
  calculateUnrealizedReturn,
  type UnrealizedReturn,
} from '@/domain/portfolio'
import {
  paginatePortfolioRows,
  sortPortfolioRows,
  type PortfolioSortOrder,
  type PortfolioTableRow,
} from './portfolio-table-model'

type PortfolioTableProps = {
  rows: PortfolioTableRow[]
  totalValue: number
  priceMetadata: Record<string, Pick<MarketQuote, 'source' | 'asOf'>>
  addDisabled: boolean
  onAddStock: () => void
}

const dollars = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const number = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 6 })
const percent = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 })
const localDateTime = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function quoteTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${localDateTime.format(date)} (hora local)`
}

function signedCurrency(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${dollars.format(Math.abs(value))}`
}

function signedPercent(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${percent.format(Math.abs(value))}%`
}

function resultDetails(result: UnrealizedReturn) {
  if (result.status === 'no-position') {
    return { label: 'Sin posición', tone: 'text-muted-foreground', value: null }
  }
  if (result.status === 'pending-cost') {
    return { label: 'Costo pendiente', tone: 'text-muted-foreground', value: null }
  }

  const label =
    result.outcome === 'gain'
      ? 'Ganancia'
      : result.outcome === 'loss'
        ? 'Pérdida'
        : 'Sin variación'
  const tone =
    result.outcome === 'gain'
      ? 'text-emerald-700 dark:text-emerald-300'
      : result.outcome === 'loss'
        ? 'text-red-700 dark:text-red-300'
        : 'text-muted-foreground'

  return {
    label,
    tone,
    value: `${signedCurrency(result.change)} (${signedPercent(result.changePercent)})`,
  }
}

function positionWeight(value: number, totalValue: number): number {
  return totalValue > 0 ? (value / totalValue) * 100 : 0
}

export function PortfolioTable({
  rows,
  totalValue,
  priceMetadata,
  addDisabled,
  onAddStock,
}: PortfolioTableProps) {
  const [sortOrder, setSortOrder] = useState<PortfolioSortOrder>('desc')
  const [pageIndex, setPageIndex] = useState(0)
  const sortedRows = sortPortfolioRows(rows, sortOrder)
  const page = paginatePortfolioRows(sortedRows, pageIndex)

  useEffect(() => {
    setPageIndex((current) => Math.min(current, page.totalPages - 1))
  }, [page.totalPages])

  return (
    <>
      <div className="flex flex-wrap items-end justify-end gap-3 py-4">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Ordenar por valor</span>
          <select
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(event.target.value as PortfolioSortOrder)
              setPageIndex(0)
            }}
            className="h-9 cursor-pointer rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="desc">Mayor a menor</option>
            <option value="asc">Menor a mayor</option>
          </select>
        </label>
      </div>

      <ul
        aria-label="Posiciones del portafolio"
        className="divide-y divide-border md:hidden"
      >
        {page.rows.map((row) => {
          const value = row.quantity * row.currentPrice
          const currentPercent = positionWeight(value, totalValue)
          const quoteMetadata = priceMetadata[row.symbol.toUpperCase()]
          const returnDetails = resultDetails(
            calculateUnrealizedReturn(row.currentPrice, row.lots),
          )

          return (
            <li key={row.id} className="py-4 first:pt-0 last:pb-0 hover:bg-muted/30">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{row.symbol}</p>
                  <p className="truncate text-xs text-muted-foreground" title={row.name}>
                    {row.name}
                  </p>
                  <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
                    {number.format(row.quantity)} acc. · Precio actual {dollars.format(row.currentPrice)}
                  </p>
                  {quoteMetadata && (
                    <p className="break-words text-[9px] leading-4 text-muted-foreground">
                      {quoteMetadata.source} · {quoteTime(quoteMetadata.asOf)}
                    </p>
                  )}
                  <p className="text-[10px] leading-4 text-muted-foreground">
                    Costo promedio {row.quantity === 0 ? '—' : row.averagePurchasePrice === null ? 'pendiente' : dollars.format(row.averagePurchasePrice)}
                  </p>
                  <p className="text-[10px] leading-4 text-muted-foreground">
                    Actual {percent.format(currentPercent)}% · Objetivo {percent.format(row.targetPercent)}%
                  </p>
                </div>
                <div className="w-[116px] shrink-0 text-right">
                  <p className="text-[10px] text-muted-foreground">Valor actual</p>
                  <p className="text-xs font-semibold tabular-nums">{dollars.format(value)}</p>
                  <p className={`mt-2 break-words text-[10px] font-medium ${returnDetails.tone}`}>
                    {returnDetails.label}
                  </p>
                  {returnDetails.value && (
                    <p className={`break-words text-[10px] tabular-nums ${returnDetails.tone}`}>
                      {returnDetails.value}
                    </p>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <table
        aria-label="Posiciones del portafolio"
        className="hidden w-full table-fixed text-left md:table"
      >
        <thead>
          <tr className="border-y border-border bg-muted/40 text-[10px] font-medium text-muted-foreground">
            <th scope="col" className="w-[24%] py-3 pl-3 pr-2 font-medium lg:pl-4">
              ACCIÓN
            </th>
            <th scope="col" className="w-[10%] px-2 py-3 text-right font-medium">
              CANTIDAD
            </th>
            <th scope="col" className="w-[14%] px-2 py-3 text-right font-medium">
              PRECIO ACTUAL
            </th>
            <th scope="col" className="w-[14%] px-2 py-3 text-right font-medium">
              COSTO PROMEDIO
            </th>
            <th scope="col" className="w-[14%] px-2 py-3 text-right font-medium">
              VALOR ACTUAL
            </th>
            <th scope="col" className="w-[24%] px-2 py-3 text-right font-medium lg:pr-4">
              RESULTADO ESTIMADO
            </th>
          </tr>
        </thead>
        <tbody>
          {page.rows.map((row) => {
            const value = row.quantity * row.currentPrice
            const currentPercent = positionWeight(value, totalValue)
            const quoteMetadata = priceMetadata[row.symbol.toUpperCase()]
            const returnDetails = resultDetails(
              calculateUnrealizedReturn(row.currentPrice, row.lots),
            )

            return (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="py-4 pl-3 pr-2 lg:pl-4">
                  <p className="text-xs font-semibold">{row.symbol}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground" title={row.name}>
                    {row.name}
                  </p>
                  <p className="mt-1 text-[9px] text-muted-foreground">
                    Actual {percent.format(currentPercent)}% · Objetivo {percent.format(row.targetPercent)}%
                  </p>
                </td>
                <td className="px-2 py-4 text-right text-xs tabular-nums">
                  {number.format(row.quantity)}
                </td>
                <td className="px-2 py-4 text-right text-xs tabular-nums text-muted-foreground">
                  {dollars.format(row.currentPrice)}
                  {quoteMetadata && (
                    <span className="mt-1 block break-words text-[9px] leading-3">
                      {quoteMetadata.source} · {quoteTime(quoteMetadata.asOf)}
                    </span>
                  )}
                </td>
                <td className="px-2 py-4 text-right text-xs tabular-nums text-muted-foreground">
                  {row.quantity === 0
                    ? '—'
                    : row.averagePurchasePrice === null
                      ? 'Pendiente'
                      : dollars.format(row.averagePurchasePrice)}
                </td>
                <td className="px-2 py-4 text-right text-xs font-semibold tabular-nums">
                  {dollars.format(value)}
                </td>
                <td className={`px-2 py-4 text-right text-xs tabular-nums lg:pr-4 ${returnDetails.tone}`}>
                  <span className="block text-[10px] font-medium">{returnDetails.label}</span>
                  {returnDetails.value ?? '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3">
        <span className="max-w-[70%] text-[10px] leading-4 text-muted-foreground">
          {Object.keys(priceMetadata).length === 0
            ? 'Precios guardados o de ejemplo · USD'
            : 'Las cotizaciones muestran su fuente y hora · USD'}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto cursor-pointer px-0 text-[11px] text-blue-600 hover:bg-transparent hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200 focus-visible:ring-2 focus-visible:ring-ring"
          disabled={addDisabled}
          onClick={onAddStock}
        >
          <Plus className="size-3.5" /> Agregar acción
        </Button>
      </div>

      <p className="border-t border-border py-3 text-[10px] leading-4 text-muted-foreground">
        Resultado no realizado estimado, calculado con el precio actual frente al costo histórico. Sin comisiones ni impuestos.
      </p>

      {page.totalPages > 1 && (
        <nav
          aria-label="Paginación de posiciones"
          className="flex items-center justify-center gap-4 border-t border-border py-3"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page.pageIndex === 0}
            onClick={() => setPageIndex(page.pageIndex - 1)}
          >
            Anterior
          </Button>
          <span aria-live="polite" className="text-xs tabular-nums text-muted-foreground">
            Página {page.pageIndex + 1} de {page.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page.pageIndex === page.totalPages - 1}
            onClick={() => setPageIndex(page.pageIndex + 1)}
          >
            Siguiente
          </Button>
        </nav>
      )}
    </>
  )
}
