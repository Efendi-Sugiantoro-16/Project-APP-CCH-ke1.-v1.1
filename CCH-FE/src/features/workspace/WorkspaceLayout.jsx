import { useContext, useEffect, useRef, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Headset, HelpCircle, LogOut, Menu, ShieldCheck, User, X } from 'lucide-react'
import { AuthContext } from '../../features/auth/auth-context.js'
import { SidebarFooter, WorkspaceSidebar } from '../../features/workspace/WorkspaceSidebar.jsx'
import { ThemeToggle } from '../../shared/theme/ThemeToggle.jsx'
import { WorkspaceFooter } from './WorkspaceFooter.jsx'
import { HelpModal } from '../content/components/HelpModal.jsx'
import { AboutModal } from '../content/components/AboutModal.jsx'
import { TermsModal } from '../content/components/TermsModal.jsx'
import { QuickSearchBox } from './components/QuickSearchBox.jsx'
import { NotificationDropdown } from './components/NotificationDropdown.jsx'
import { VirtualCSWidget } from '../ai/components/VirtualCSWidget.jsx'


function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' })

function Topbar({ onOpenSidebar, onOpenHelp }) {
  const now = useClock()
  const { isAuthenticated, logout } = useContext(AuthContext)

  return (
    <header className="sticky top-0 z-20 flex h-16 sm:h-20 items-center justify-between gap-2 sm:gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3 sm:px-6 lg:px-8 backdrop-blur-md transition-colors">
      {/* Left side: Hamburger, Logo, Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          className="rounded-xl p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden cursor-pointer shrink-0 transition"
          aria-label="Buka menu navigasi"
          onClick={onOpenSidebar}
        >
          <Menu size={20} />
        </button>

        {/* Small POS IND emblem for mobile */}
        <Link to="/workspace" className="flex items-center gap-1.5 md:hidden shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 p-1 shadow-xs border border-slate-700">
            <img
              src="/posind_logo_white.png"
              alt="POS IND"
              className="h-full w-full object-contain"
            />
          </div>
        </Link>

        {/* Title & Subtitle */}
        <div className="min-w-0">
          <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-slate-800 dark:text-slate-100 truncate whitespace-nowrap leading-tight">
            Workspace Pengaduan
          </h1>
          <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400 truncate whitespace-nowrap mt-0.5">
            Pantau tiket dan follow-up kantor Anda.
          </p>
        </div>
      </div>

      {/* Right side: Search, Help, Theme, Notifications, Clock, User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0">
        {/* Real-Time Global Quick Search Box */}
        <QuickSearchBox />

        {/* Bantuan Online Modal Trigger */}
        <button
          type="button"
          onClick={onOpenHelp}
          className="rounded-xl p-2 text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
          aria-label="Bantuan Online CCH"
          title="Bantuan Modul Ini (cch_help)"
        >
          <HelpCircle size={18} />
        </button>

        {/* Theme Switcher (Responsive single button on mobile, segmented on tablet/desktop) */}
        <ThemeToggle />

        {/* Notifications & User Actions */}
        <div className="flex items-center gap-1 sm:gap-2 border-l border-slate-200 dark:border-slate-800 pl-1.5 sm:pl-3">
          {/* Real-time Notifications Popover with live count badge */}
          <NotificationDropdown />

          {/* Clock Badge (Shown on desktop >= xl) */}
          <div className="hidden text-right xl:block pr-1">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{dateFmt.format(now)}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{timeFmt.format(now)} WIB</p>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-1">
              <Link
                to="/workspace/profile"
                className="rounded-xl p-2 text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                aria-label="Profil Saya"
                title="Profil Saya"
              >
                <User size={18} />
              </Link>
              <button
                type="button"
                className="rounded-xl p-2 text-slate-500 dark:text-slate-400 transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                aria-label="Keluar dari sesi staf"
                onClick={logout}
                title="Keluar"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-secondary btn-sm text-xs">
              <ShieldCheck size={14} /> Sesi staf
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function SidebarBrand() {
  return (
    <Link to="/workspace" className="flex h-20 items-center gap-3 border-b border-slate-800/50 px-5 group">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800/90 border border-slate-700/70 p-1.5 shadow-md transition group-hover:scale-105">
        <img
          src="/posind_logo_white.png"
          alt="POS IND"
          className="h-full w-full object-contain"
        />
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold tracking-tight text-white">POS IND</span>
          <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-orange-400 border border-orange-500/30">
            CCH
          </span>
        </div>
        <p className="text-[10px] font-medium text-slate-400 truncate">Customer Complaint Handling</p>
      </div>
    </Link>
  )
}

/** Dark sidebar shell used by every /workspace route. */
export function WorkspaceLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const scrollContainerRef = useRef(null)
  const { user } = useContext(AuthContext)

  const displayName = user?.full_name || user?.username || 'Staf Call Center'
  const displayRole =
    user?.user_level === '3'
      ? 'Call Center'
      : user?.user_level === '-1'
        ? 'Administrator'
        : 'Staf CCH'

  // The mobile drawer is closed by its own nav/overlay handlers rather than a
  // route effect, avoiding a cascading render on every navigation.
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Desktop sidebar */}
      <aside className="z-20 hidden w-64 flex-col bg-slate-900 text-slate-300 shadow-xl md:flex">
        <SidebarBrand />
        <WorkspaceSidebar />
        <SidebarFooter username={displayName} role={displayRole} />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex h-full w-64 flex-col bg-slate-900 text-slate-300 shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-5 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              aria-label="Tutup menu"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
            <SidebarBrand />
            <WorkspaceSidebar onNavigate={() => setSidebarOpen(false)} />
            <SidebarFooter username={displayName} role={displayRole} />
          </aside>
        </div>
      ) : null}

      <main className="flex flex-1 flex-col overflow-hidden">
        <Topbar 
          onOpenSidebar={() => setSidebarOpen(true)} 
          onOpenHelp={() => setHelpOpen(true)} 
        />
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 p-4 lg:p-8 animate-fade-in">
            <Outlet />
          </div>
          <WorkspaceFooter
            onOpenAbout={() => setAboutOpen(true)}
            onOpenTerms={() => setTermsOpen(true)}
            onOpenHelp={() => setHelpOpen(true)}
            scrollContainerRef={scrollContainerRef}
          />
        </div>
      </main>

      {/* Contextual Online Modals */}
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
      <TermsModal isOpen={termsOpen} onClose={() => setTermsOpen(false)} />
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Floating Customer Service Virtual (CS Virtual) AI Copilot */}
      <VirtualCSWidget />
    </div>
  )
}

