import { useContext } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  CalendarCheck,
  Headset,
  LayoutDashboard,
  LogOut,
  MessageSquarePlus,
  ScanSearch,
  ShieldCheck,
} from 'lucide-react'
import { AuthContext } from '../../features/auth/auth-context.js'
import { ThemeToggle } from '../../shared/theme/ThemeToggle.jsx'

const navLinkClass = ({ isActive }) => `app-nav-link${isActive ? ' is-active' : ''}`

function WorkspaceNav() {
  const { isAuthenticated } = useContext(AuthContext)

  if (!isAuthenticated) {
    return (
      <NavLink to="/login" className={navLinkClass}>
        <ShieldCheck size={16} />
        Sesi staf
      </NavLink>
    )
  }

  return (
    <>
      <NavLink to="/workspace" end className={navLinkClass}>
        <LayoutDashboard size={16} />
        Dasbor
      </NavLink>
      <NavLink to="/workspace/follow-ups" className={navLinkClass}>
        <CalendarCheck size={16} />
        Follow-up
      </NavLink>
    </>
  )
}

function BrandMark() {
  return (
    <span className="brand-mark flex items-center justify-center p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs" aria-hidden="true">
      <img
        src="/posind_logo_navy.png"
        alt="POS IND"
        className="h-6 w-auto object-contain dark:hidden"
      />
      <img
        src="/posind_logo_white.png"
        alt="POS IND"
        className="h-6 w-auto object-contain hidden dark:block"
      />
    </span>
  )
}

export function AppShell() {
  const { isAuthenticated, logout } = useContext(AuthContext)
  const location = useLocation()

  const isWorkspace = location.pathname.startsWith('/workspace') || location.pathname.startsWith('/review')

  return (
    <div className="app-frame">
      <header className="app-header">
        <div className="app-header-inner">
          <NavLink to="/" className="app-brand" aria-label="CCH Home">
            <BrandMark />
            <span className="app-brand-text">
              <strong>CCH</strong>
              <small>Keluhan pelanggan</small>
            </span>
          </NavLink>

          <nav className="app-nav" aria-label="Navigasi utama">
            {!isWorkspace ? (
              <>
                <NavLink to="/intake" className={navLinkClass}>
                  <MessageSquarePlus size={16} />
                  Intake Pelanggan
                </NavLink>
                <NavLink to="/review" className={navLinkClass}>
                  <ScanSearch size={16} />
                  Review CS
                </NavLink>
              </>
            ) : (
              <WorkspaceNav />
            )}
          </nav>

          <div className="app-header-actions">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <span className="app-session-chip" title="Token sesi staf tersedia di tab ini">
                  <ShieldCheck size={14} />
                  Sesi staf
                </span>
                <button
                  type="button"
                  className="app-icon-button"
                  aria-label="Keluar dari sesi staf"
                  onClick={logout}
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <NavLink to="/login" state={{ from: location.pathname }} className="app-nav-link">
                <ShieldCheck size={16} />
                Sesi staf
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <span>Customer Complaint Handling&ensp;·&ensp;Workspace pengaduan</span>
        <span className="app-footer-meta">Backend Fiber / API v1</span>
      </footer>
    </div>
  )
}