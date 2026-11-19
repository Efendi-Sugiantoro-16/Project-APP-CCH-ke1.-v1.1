import { Laptop, Moon, Sun } from 'lucide-react'
import { useTheme } from './useTheme.js'

/**
 * Responsive theme switcher supporting Light / Dark / System modes.
 * Mobile: Single compact icon button that cycles through themes.
 * Tablet: Segmented icon-only pill.
 * Desktop (xl+): Segmented pill with icons and text labels.
 */
export function ThemeToggle({ className = '', compact = false }) {
  const { theme, setTheme } = useTheme()

  const options = [
    {
      id: 'light',
      label: 'Terang',
      icon: Sun,
      title: 'Mode Terang (Light Mode)',
      activeColor: 'text-amber-500 dark:text-amber-400',
    },
    {
      id: 'dark',
      label: 'Gelap',
      icon: Moon,
      title: 'Mode Gelap (Dark Mode)',
      activeColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      id: 'system',
      label: 'Sistem',
      icon: Laptop,
      title: 'Ikuti Tema Sistem (System OS)',
      activeColor: 'text-blue-600 dark:text-blue-400',
    },
  ]

  const handleCycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const activeOption = options.find((o) => o.id === theme) || options[0]
  const ActiveIcon = activeOption.icon

  return (
    <div className={`inline-flex items-center ${className}`}>
      {/* Mobile single-button toggle (< 640px) */}
      <button
        type="button"
        onClick={handleCycleTheme}
        className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer shadow-xs"
        aria-label={`Ubah tema (saat ini: ${activeOption.label})`}
        title={`Tema: ${activeOption.label} (Klik untuk berganti)`}
      >
        <ActiveIcon className={`h-4 w-4 ${activeOption.activeColor}`} />
      </button>

      {/* Tablet & Desktop segmented control (>= 640px) */}
      <div
        role="radiogroup"
        aria-label="Pilih tema tampilan"
        className="hidden sm:inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/90 p-1 text-xs font-medium dark:border-slate-800 dark:bg-slate-900/90 shadow-xs transition-colors"
      >
        {options.map((opt) => {
          const Icon = opt.icon
          const isActive = theme === opt.id

          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setTheme(opt.id)}
              className={`flex items-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 transition-all duration-150 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                isActive
                  ? `bg-white dark:bg-slate-800 shadow-xs font-semibold ${opt.activeColor}`
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title={opt.title}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {!compact && <span className="hidden xl:inline">{opt.label}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
