import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type PurchaseDraft = {
  id: string
  quantity: string
  purchasePrice: string
}

export type PortfolioEditorRow = {
  id: string
  symbol: string
  name: string
  currentPrice: string
  targetPercent: string
  lots: PurchaseDraft[]
}

type PurchaseEditorProps = {
  row: PortfolioEditorRow
  index: number
  onChange: (row: PortfolioEditorRow) => void
  onRemove: () => void
}

export function PurchaseEditor({
  row,
  index,
  onChange,
  onRemove,
}: PurchaseEditorProps) {
  function update(field: 'symbol' | 'name' | 'currentPrice' | 'targetPercent', value: string) {
    onChange({ ...row, [field]: value })
  }

  function updateLot(id: string, field: 'quantity' | 'purchasePrice', value: string) {
    onChange({
      ...row,
      lots: row.lots.map((lot) =>
        lot.id === id ? { ...lot, [field]: value } : lot,
      ),
    })
  }

  return (
    <section className="rounded-xl border border-border p-4">
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1.5fr_1fr_1fr_auto]">
        <label className="block text-[11px] font-medium text-muted-foreground">
          Ticker
          <Input
            required
            aria-label={`Ticker de la acción ${index + 1}`}
            className="mt-1.5 uppercase"
            value={row.symbol}
            placeholder="AAPL"
            onChange={(event) => update('symbol', event.target.value)}
          />
        </label>
        <label className="block text-[11px] font-medium text-muted-foreground">
          Nombre
          <Input
            required
            aria-label={`Nombre de la acción ${index + 1}`}
            className="mt-1.5"
            value={row.name}
            placeholder="Apple Inc."
            onChange={(event) => update('name', event.target.value)}
          />
        </label>
        <label className="block text-[11px] font-medium text-muted-foreground">
          Precio actual USD
          <Input
            required
            type="number"
            min="0.01"
            step="any"
            aria-label={`Precio actual de ${row.symbol || `la acción ${index + 1}`}`}
            className="mt-1.5"
            value={row.currentPrice}
            onChange={(event) => update('currentPrice', event.target.value)}
          />
        </label>
        <label className="block text-[11px] font-medium text-muted-foreground">
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
            onChange={(event) => update('targetPercent', event.target.value)}
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="justify-self-end text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
          aria-label={`Quitar ${row.symbol || `acción ${index + 1}`}`}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <fieldset className="mt-4 border-t border-border pt-4">
        <legend className="px-1 text-[11px] font-semibold text-foreground">
          Compras
        </legend>
        <p className="mb-3 text-[11px] leading-5 text-muted-foreground">
          El precio actual determina la valuación y la propuesta. El precio pagado registra tu costo de compra.
        </p>
        {row.lots.length > 0 ? (
          <div className="space-y-2">
            {row.lots.map((lot, lotIndex) => (
              <div
                key={lot.id}
                className="grid grid-cols-1 items-end gap-3 rounded-lg bg-muted/60 p-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <label className="block text-[11px] font-medium text-muted-foreground">
                  Cantidad de compra
                  <Input
                    required
                    type="number"
                    min="0"
                    step="any"
                    aria-label={`Cantidad de la compra ${lotIndex + 1} de ${row.symbol || `la acción ${index + 1}`}`}
                    className="mt-1.5 bg-card"
                    value={lot.quantity}
                    onChange={(event) => updateLot(lot.id, 'quantity', event.target.value)}
                  />
                </label>
                <label className="block text-[11px] font-medium text-muted-foreground">
                  Precio pagado USD
                  <Input
                    type="number"
                    min="0.01"
                    step="any"
                    aria-label={`Precio pagado de la compra ${lotIndex + 1} de ${row.symbol || `la acción ${index + 1}`}`}
                    className="mt-1.5 bg-card"
                    value={lot.purchasePrice}
                    placeholder="Costo pendiente"
                    onChange={(event) => updateLot(lot.id, 'purchasePrice', event.target.value)}
                  />
                  {lot.purchasePrice === '' && (
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      Costo pendiente
                    </span>
                  )}
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="justify-self-end text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  aria-label={`Quitar compra ${lotIndex + 1} de ${row.symbol || `la acción ${index + 1}`}`}
                  onClick={() =>
                    onChange({
                      ...row,
                      lots: row.lots.filter((item) => item.id !== lot.id),
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-3 text-[11px] text-muted-foreground">
            Sin compras registradas.
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 border-dashed text-xs"
          onClick={() =>
            onChange({
              ...row,
              lots: [
                ...row.lots,
                { id: crypto.randomUUID(), quantity: '', purchasePrice: '' },
              ],
            })
          }
        >
          <Plus className="size-3.5" /> Agregar compra
        </Button>
      </fieldset>
    </section>
  )
}
