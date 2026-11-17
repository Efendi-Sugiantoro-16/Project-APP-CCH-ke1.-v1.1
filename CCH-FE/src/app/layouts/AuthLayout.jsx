import { Outlet } from 'react-router-dom'
import { ThemeToggle } from '../../shared/theme/ThemeToggle.jsx'

/**
 * AuthLayout - Standalone layout for authentication pages
 * Clean full-screen experience with quick theme toggle
 */
export function AuthLayout() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <Outlet />
    </div>
  )
}
