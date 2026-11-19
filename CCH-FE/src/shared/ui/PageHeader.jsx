import { Link } from 'react-router-dom'

/** Consistent page title block with an optional back link and trailing actions. */
export function PageHeader({ eyebrow, title, subtitle, backTo, backLabel, actions }) {
  return (
    <div className="mb-6">
      {backTo ? (
        <Link to={backTo} className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 transition hover:text-blue-600 dark:hover:text-blue-400">
          ← {backLabel || 'Kembali'}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">{eyebrow}</p>
          ) : null}
          <h1 className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}