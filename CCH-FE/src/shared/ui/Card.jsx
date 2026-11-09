import { cx } from './cx.js'

/** Surface container with consistent elevation and radius. */
export function Card({ className, children, ...rest }) {
  return (
    <div className={cx('card', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cx('flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 p-5', className)}>
      <div>
        {title ? <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h2> : null}
        {subtitle ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}