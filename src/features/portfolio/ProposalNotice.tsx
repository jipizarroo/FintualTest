export function ProposalNotice({ visible }: { visible: boolean }) {
  if (!visible) return null

  return (
    <p role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
      Propuesta calculada.{' '}
      <a href="#proposal-title" className="font-semibold underline underline-offset-2">
        Ver resultado
      </a>
    </p>
  )
}
