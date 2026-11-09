import { useContext, useEffect, useState } from 'react'
import { ArrowUp, ChevronUp, Cpu, Info, FileText, HelpCircle, Shield, CheckCircle2 } from 'lucide-react'
import { AuthContext } from '../auth/auth-context.js'

/**
 * WorkspaceFooter Component
 * Modern POS IND CCH Footer matching legacy functionality (About, Terms, Help, Session status, and ScrollToTop)
 */
export function WorkspaceFooter({ onOpenAbout, onOpenTerms, onOpenHelp, scrollContainerRef }) {
  const { user } = useContext(AuthContext)
  const [showScrollTop, setShowScrollTop] = useState(false)

  // Listen to scroll events on container or window
  useEffect(() => {
    const target = scrollContainerRef?.current || window
    const handleScroll = () => {
      const scrollTop = scrollContainerRef?.current
        ? scrollContainerRef.current.scrollTop
        : window.scrollY
      setShowScrollTop(scrollTop > 200)
    }

    target.addEventListener('scroll', handleScroll, { passive: true })
    return () => target.removeEventListener('scroll', handleScroll)
  }, [scrollContainerRef])

  const scrollToTop = () => {
    if (scrollContainerRef?.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const currentYear = new Date().getFullYear()
  const displayName = user?.full_name || user?.username || 'EFDS-DEV-TEAM'
  const userOffice = user?.office ? ` · Kantor ${user.office}` : ''

  return (
    <>
      <footer className="workspace-footer border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 transition-colors">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          {/* Left: Copyright & Active Session Info */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1 text-center md:text-left">
            <span>
              &copy; 2023 - {currentYear} <strong className="font-semibold text-slate-700 dark:text-slate-200">PT Pos Indonesia (Persero)</strong> &middot; EFDS-DEV-TEAM
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">&middot;</span>
            <div className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>
                Sesi aktif: <strong className="font-medium text-slate-800 dark:text-slate-100">{displayName}</strong>{userOffice}
              </span>
            </div>
          </div>

          {/* Right: Navigation Links & System Stack Info */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
            <button
              type="button"
              onClick={onOpenAbout}
              className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
              title="Tentang Aplikasi CCH"
            >
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>Tentang Kami</span>
            </button>

            <span className="text-slate-300 dark:text-slate-700">&middot;</span>

            <button
              type="button"
              onClick={onOpenTerms}
              className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
              title="Syarat dan Ketentuan Layanan"
            >
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              <span>Syarat &amp; Ketentuan</span>
            </button>

            <span className="text-slate-300 dark:text-slate-700">&middot;</span>

            <button
              type="button"
              onClick={onOpenHelp}
              className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
              title="Bantuan Penggunaan CCH"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
              <span>Bantuan</span>
            </button>

            {/* Architecture Stack Badge (visible on desktop) */}
            <span className="hidden lg:inline-flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              <Cpu className="w-3 h-3 text-orange-500" />
              <span>Fiber v3 &middot; React Vite</span>
            </span>
          </div>
        </div>
      </footer>

      {/* Floating Scroll-to-Top Button */}
      <button
        type="button"
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-30 p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
          showScrollTop
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-90 translate-y-4 pointer-events-none'
        }`}
        aria-label="Kembali ke atas"
        title="Kembali ke atas"
      >
        <ChevronUp className="w-5 h-5 stroke-[2.5]" />
      </button>
    </>
  )
}
