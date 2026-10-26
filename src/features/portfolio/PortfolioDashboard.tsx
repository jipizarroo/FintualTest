import { useEffect, useState, type FormEvent } from 'react'
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
  RefreshCw,
  SlidersHorizontal,
  Wallet,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import type { MarketQuote, MarketQuotesResult } from '@/domain/market'
import {
  summarizeLots,
  type PortfolioInput,
  type PurchaseLot,
  type RebalanceResult,
} from '@/domain/portfolio'
import { PurchaseEditor, type PortfolioEditorRow } from './PurchaseEditor'
import { ProposalNotice } from './ProposalNotice'
import {
  clearPortfolioStorage,
  loadPortfolioStorage,
  savePortfolioStorage,
} from './storage'

type PortfolioDashboardProps = {
  initialInput: PortfolioInput
  onRebalance: (input: PortfolioInput) => Promise<RebalanceResult>
  onRefreshPrices: (symbols: string[]) => Promise<MarketQuotesResult>
}

type PortfolioRow = {
  id: string
  symbol: string
  name: string
  quantity: number
  currentPrice: number
  targetPercent: number
  averagePurchasePrice: number | null
  lots: PurchaseLot[]
}

type ProposalState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: RebalanceResult }
  | { status: 'error'; message: string }

type PortfolioStorageState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string }

type PriceRefreshState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'complete'
      updatedSymbols: string[]
      errors: MarketQuotesResult['errors']
    }
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

function rowsFromInput(input: PortfolioInput): PortfolioRow[] {
  const symbols = new Set([
    ...input.positions.map((position) => position.symbol),
    ...input.allocations.map((allocation) => allocation.symbol),
  ])

  return [...symbols].map((symbol, index) => {
    const position = input.positions.find((item) => item.symbol === symbol)
    const quote = input.quotes.find((item) => item.symbol === symbol)
    const allocation = input.allocations.find((item) => item.symbol === symbol)

    const lots = position?.lots ?? []
    const summary = summarizeLots(lots)

    return {
      id: `${symbol}-${index}`,
      symbol,
      name: position?.name ?? quote?.name ?? symbol,
      quantity: summary.quantity,
      currentPrice: position?.currentPrice ?? quote?.currentPrice ?? 0,
      targetPercent: allocation?.targetPercent ?? 0,
      averagePurchasePrice: summary.averagePurchasePrice,
      lots,
    }
  })
}

function emptyEditorRow(): PortfolioEditorRow {
  return {
    id: crypto.randomUUID(),
    symbol: '',
    name: '',
    currentPrice: '',
    targetPercent: '0',
    lots: [],
  }
}

function quoteTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const formatted = new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
  return `${formatted} (hora local)`
}

export function PortfolioDashboard({
  initialInput,
  onRebalance,
  onRefreshPrices,
}: PortfolioDashboardProps) {
  const [input, setInput] = useState(initialInput)
  const [storageState, setStorageState] = useState<PortfolioStorageState>({
    status: 'loading',
  })
  const [editor, setEditor] = useState<{
    rows: PortfolioEditorRow[]
    error: string | null
  } | null>(null)
  const [proposal, setProposal] = useState<ProposalState>({ status: 'idle' })
  const [priceRefresh, setPriceRefresh] = useState<PriceRefreshState>({
    status: 'idle',
  })
  const [priceMetadata, setPriceMetadata] = useState<
    Record<string, Pick<MarketQuote, 'source' | 'asOf'>>
  >({})

  useEffect(() => {
    const saved = loadPortfolioStorage()
    if (saved.status === 'saved') setInput(saved.input)
    setStorageState(
      saved.status === 'error'
        ? {
            status: 'error',
            message:
              'No se pudo recuperar el portafolio. Se muestra el ejemplo sin reemplazar la copia guardada.',
          }
        : { status: 'ready' },
    )
  }, [])

  const storageReady = storageState.status !== 'loading'
  const rows = rowsFromInput(input)
  const totalValue = input.positions.reduce(
    (sum, position) =>
      sum + summarizeLots(position.lots).quantity * position.currentPrice,
    0,
  )
  const targetTotal = input.allocations.reduce(
    (sum, allocation) => sum + allocation.targetPercent,
    0,
  )
  const targetComplete = Math.abs(targetTotal - 100) <= 1e-8
  const loading = proposal.status === 'loading'
  const refreshingPrices = priceRefresh.status === 'loading'
  const positiveTargets = rows.filter((row) => row.targetPercent > 0)
  let segmentStart = 0
  const chartSegments = positiveTargets.map((row, index) => {
    const start = segmentStart
    segmentStart += row.targetPercent
    return `${allocationColors[index % allocationColors.length]} ${start}% ${segmentStart}%`
  })
  const chartBackground = targetComplete
    ? `conic-gradient(${chartSegments.join(', ')})`
    : 'var(--muted)'

  function startEditing(addStock = false) {
    if (!storageReady || refreshingPrices) return
    const editableRows: PortfolioEditorRow[] = rows.map((row) => ({
      id: row.id,
      symbol: row.symbol,
      name: row.name,
      currentPrice: String(row.currentPrice),
      targetPercent: String(row.targetPercent),
      lots: row.lots.map((lot) => ({
        id: crypto.randomUUID(),
        quantity: String(lot.quantity),
        purchasePrice: lot.purchasePrice === null ? '' : String(lot.purchasePrice),
      })),
    }))
    if (addStock || editableRows.length === 0) editableRows.push(emptyEditorRow())
    setEditor({ rows: editableRows, error: null })
  }

  function updateEditorRow(updatedRow: PortfolioEditorRow) {
    setEditor((current) =>
      current && {
        rows: current.rows.map((row) =>
          row.id === updatedRow.id ? updatedRow : row,
        ),
        error: null,
      },
    )
  }

  function removeEditorRow(id: string) {
    setEditor((current) =>
      current && {
        rows: current.rows.filter((row) => row.id !== id),
        error: null,
      },
    )
  }

  function savePortfolio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editor || !storageReady) return

    const updatedRows = editor.rows.map((row) => ({
      symbol: row.symbol.trim().toUpperCase(),
      name: row.name.trim(),
      currentPrice: Number(row.currentPrice),
      targetPercent: Number(row.targetPercent),
      lots: row.lots.map((lot) => ({
        quantity: Number(lot.quantity),
        purchasePrice: lot.purchasePrice.trim()
          ? Number(lot.purchasePrice)
          : null,
      })),
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
          !Number.isFinite(row.currentPrice) ||
          row.currentPrice <= 0 ||
          !Number.isFinite(row.targetPercent) ||
          row.targetPercent < 0 ||
          row.targetPercent > 100 ||
          row.lots.some(
            (lot) =>
              !Number.isFinite(lot.quantity) ||
              lot.quantity < 0 ||
              (lot.purchasePrice !== null &&
                (!Number.isFinite(lot.purchasePrice) || lot.purchasePrice <= 0)) ||
              (lot.quantity === 0 && lot.purchasePrice !== null),
          ),
      )
    ) {
      setEditor({
        ...editor,
        error:
          'Usa precios actuales mayores que 0, cantidades de compra desde 0 y objetivos entre 0% y 100%. Cada compra con cantidad mayor que 0 necesita un precio pagado válido o costo pendiente.',
      })
      return
    }

    const rowsWithPurchases = updatedRows.map((row) => ({
      ...row,
      lots: row.lots.filter((lot) => lot.quantity > 0),
    }))
    const hasLotOverflow = rowsWithPurchases.some((row) => {
      try {
        summarizeLots(row.lots)
        return false
      } catch {
        return true
      }
    })
    if (hasLotOverflow) {
      setEditor({
        ...editor,
        error: 'La cantidad total de una acción excede el límite permitido.',
      })
      return
    }

    const updatedInput: PortfolioInput = {
      positions: rowsWithPurchases
        .filter((row) => summarizeLots(row.lots).quantity > 0)
        .map(({ symbol, name, currentPrice, lots }) => ({
          symbol,
          name,
          currentPrice,
          lots,
        })),
      allocations: rowsWithPurchases.map(({ symbol, targetPercent }) => ({
        symbol,
        targetPercent,
      })),
      quotes: rowsWithPurchases
        .filter((row) => summarizeLots(row.lots).quantity === 0)
        .map(({ symbol, name, currentPrice }) => ({
          symbol,
          name,
          currentPrice,
        })),
    }

    setInput(updatedInput)
    setPriceMetadata({})
    setPriceRefresh({ status: 'idle' })
    setStorageState(
      savePortfolioStorage(updatedInput)
        ? { status: 'ready' }
        : {
            status: 'error',
            message:
              'No se pudieron guardar los cambios. Podrían perderse al recargar.',
          },
    )
    setProposal({ status: 'idle' })
    setEditor(null)
  }

  async function rebalance() {
    if (refreshingPrices || editor !== null) return
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

  async function refreshPrices() {
    if (!storageReady || refreshingPrices || loading || editor !== null) return
    const symbols = [
      ...new Set(
        [...input.positions, ...input.quotes].map((entry) => entry.symbol),
      ),
    ]
    if (symbols.length === 0) {
      setPriceRefresh({
        status: 'error',
        message: 'Agrega acciones antes de actualizar precios.',
      })
      return
    }

    setPriceRefresh({ status: 'loading' })
    try {
      const result = await onRefreshPrices(symbols)
      const requestedSymbols = new Set(
        symbols.map((symbol) => symbol.toUpperCase()),
      )
      const quotes = result.quotes.filter((quote) =>
        requestedSymbols.has(quote.symbol.toUpperCase()),
      )
      const quoteBySymbol = new Map(
        quotes.map((quote) => [quote.symbol.toUpperCase(), quote]),
      )
      const updatedInput: PortfolioInput = {
        ...input,
        positions: input.positions.map((position) => {
          const quote = quoteBySymbol.get(position.symbol.toUpperCase())
          return quote ? { ...position, currentPrice: quote.price } : position
        }),
        quotes: input.quotes.map((entry) => {
          const quote = quoteBySymbol.get(entry.symbol.toUpperCase())
          return quote ? { ...entry, currentPrice: quote.price } : entry
        }),
      }

      if (quotes.length > 0) {
        setInput(updatedInput)
        if (storageState.status === 'ready') {
          const saved = savePortfolioStorage(updatedInput)
          setStorageState(
            saved
              ? { status: 'ready' }
              : {
                  status: 'error',
                  message:
                    'Los precios se actualizaron en pantalla, pero no se pudieron guardar para la próxima visita.',
                },
          )
        }
        setPriceMetadata((current) => ({
          ...current,
          ...Object.fromEntries(
            quotes.map((quote) => [
              quote.symbol.toUpperCase(),
              { source: quote.source, asOf: quote.asOf },
            ]),
          ),
        }))
        setProposal({ status: 'idle' })
      }

      setPriceRefresh({
        status: 'complete',
        updatedSymbols: quotes.map((quote) => quote.symbol.toUpperCase()),
        errors: result.errors,
      })
    } catch (error) {
      setPriceRefresh({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudieron actualizar los precios. Intenta de nuevo.',
      })
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-border bg-card px-5 py-8 xl:flex">
        <a
          href="#"
          className="flex w-fit cursor-pointer items-center gap-2.5 rounded-md px-3 text-[27px] font-semibold tracking-[-1.4px] transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:hover:text-blue-300"
          aria-label="Balance, inicio"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white">
            <ArrowRightLeft className="size-5" strokeWidth={2.5} />
          </span>
          balance<span className="-ml-2 text-blue-600 dark:text-blue-300">.</span>
        </a>
        <p className="mb-3 mt-14 px-3 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground">
          MI ESPACIO
        </p>
        <a
          href="#portfolio"
          className="flex cursor-pointer items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/60"
          aria-current="page"
        >
          <LayoutDashboard className="size-[18px]" /> Mi portafolio
          <ChevronRight className="ml-auto size-4" />
        </a>
        <div className="mt-auto rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 dark:border-blue-900 dark:from-blue-950/40 dark:to-slate-900">
          <span className="mb-3 grid size-8 place-items-center rounded-lg bg-card text-blue-600 shadow-sm dark:text-blue-300">
            <ChartPie className="size-[18px]" />
          </span>
          <p className="text-sm font-semibold">Invierte con intención.</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Define tus objetivos y dale a cada inversión su lugar.
          </p>
        </div>
        <p className="mt-6 px-3 text-[11px] text-muted-foreground">
          Balance · Simulador de inversiones
        </p>
      </aside>

      <div className="xl:pl-56">
        <header className="flex h-[76px] items-center justify-between border-b border-border bg-card/85 px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3 text-sm">
            <span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-white xl:hidden">
              <ArrowRightLeft className="size-4" />
            </span>
            <span className="hidden text-muted-foreground sm:inline">Mi espacio</span>
            <ChevronRight className="hidden size-3.5 text-muted-foreground sm:block" />
            <span className="font-medium">Mi portafolio</span>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 px-2 text-[11px] sm:px-3 sm:text-xs"
              aria-busy={refreshingPrices}
              disabled={
                !storageReady ||
                loading ||
                refreshingPrices ||
                editor !== null ||
                rows.length === 0
              }
              onClick={refreshPrices}
            >
              <RefreshCw
                className={refreshingPrices ? 'animate-spin' : undefined}
              />
              {refreshingPrices ? (
                'Actualizando...'
              ) : (
                <>
                  <span className="sm:hidden">Actualizar</span>
                  <span className="hidden sm:inline">Actualizar precios</span>
                </>
              )}
            </Button>
            <ThemeToggle />
            <span className="hidden items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground sm:flex">
              <span className="size-1.5 rounded-full bg-blue-500" /> Simulador
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-5 pb-8 pt-8 sm:px-8 lg:px-10 lg:pt-10">
          <ProposalNotice visible={proposal.status === 'success'} />
          {storageState.status === 'error' && (
            <p
              role="status"
              className="mb-5 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
            >
              {storageState.message}
            </p>
          )}
          {priceRefresh.status === 'complete' && (
            <div
              role="status"
              className={`mb-5 rounded-lg border px-4 py-3 text-sm ${priceRefresh.errors.length > 0 ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200' : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200'}`}
            >
              <p>
                {priceRefresh.updatedSymbols.length > 0
                  ? `Se actualizaron ${priceRefresh.updatedSymbols.length} precios. La fuente y hora de referencia aparecen junto a cada cotización.`
                  : 'No se recibieron cotizaciones nuevas.'}
              </p>
              {priceRefresh.errors.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-xs">
                  {priceRefresh.errors.map((error) => (
                    <li key={error.symbol}>
                      {error.symbol}: {error.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {priceRefresh.status === 'error' && (
            <p
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
            >
              {priceRefresh.message}
            </p>
          )}
          <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-blue-600 dark:text-blue-300">
                CLARIDAD PARA TUS INVERSIONES
              </p>
              <h1 className="text-[30px] font-semibold tracking-[-1.1px] sm:text-[34px]">
                Tu portafolio, en equilibrio.
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Revisa dónde estás y decide cómo quieres invertir.
              </p>
            </div>
            <Button
              className="h-11 self-start rounded-xl bg-blue-600 px-5 text-white shadow-sm shadow-blue-200 hover:bg-blue-700 sm:self-auto"
              disabled={
                !storageReady ||
                loading ||
                refreshingPrices ||
                editor !== null ||
                rows.length === 0
              }
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
            <Card className="border-border bg-card shadow-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                  Acciones en tu portafolio
                  <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <LayoutDashboard className="size-4" />
                  </span>
                </div>
                <p className="mb-2 mt-2 text-[32px] font-semibold leading-none tracking-[-1px] tabular-nums">
                  {input.positions.length.toString().padStart(2, '0')}
                </p>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {positiveTargets.length} con asignación objetivo
                </p>
              </CardContent>
            </Card>
            <Card className="border-border bg-card shadow-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                  Asignación objetivo
                  <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <ChartPie className="size-4" />
                  </span>
                </div>
                <div className="mb-2 mt-2 flex items-end gap-2">
                  <p className="text-[32px] font-semibold leading-none tracking-[-1px] tabular-nums">
                    {percent.format(targetTotal)}
                    <span className="ml-0.5 text-xl text-muted-foreground">%</span>
                  </p>
                  {targetComplete && (
                    <span className="mb-0.5 flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-300">
                      <Check className="size-3" /> Completa
                    </span>
                  )}
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
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
              className="min-w-0 scroll-mt-6 border-border bg-card shadow-none"
            >
              <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border pb-5">
                <div>
                  <CardTitle className="text-[16px] tracking-[-0.3px]">
                    Tu portafolio
                  </CardTitle>
                  <p className="mt-2 text-xs text-muted-foreground">
                    El precio actual calcula la valuación. El costo promedio
                    usa los precios pagados en cada compra.
                  </p>
                </div>
                {!editor && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-border bg-card text-xs text-muted-foreground hover:bg-muted"
                    disabled={loading || refreshingPrices || !storageReady}
                    onClick={() => startEditing()}
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
                    className="text-muted-foreground"
                    onClick={() => setEditor(null)}
                  >
                    <X />
                  </Button>
                )}
              </CardHeader>

              {editor ? (
                <form onSubmit={savePortfolio} className="p-5 sm:p-6">
                  <p className="mb-5 rounded-lg bg-blue-50 dark:bg-blue-950/40 px-3 py-2.5 text-xs leading-5 text-blue-700 dark:text-blue-200">
                    El precio actual determina la valuación y la propuesta. Agrega
                    cada compra por separado para calcular el costo promedio.
                  </p>
                  <div className="space-y-4">
                    {editor.rows.map((row, index) => (
                      <PurchaseEditor
                        key={row.id}
                        row={row}
                        index={index}
                        onChange={updateEditorRow}
                        onRemove={() => removeEditorRow(row.id)}
                      />
                    ))}
                  </div>
                  {editor.error && (
                    <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-300">
                      {editor.error}
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-dashed text-xs"
                      onClick={() =>
                        setEditor({
                          rows: [...editor.rows, emptyEditorRow()],
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
                        className="text-xs text-muted-foreground"
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
                  <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-300">
                    <Wallet className="size-6" />
                  </span>
                  <h3 className="text-base font-semibold">
                    Tu próximo portafolio empieza aquí.
                  </h3>
                  <p className="mb-5 mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                    Agrega tus acciones y define qué porcentaje quieres invertir
                    en cada una.
                  </p>
                  <Button
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    disabled={!storageReady}
                    onClick={() =>
                      startEditing()
                    }
                  >
                    <Plus /> Agregar mi primera acción
                  </Button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] text-left">
                      <thead>
                        <tr className="border-b border-border bg-muted/60 text-[10px] font-medium tracking-[0.02em] text-muted-foreground">
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
                            PRECIO ACTUAL
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3.5 text-right font-medium"
                          >
                            COSTO PROMEDIO
                          </th>
                          <th
                            scope="col"
                            className="w-[160px] px-5 py-3.5 font-medium"
                          >
                            <span className="flex items-center gap-3">
                              <span className="flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-blue-500" />{' '}
                                ACTUAL
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-muted-foreground/40" />{' '}
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
                            row.quantity * row.currentPrice
                          const currentPercent =
                            totalValue > 0 ? (value / totalValue) * 100 : 0
                          const quoteMetadata =
                            priceMetadata[row.symbol.toUpperCase()]
                          return (
                            <tr
                              key={row.id}
                              className="border-b border-border last:border-b-0 hover:bg-muted/50"
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
                                      className="mt-1 max-w-36 truncate text-[11px] text-muted-foreground"
                                      title={row.name}
                                    >
                                      {row.name}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-5 text-right text-[13px] tabular-nums">
                                {number.format(row.quantity)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-5 text-right text-[13px] tabular-nums text-muted-foreground">
                                <>
                                  {dollars.format(row.currentPrice)}
                                  {quoteMetadata && (
                                    <span className="mt-1 block text-[9px] text-muted-foreground">
                                      {quoteMetadata.source} ·{' '}
                                      {quoteTime(quoteMetadata.asOf)}
                                    </span>
                                  )}
                                </>
                              </td>
                              <td className="whitespace-nowrap px-4 py-5 text-right text-[13px] tabular-nums text-muted-foreground">
                                {row.quantity === 0 ? (
                                  '—'
                                ) : row.averagePurchasePrice === null ? (
                                  <span title="Falta el precio pagado de una o más compras">
                                    Pendiente
                                  </span>
                                ) : (
                                  dollars.format(row.averagePurchasePrice)
                                )}
                              </td>
                              <td className="px-5 py-5">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-50 dark:bg-blue-950/40">
                                    <div
                                      className="h-full rounded-full bg-blue-500"
                                      style={{
                                        width: `${Math.min(currentPercent, 100)}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="w-11 text-right text-[10px] font-medium tabular-nums text-blue-600 dark:text-blue-300">
                                    {percent.format(currentPercent)}%
                                  </span>
                                </div>
                                <div className="mt-2 flex items-center gap-2.5">
                                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full rounded-full bg-muted-foreground/40"
                                      style={{
                                        width: `${Math.min(row.targetPercent, 100)}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="w-11 text-right text-[10px] tabular-nums text-muted-foreground">
                                    {percent.format(row.targetPercent)}%
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
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
                    <span className="text-[10px] text-muted-foreground">
                      {Object.keys(priceMetadata).length === 0
                        ? 'Precios guardados o de ejemplo · USD'
                        : 'Las cotizaciones muestran su fuente y hora · USD'}
                    </span>
                    <button
                      type="button"
                      className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-blue-600 transition-colors hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-blue-300 dark:hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={loading || refreshingPrices || !storageReady}
                      onClick={() => startEditing(true)}
                    >
                      <Plus className="size-3.5" /> Agregar acción
                    </button>
                  </div>
                </>
              )}
            </Card>

            <Card className="border-border bg-card shadow-none">
              <CardHeader>
                <CardTitle className="text-[15px] tracking-[-0.2px]">
                  Tu distribución ideal
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
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
                  <div className="flex size-[120px] flex-col items-center justify-center rounded-full bg-card">
                    <span className="text-[27px] font-semibold leading-none tracking-[-1px] tabular-nums">
                      {percent.format(targetTotal)}
                      <span className="text-lg text-muted-foreground">%</span>
                    </span>
                    <span className="mt-2 text-[10px] text-muted-foreground">
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
                      <span className="font-medium text-muted-foreground">
                        {row.symbol}
                      </span>
                      <span className="ml-auto font-medium tabular-nums text-muted-foreground">
                        {percent.format(row.targetPercent)}%
                      </span>
                    </div>
                  ))}
                  {positiveTargets.length === 0 && (
                    <p className="text-center text-xs leading-5 text-muted-foreground">
                      Agrega porcentajes objetivo para ver tu distribución.
                    </p>
                  )}
                </div>
                {!targetComplete && rows.length > 0 && (
                  <p className="mt-5 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-3 py-2.5 text-[11px] leading-5 text-amber-700 dark:text-amber-200">
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
              <span className="grid size-7 place-items-center rounded-lg bg-blue-100/70 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                <ArrowRightLeft className="size-3.5" />
              </span>
              <h2
                id="proposal-title"
                className="text-[16px] font-semibold tracking-[-0.3px]"
              >
                Tu próximo movimiento
              </h2>
              <span className="ml-1 rounded-full border border-border px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                PROPUESTA
              </span>
            </div>

            {proposal.status === 'idle' && (
              <div className="flex flex-col items-start gap-5 rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 px-6 py-7 sm:flex-row sm:items-center sm:px-7 dark:border-blue-900 dark:bg-blue-950/30">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-blue-100 bg-card text-blue-500 dark:border-blue-900 dark:text-blue-300">
                  <ArrowRightLeft className="size-5" />
                </span>
                <div className="flex-1">
                  <h3 className="text-[14px] font-semibold">
                    Un plan claro para encontrar tu equilibrio.
                  </h3>
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    Calcula qué acciones comprar y vender para llegar a tus
                    objetivos.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="h-9 shrink-0 px-0 text-xs text-blue-600 hover:bg-transparent hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200 sm:px-2"
                  disabled={editor !== null || rows.length === 0}
                  onClick={rebalance}
                >
                  Calcular propuesta <ArrowRight className="size-3.5" />
                </Button>
              </div>
            )}

            {proposal.status === 'loading' && (
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-card px-6 py-12 text-sm text-muted-foreground">
                <LoaderCircle className="size-5 animate-spin text-blue-500 dark:text-blue-300" />{' '}
                Calculando tu propuesta...
              </div>
            )}

            {proposal.status === 'error' && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-6 py-5"
              >
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-red-500 dark:text-red-300" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
                    No pudimos calcular la propuesta.
                  </h3>
                  <p className="mt-1.5 text-xs leading-5 text-red-700 dark:text-red-200">
                    {proposal.message}
                  </p>
                </div>
              </div>
            )}

            {proposal.status === 'success' &&
              proposal.result.trades.length === 0 && (
                <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-6 py-7 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-card text-emerald-600 dark:text-emerald-300">
                    <CheckCheck className="size-6" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                      Tu portafolio ya está en equilibrio.
                    </h3>
                    <p className="mt-1.5 text-xs leading-5 text-emerald-700 dark:text-emerald-200">
                      Tus posiciones coinciden con tus objetivos. No necesitas
                      comprar ni vender.
                    </p>
                  </div>
                </div>
              )}

            {proposal.status === 'success' &&
              proposal.result.trades.length > 0 && (
                <Card className="overflow-hidden border-border bg-card shadow-none">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-4">
                    <p className="text-[12px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {proposal.result.trades.length} operaciones
                      </span>{' '}
                      para alcanzar tu distribución objetivo
                    </p>
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Check className="size-3" /> Sin ejecutar operaciones
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-left">
                      <thead>
                        <tr className="border-b border-border bg-muted/60 text-[10px] text-muted-foreground">
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
                            className="border-b border-border last:border-0"
                          >
                            <td className="py-4 pl-6">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium ${trade.side === 'buy' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'}`}
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
                              <p className="mt-1 text-[10px] text-muted-foreground">
                                {trade.name}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-right text-[12px] tabular-nums">
                              {number.format(trade.quantity)}
                            </td>
                            <td className="px-4 py-4 text-right text-[12px] tabular-nums text-muted-foreground">
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
                  <p className="border-t border-border px-6 py-3.5 text-[10px] leading-5 text-muted-foreground">
                    La propuesta usa acciones fraccionadas y los precios
                    ingresados. No incluye comisiones ni impuestos.
                  </p>
                </Card>
              )}
          </section>

          <footer className="mt-8 flex flex-col justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
            <p className="text-[10px] leading-5 text-muted-foreground">
              Una propuesta para que decidas. Tú tienes el control de tus
              inversiones.
            </p>
            <button
              type="button"
              disabled={loading || refreshingPrices || !storageReady}
              onClick={() => {
                if (!storageReady || refreshingPrices) return
                const cleared = clearPortfolioStorage()
                setInput(initialInput)
                setPriceMetadata({})
                setPriceRefresh({ status: 'idle' })
                setEditor(null)
                setProposal({ status: 'idle' })
                setStorageState(
                  cleared
                    ? { status: 'ready' }
                    : {
                        status: 'error',
                        message:
                          'Se muestra el ejemplo, pero no se pudo borrar el portafolio guardado y podría volver al recargar.',
                      },
                )
              }}
              className="flex w-fit cursor-pointer items-center gap-1.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="size-3" /> Restablecer portafolio
            </button>
          </footer>
        </main>
      </div>
    </div>
  )
}
