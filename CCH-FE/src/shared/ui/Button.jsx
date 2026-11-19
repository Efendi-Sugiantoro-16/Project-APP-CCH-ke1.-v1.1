import { cx } from './cx.js'

const VARIANTS = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  ghost: 'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50',
}

/**
 * Shared button primitive. Renders an anchor when `href` is provided and a
 * native button otherwise, keeping styling consistent for both.
 */
export function Button({ href, variant = 'primary', size, className, children, ...rest }) {
  const classes = cx(VARIANTS[variant] || VARIANTS.primary, size === 'sm' && 'btn-sm', className)

  if (href) {
    return (
      <a className={classes} href={href} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  )
}