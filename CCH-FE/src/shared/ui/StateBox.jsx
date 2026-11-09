import { AlertCircle, AlertTriangle, CheckCircle2, Inbox, Loader2 } from 'lucide-react'

/**
 * Loading / error / empty state helper shared by data-driven pages.
 * Supports both wrapper pattern ({children}) and standalone status tile.
 */
export function StateBox({
  loading,
  error,
  isEmpty,
  empty,
  children,
  loadingLabel,
  text,
  title,
  message,
  icon: Icon,
  tone = 'neutral',
}) {
  const label = loadingLabel || text || 'Memuat…'
  const errorMessage = typeof error === 'string' ? error : text || message || 'Terjadi kesalahan sistem.'
  const emptyTitle = title || (typeof empty === 'string' ? empty : 'Tidak ada data')
  const emptyText = text || message || ''

  if (loading) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-8 text-center text-slate-500 dark:text-slate-400">
        <Loader2 size={28} className="animate-spin text-blue-600 dark:text-blue-400" />
        <span className="text-xs font-semibold">{label}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="m-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/70 p-4 text-xs font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300" role="alert">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
        <div className="space-y-0.5">
          {title && <p className="font-semibold">{title}</p>}
          <p>{errorMessage}</p>
        </div>
      </div>
    )
  }

  // Standalone empty state or isEmpty wrapper prop
  if (isEmpty || (!children && (title || text || message || Icon || tone === 'empty'))) {
    if (isEmpty && empty) return empty
    const EmptyIcon = Icon || (tone === 'error' ? AlertTriangle : Inbox)
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <EmptyIcon size={24} />
        </span>
        <h4 className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{emptyTitle}</h4>
        {emptyText && (
          <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">{emptyText}</p>
        )}
      </div>
    )
  }

  return children ?? null
}
