import { Link } from 'react-router-dom'
import { formatCount } from '../../features/complaints/format.js'
import { cx } from './cx.js'

const TONES = {
  brand: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
  yellow: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400',
}

/** Dashboard statistic tile: label, value, and an optional leading icon. */
export function StatCard({
  label,
  title,
  value,
  icon: Icon,
  tone = 'brand',
  color,
  hint,
  sublabel,
  subtitle,
  caption,
  to,
  onClick,
}) {
  const isRouterLink = typeof to === 'string' && to.startsWith('/')
  const Wrapper = isRouterLink ? Link : to ? 'a' : onClick ? 'button' : 'div'
  const wrapperProps = isRouterLink ? { to } : to ? { href: to } : onClick ? { type: 'button', onClick } : {}
  const displayLabel = label || title || ''
  const displayHint = hint || sublabel || subtitle || caption || null
  const activeTone = TONES[tone] || TONES[color] || TONES.brand

  return (
    <Wrapper
      {...wrapperProps}
      className={cx(
        'group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-left shadow-sm transition-all',
        (to || onClick) && 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer',
      )}
    >
      <div className="min-w-0">
        {displayLabel ? (
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{displayLabel}</p>
        ) : null}
        <h4 className="mt-1 text-3xl font-bold text-slate-800 dark:text-slate-100">{formatCount(value)}</h4>
        {displayHint ? <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{displayHint}</p> : null}
      </div>
      {Icon ? (
        <span
          className={cx(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110',
            activeTone,
          )}
          aria-hidden="true"
        >
          <Icon size={24} strokeWidth={2} />
        </span>
      ) : null}
    </Wrapper>
  )
}
