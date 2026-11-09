import { AlertCircle } from 'lucide-react'

/** Full-width error state for the detail page. */
export function DetailError({ message }) {
  return (
    <div className="alert alert-error" role="alert">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span>{message || 'Tiket tidak ditemukan atau tidak dapat diakses.'}</span>
    </div>
  )
}

/** Full-width loading skeleton for the detail page. */
export function DetailLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-72 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
        <div className="space-y-6">
          <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    </div>
  )
}