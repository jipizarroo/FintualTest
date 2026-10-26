import { useState, type FormEvent } from 'react'
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  ChartPie,
  Check,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  LayoutDashboard,
  LoaderCircle,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { PortfolioInput, RebalanceResult } from '@/domain/portfolio'

type PortfolioDashboardProps = {
  initialInput: PortfolioInput
  onRebalance: (input: PortfolioInput) => Promise<RebalanceResult>
}

type EditorRow = {
  id: string
  symbol: string
  name: string
  quantity: string
  currentPrice: string
  targetPercent: string
}

type ProposalState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: RebalanceResult }
  | { status: 'error'; message: string }

const dollars = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const number = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 6 })
const percent = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 })
const allocationColors = [
  '#2563eb',
  '#60a5fa',
  '#93c5fd',
  '#6366f1',
  '#a5b4fc',
  '#38bdf8',
]

function rowsFromInput(input: PortfolioInput): EditorRow[] {
  const symbols = new Set([
    ...input.positions.map((position) => position.symbol),
    ...input.allocations.map((allocation) => allocation.symbol),
  ])

  return [...symbols].map((symbol, index) => {
    const position = input.positions.find((item) => item.symbol === symbol)
    const quote = input.quotes.find((item) => item.symbol === symbol)
    const allocation = input.allocations.find((item) => item.symbol === symbol)

    return {
      id: `${symbol}-${index}`,
      symbol,
      name: position?.name ?? quote?.name ?? symbol,
      quantity: String(position?.quantity ?? 0),
      currentPrice: String(position?.currentPrice ?? quote?.currentPrice ?? 0),
      targetPercent: String(allocation?.targetPercent ?? 0),
    }
  })
}

export function PortfolioDashboard({
  initialInput,
  onRebalance,
}: PortfolioDashboardProps) {
  const [input, setInput] = useState(initialInput)
  const [editor, setEditor] = useState<{
    rows: EditorRow[]
    error: string | null
  } | null>(null)
  const [proposal, setProposal] = useState<ProposalState>({ status: 'idle' })
  const rows = rowsFromInput(input)
  const totalValue = input.positions.reduce(
    (sum, position) => sum + position.quantity * position.currentPrice,
    0,
  )
  const targetTotal = input.allocations.reduce(
    (sum, allocation) => sum + allocation.targetPercent,
    0,
  )
  const targetComplete = Math.abs(targetTotal - 100) <= 1e-8
  const loading = proposal.status === 'loading'
  const positiveTargets = rows.filter((row) => Number(row.targetPercent) > 0)
  let segmentStart = 0
  const chartSegments = positiveTargets.map((row, index) => {
    const start = segmentStart
    segmentStart += Number(row.targetPercent)
    return `${allocationColors[index % allocationColors.length]} ${start}% ${segmentStart}%`
  })
  const chartBackground = targetComplete
    ? `conic-gradient(${chartSegments.join(', ')})`
    : '#e8edf5'

  function updateRow(
    id: string,
    field: keyof Omit<EditorRow, 'id'>,
    value: string,
  ) {
    setEditor(
      (current) =>
        current && {
          rows: current.rows.map((row) =>
            row.id === id ? { ...row, [field]: value } : row,
          ),
          error: null,
        },
    )
  }

  function savePortfolio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editor) return

    const updatedRows = editor.rows.map((row) => ({
      symbol: row.symbol.trim().toUpperCase(),
      name: row.name.trim(),
      quantity: Number(row.quantity),
      currentPrice: Number(row.currentPrice),
      targetPercent: Number(row.targetPercent),
    }))

    if (updatedRows.some((row) => !row.symbol || !row.name)) {
      setEditor({
        ...editor,
        error: 'Completa el ticker y el nombre de cada acción.',
      })
      return
    }
    if (
      new Set(updatedRows.map((row) => row.symbol)).size !== updatedRows.length
    ) {
      setEditor({
        ...editor,
        error: 'Cada ticker debe aparecer una sola vez.',
      })
      return
    }
    if (
      updatedRows.some(
        (row) =>
          !Number.isFinite(row.quantity) ||
          row.quantity < 0 ||
          !Number.isFinite(row.currentPrice) ||
          row.currentPrice <= 0 ||
          !Number.isFinite(row.targetPercent) ||
          row.targetPercent < 0 ||
          row.targetPercent > 100,
      )
    ) {
      setEditor({
        ...editor,
        error:
          'Usa cantidades desde 0, precios mayores que 0 y objetivos entre 0% y 100%.',
      })
      return
    }

    setInput({
      positions: updatedRows
        .filter((row) => row.quantity > 0)
        .map(({ symbol, name, quantity, currentPrice }) => ({
          symbol,
          name,
          quantity,
          currentPrice,
        })),
      allocations: updatedRows.map(({ symbol, targetPercent }) => ({
        symbol,
        targetPercent,
      })),
      quotes: updatedRows
        .filter((row) => row.quantity === 0)
        .map(({ symbol, name, currentPrice }) => ({
          symbol,
          name,
          currentPrice,
        })),
    })
    setProposal({ status: 'idle' })
    setEditor(null)
  }

  async function rebalance() {
    setProposal({ status: 'loading' })
    try {
      setProposal({ status: 'success', result: await onRebalance(input) })
    } catch (error) {
      setProposal({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Ocurrió un problema. Intenta de nuevo.',
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-[#17243b] antialiased">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-slate-200/80 bg-white px-5 py-8 xl:flex">
        <a
          href="#"
          className="flex w-fit items-center gap-2.5 px-3 text-[27px] font-semibold tracking-[-1.4px]"
          aria-label="Balance, inicio"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white">
            <ArrowRightLeft className="size-5" strokeWidth={2.5} />
          </span>
          balance<span className="-ml-2 text-blue-600">.</span>
        </a>
        <p className="mb-3 mt-14 px-3 text-[10px] font-semibold tracking-[0.16em] text-slate-400">
          MI ESPACIO
        </p>
        <a
          href="#portfolio"
          className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-600"
          aria-current="page"
        >
          <LayoutDashboard className="size-[18px]" /> Mi portafolio
          <ChevronRight className="ml-auto size-4" />
        </a>
        <div className="mt-auto rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
          <span className="mb-3 grid size-8 place-items-center rounded-lg bg-white text-blue-600 shadow-sm">
            <ChartPie className="size-[18px]" />
          </span>
          <p className="text-sm font-semibold">Invierte con intención.</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Define tus objetivos y dale a cada inversión su lugar.
          </p>
        </div>
        <p className="mt-6 px-3 text-[11px] text-slate-400">
          Balance · Simulador de inversiones
        </p>
      </aside>

      <div className="xl:pl-56">
        <header className="flex h-[76px] items-center justify-between border-b border-slate-200/70 bg-white/85 px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3 text-sm">
            <span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-white xl:hidden">
              <ArrowRightLeft className="size-4" />
            </span>
            <span className="hidden text-slate-400 sm:inline">Mi espacio</span>
            <ChevronRight className="hidden size-3.5 text-slate-300 sm:block" />
            <span className="font-medium">Mi portafolio</span>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-500">
            <span className="size-1.5 rounded-full bg-blue-500" /> Simulador
          </span>
        </header>

        <main className="mx-auto max-w-[1440px] px-5 pb-8 pt-8 sm:px-8 lg:px-10 lg:pt-10">
          <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-blue-600">
                CLARIDAD PARA TUS INVERSIONES
              </p>
              <h1 className="text-[30px] font-semibold tracking-[-1.1px] sm:text-[34px]">
                Tu portafolio, en equilibrio.
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Revisa dónde estás y decide cómo quieres invertir.
              </p>
            </div>
            <Button
              className="h-11 self-start rounded-xl bg-blue-600 px-5 text-white shadow-sm shadow-blue-200 hover:bg-blue-700 sm:self-auto"
              disabled={loading || editor !== null || rows.length === 0}
              onClick={rebalance}
            >
              {loading ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <ArrowRightLeft />
              )}
              {loading ? 'Calculando...' : 'Rebalancear'}
            </Button>
          </div>

          <div className="mb-7 grid gap-4 md:grid-cols-[1.35fr_1fr_1fr]">
            <Card className="relative overflow-hidden border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-200/50">
              <div className="pointer-events-none absolute -right-8 -top-14 size-52 rounded-full border-[28px] border-white/[0.035]" />
              <CardContent className="relative p-6">
                <div className="flex items-center gap-2 text-[12px] text-blue-100">
                  <Wallet className="size-4" /> Valor de tu portafolio
                </div>
                <p className="mb-3 mt-4 text-[34px] font-semibold leading-none tracking-[-1.1px] tabular-nums">
                  {dollars.format(totalValue)}{' '}
                  <span className="text-xs font-normal tracking-normal text-blue-200">
                    USD
                  </span>
                </p>
                <p className="text-[11px] text-blue-100/80">
                  El valor actual de todas tus posiciones
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200/80 bg-white shadow-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-[12px] text-slate-500">
                  Acciones en tu portafolio
                  <span className="grid size-7 place-items-center rounded-lg bg-slate-50 text-slate-400">
                    <LayoutDashboard className="size-4" />
                  </span>
                </div>
                <p className="mb-2 mt-2 text-[32px] font-semibold leading-none tracking-[-1px] tabular-nums">
                  {input.positions.length.toString().padStart(2, '0')}
                </p>
                <p className="mt-3 text-[11px] text-slate-400">
                  {positiveTargets.length} con asignación objetivo
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200/80 bg-white shadow-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-[12px] text-slate-500">
                  Asignación objetivo
                  <span className="grid size-7 place-items-center rounded-lg bg-slate-50 text-slate-400">
                    <ChartPie className="size-4" />
                  </span>
                </div>
                <div className="mb-2 mt-2 flex items-end gap-2">
                  <p className="text-[32px] font-semibold leading-none tracking-[-1px] tabular-nums">
                    {percent.format(targetTotal)}
                    <span className="ml-0.5 text-xl text-slate-400">%</span>
                  </p>
                  {targetComplete && (
                    <span className="mb-0.5 flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-600">
                      <Check className="size-3" /> Completa
                    </span>
                  )}
                </div>
                <p className="mt-3 text-[11px] text-slate-400">
                  {targetComplete
                    ? 'Tus objetivos suman el 100%'
                    : 'Los objetivos deben sumar el 100%'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <Card
              id="portfolio"
              className="min-w-0 scroll-mt-6 border-slate-200/80 bg-white shadow-none"
            >
              <CardHeader className="flex-row items-center justify-between gap-3 border-b border-slate-100 pb-5">
                <div>
                  <CardTitle className="text-[16px] tracking-[-0.3px]">
                    Tu portafolio
                  </CardTitle>
                  <p className="mt-2 text-xs text-slate-400">
                    Tus posiciones actuales y el lugar al que quieres llegar.
                  </p>
                </div>
                {!editor && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50"
                    disabled={loading}
                    onClick={() => setEditor({ rows, error: null })}
                  >
                    <SlidersHorizontal className="size-3.5" /> Editar
                    <span className="hidden sm:inline"> portafolio</span>
                  </Button>
                )}
                {editor && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Cancelar edición"
                    className="text-slate-400"
                    onClick={() => setEditor(null)}
                  >
                    <X />
                  </Button>
                )}
              </CardHeader>

              {editor ? (
                <form onSubmit={savePortfolio} className="p-5 sm:p-6">
                  <p className="mb-5 rounded-lg bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-700">
                    Ingresa los precios en USD. Usa cantidad 0 para una acción
                    que quieres agregar, u objetivo 0% para vender una posición.
                  </p>
                  <div className="space-y-4">
                    {editor.rows.map((row, index) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-2 items-end gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-6"
                      >
                        <label className="block text-[11px] font-medium text-slate-500">
                          Ticker
                          <Input
                            required
                            aria-label={`Ticker de la acción ${index + 1}`}
                            className="mt-1.5 uppercase"
                            value={row.symbol}
                            placeholder="AAPL"
                            onChange={(event) =>
                              updateRow(row.id, 'symbol', event.target.value)
                            }
                          />
                        </label>
                        <label className="block text-[11px] font-medium text-slate-500 sm:col-span-2">
                          Nombre
                          <Input
                            required
                            aria-label={`Nombre de la acción ${index + 1}`}
                            className="mt-1.5"
                            value={row.name}
                            placeholder="Apple Inc."
                            onChange={(event) =>
                              updateRow(row.id, 'name', event.target.value)
                            }
                          />
                        </label>
                        <label className="block text-[11px] font-medium text-slate-500">
                          Cantidad
                          <Input
                            required
                            type="number"
                            min="0"
                            step="any"
                            aria-label={`Cantidad de ${row.symbol || `la acción ${index + 1}`}`}
                            className="mt-1.5"
                            value={row.quantity}
                            onChange={(event) =>
                              updateRow(row.id, 'quantity', event.target.value)
                            }
                          />
                        </label>
                        <label className="block text-[11px] font-medium text-slate-500">
                          Precio USD
                          <Input
                            required
                            type="number"
                            min="0"
                            step="any"
                            aria-label={`Precio de ${row.symbol || `la acción ${index + 1}`}`}
                            className="mt-1.5"
                            value={row.currentPrice}
                            onChange={(event) =>
                              updateRow(
                                row.id,
                                'currentPrice',
                                event.target.value,
                              )
                            }
                          />
                        </label>
                        <div className="flex items-end gap-2">
                          <label className="block min-w-0 flex-1 text-[11px] font-medium text-slate-500">
                            Objetivo %
                            <Input
                              required
                              type="number"
                              min="0"
                              max="100"
                              step="any"
                              aria-label={`Objetivo de ${row.symbol || `la acción ${index + 1}`}`}
                              className="mt-1.5"
                              value={row.targetPercent}
                              onChange={(event) =>
                                updateRow(
                                  row.id,
                                  'targetPercent',
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mb-0.5 shrink-0 text-slate-400 hover:bg-red-50 hover:text-red-500"
                            aria-label={`Quitar ${row.symbol || `acción ${index + 1}`}`}
                            onClick={() =>
                              setEditor({
                                rows: editor.rows.filter(
                                  (item) => item.id !== row.id,
                                ),
                                error: null,
                              })
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {editor.error && (
                    <p role="alert" className="mt-4 text-sm text-red-600">
                      {editor.error}
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-dashed border-slate-300 bg-white text-xs text-slate-600"
                      onClick={() =>
                        setEditor({
                          rows: [
                            ...editor.rows,
                            {
                              id: crypto.randomUUID(),
                              symbol: '',
                              name: '',
                              quantity: '0',
                              currentPrice: '',
                              targetPercent: '0',
                            },
                          ],
                          error: null,
                        })
                      }
                    >
                      <Plus className="size-3.5" /> Agregar acción
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-slate-500"
                        onClick={() => setEditor(null)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-blue-600 text-xs text-white hover:bg-blue-700"
                      >
                        <Check className="size-3.5" /> Guardar cambios
                      </Button>
                    </div>
                  </div>
                </form>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-16 text-center">
                  <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-500">
                    <Wallet className="size-6" />
                  </span>
                  <h3 className="text-base font-semibold">
                    Tu próximo portafolio empieza aquí.
                  </h3>
                  <p className="mb-5 mt-2 max-w-xs text-sm leading-6 text-slate-400">
                    Agrega tus acciones y define qué porcentaje quieres invertir
                    en cada una.
                  </p>
                  <Button
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() =>
                      setEditor({
                        rows: [
                          {
                            id: crypto.randomUUID(),
                            symbol: '',
                            name: '',
                            quantity: '0',
                            currentPrice: '',
                            targetPercent: '0',
                          },
                        ],
                        error: null,
                      })
                    }
                  >
                    <Plus /> Agregar mi primera acción
                  </Button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/40 text-[10px] font-medium tracking-[0.02em] text-slate-400">
                          <th scope="col" className="py-3.5 pl-6 font-medium">
                            ACTIVO
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3.5 text-right font-medium"
                          >
                            CANTIDAD
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3.5 text-right font-medium"
                          >
                            PRECIO
                          </th>
                          <th
                            scope="col"
                            className="w-[190px] px-5 py-3.5 font-medium"
                          >
                            <span className="flex items-center gap-3">
                              <span className="flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-blue-500" />{' '}
                                ACTUAL
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-slate-300" />{' '}
                                OBJETIVO
                              </span>
                            </span>
                          </th>
                          <th
                            scope="col"
                            className="py-3.5 pl-4 pr-6 text-right font-medium"
                          >
                            VALOR ACTUAL
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, index) => {
                          const value =
                            Number(row.quantity) * Number(row.currentPrice)
                          const currentPercent =
                            totalValue > 0 ? (value / totalValue) * 100 : 0
                          return (
                            <tr
                              key={row.id}
                              className="border-b border-slate-100/80 last:border-b-0 hover:bg-slate-50/50"
                            >
                              <td className="py-5 pl-6">
                                <div className="flex items-center gap-3">
                                  <span
                                    className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-semibold"
                                    style={{
                                      color:
                                        allocationColors[
                                          index % allocationColors.length
                                        ],
                                      backgroundColor: `${allocationColors[index % allocationColors.length]}12`,
                                    }}
                                  >
                                    {row.symbol.slice(0, 1)}
                                  </span>
                                  <div>
                                    <p className="text-[13px] font-semibold">
                                      {row.symbol}
                                    </p>
                                    <p
                                      className="mt-1 max-w-36 truncate text-[11px] text-slate-400"
                                      title={row.name}
                                    >
                                      {row.name}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-5 text-right text-[13px] tabular-nums">
                                {number.format(Number(row.quantity))}
                              </td>
                              <td className="whitespace-nowrap px-4 py-5 text-right text-[13px] tabular-nums text-slate-500">
                                {dollars.format(Number(row.currentPrice))}
                              </td>
                              <td className="px-5 py-5">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-50">
                                    <div
                                      className="h-full rounded-full bg-blue-500"
                                      style={{
                                        width: `${Math.min(currentPercent, 100)}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="w-11 text-right text-[10px] font-medium tabular-nums text-blue-600">
                                    {percent.format(currentPercent)}%
                                  </span>
                                </div>
                                <div className="mt-2 flex items-center gap-2.5">
                                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className="h-full rounded-full bg-slate-300"
                                      style={{
                                        width: `${Math.min(Number(row.targetPercent), 100)}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="w-11 text-right text-[10px] tabular-nums text-slate-400">
                                    {percent.format(Number(row.targetPercent))}%
                                  </span>
                                </div>
                              </td>
                              <td className="whitespace-nowrap py-5 pl-4 pr-6 text-right text-[13px] font-semibold tabular-nums">
                                {dollars.format(value)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
                    <span className="text-[10px] text-slate-400">
                      Precios ingresados manualmente · Valores en USD
                    </span>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600 transition-colors hover:text-blue-800 disabled:opacity-50"
                      disabled={loading}
                      onClick={() =>
                        setEditor({
                          rows: [
                            ...rows,
                            {
                              id: crypto.randomUUID(),
                              symbol: '',
                              name: '',
                              quantity: '0',
                              currentPrice: '',
                              targetPercent: '0',
                            },
                          ],
                          error: null,
                        })
                      }
                    >
                      <Plus className="size-3.5" /> Agregar acción
                    </button>
                  </div>
                </>
              )}
            </Card>

            <Card className="border-slate-200/80 bg-white shadow-none">
              <CardHeader>
                <CardTitle className="text-[15px] tracking-[-0.2px]">
                  Tu distribución ideal
                </CardTitle>
                <p className="mt-1 text-xs text-slate-400">
                  Así quieres repartir tu inversión.
                </p>
              </CardHeader>
              <CardContent className="pt-7">
                <div
                  className="relative mx-auto mb-6 grid size-40 place-items-center rounded-full"
                  style={{ background: chartBackground }}
                  role="img"
                  aria-label={`Distribución objetivo. Total asignado ${percent.format(targetTotal)} por ciento.`}
                >
                  <div className="flex size-[120px] flex-col items-center justify-center rounded-full bg-white">
                    <span className="text-[27px] font-semibold leading-none tracking-[-1px] tabular-nums">
                      {percent.format(targetTotal)}
                      <span className="text-lg text-slate-400">%</span>
                    </span>
                    <span className="mt-2 text-[10px] text-slate-400">
                      asignado
                    </span>
                  </div>
                </div>
                <div className="space-y-3.5">
                  {positiveTargets.map((row, index) => (
                    <div
                      key={row.id}
                      className="flex items-center gap-2.5 text-xs"
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{
                          backgroundColor:
                            allocationColors[index % allocationColors.length],
                        }}
                      />
                      <span className="font-medium text-slate-600">
                        {row.symbol}
                      </span>
                      <span className="ml-auto font-medium tabular-nums text-slate-500">
                        {percent.format(Number(row.targetPercent))}%
                      </span>
                    </div>
                  ))}
                  {positiveTargets.length === 0 && (
                    <p className="text-center text-xs leading-5 text-slate-400">
                      Agrega porcentajes objetivo para ver tu distribución.
                    </p>
                  )}
                </div>
                {!targetComplete && rows.length > 0 && (
                  <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-700">
                    Ajusta tus objetivos para que sumen el 100% antes de
                    rebalancear.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <section
            className="mt-7"
            aria-labelledby="proposal-title"
            aria-live="polite"
            aria-busy={loading}
          >
            <div className="mb-4 flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-lg bg-blue-100/70 text-blue-600">
                <ArrowRightLeft className="size-3.5" />
              </span>
              <h2
                id="proposal-title"
                className="text-[16px] font-semibold tracking-[-0.3px]"
              >
                Tu próximo movimiento
              </h2>
              <span className="ml-1 rounded-full border border-slate-200 px-2 py-0.5 text-[9px] font-medium text-slate-400">
                PROPUESTA
              </span>
            </div>

            {proposal.status === 'idle' && (
              <div className="flex flex-col items-start gap-5 rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 px-6 py-7 sm:flex-row sm:items-center sm:px-7">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-blue-100 bg-white text-blue-500">
                  <ArrowRightLeft className="size-5" />
                </span>
                <div className="flex-1">
                  <h3 className="text-[14px] font-semibold">
                    Un plan claro para encontrar tu equilibrio.
                  </h3>
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">
                    Calcula qué acciones comprar y vender para llegar a tus
                    objetivos.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="h-9 shrink-0 px-0 text-xs text-blue-600 hover:bg-transparent hover:text-blue-800 sm:px-2"
                  disabled={editor !== null || rows.length === 0}
                  onClick={rebalance}
                >
                  Calcular propuesta <ArrowRight className="size-3.5" />
                </Button>
              </div>
            )}

            {proposal.status === 'loading' && (
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-sm text-slate-500">
                <LoaderCircle className="size-5 animate-spin text-blue-500" />{' '}
                Calculando tu propuesta...
              </div>
            )}

            {proposal.status === 'error' && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-6 py-5"
              >
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-red-500" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">
                    No pudimos calcular la propuesta.
                  </h3>
                  <p className="mt-1.5 text-xs leading-5 text-red-700">
                    {proposal.message}
                  </p>
                </div>
              </div>
            )}

            {proposal.status === 'success' &&
              proposal.result.trades.length === 0 && (
                <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-6 py-7">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-emerald-600">
                    <CheckCheck className="size-6" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-800">
                      Tu portafolio ya está en equilibrio.
                    </h3>
                    <p className="mt-1.5 text-xs leading-5 text-emerald-700">
                      Tus posiciones coinciden con tus objetivos. No necesitas
                      comprar ni vender.
                    </p>
                  </div>
                </div>
              )}

            {proposal.status === 'success' &&
              proposal.result.trades.length > 0 && (
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-none">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-4">
                    <p className="text-[12px] text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {proposal.result.trades.length} operaciones
                      </span>{' '}
                      para alcanzar tu distribución objetivo
                    </p>
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Check className="size-3" /> Sin ejecutar operaciones
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/40 text-[10px] text-slate-400">
                          <th scope="col" className="py-3 pl-6 font-medium">
                            OPERACIÓN
                          </th>
                          <th scope="col" className="px-4 py-3 font-medium">
                            ACTIVO
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-right font-medium"
                          >
                            CANTIDAD
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3 text-right font-medium"
                          >
                            PRECIO
                          </th>
                          <th
                            scope="col"
                            className="py-3 pl-4 pr-6 text-right font-medium"
                          >
                            MONTO ESTIMADO
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposal.result.trades.map((trade) => (
                          <tr
                            key={trade.symbol}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="py-4 pl-6">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium ${trade.side === 'buy' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-700'}`}
                              >
                                {trade.side === 'buy' ? (
                                  <ArrowDownLeft className="size-3" />
                                ) : (
                                  <ArrowUpRight className="size-3" />
                                )}
                                {trade.side === 'buy' ? 'Comprar' : 'Vender'}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-[12px] font-semibold">
                                {trade.symbol}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                {trade.name}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-right text-[12px] tabular-nums">
                              {number.format(trade.quantity)}
                            </td>
                            <td className="px-4 py-4 text-right text-[12px] tabular-nums text-slate-500">
                              {dollars.format(trade.currentPrice)}
                            </td>
                            <td className="py-4 pl-4 pr-6 text-right text-[12px] font-semibold tabular-nums">
                              {dollars.format(trade.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="border-t border-slate-100 px-6 py-3.5 text-[10px] leading-5 text-slate-400">
                    La propuesta usa acciones fraccionadas y los precios
                    ingresados. No incluye comisiones ni impuestos.
                  </p>
                </Card>
              )}
          </section>

          <footer className="mt-8 flex flex-col justify-between gap-3 border-t border-slate-200/70 pt-5 sm:flex-row sm:items-center">
            <p className="text-[10px] leading-5 text-slate-400">
              Una propuesta para que decidas. Tú tienes el control de tus
              inversiones.
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setInput(initialInput)
                setEditor(null)
                setProposal({ status: 'idle' })
              }}
              className="flex w-fit items-center gap-1.5 text-[10px] text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50"
            >
              <RotateCcw className="size-3" /> Restablecer portafolio
            </button>
          </footer>
        </main>
      </div>
    </div>
  )
}
