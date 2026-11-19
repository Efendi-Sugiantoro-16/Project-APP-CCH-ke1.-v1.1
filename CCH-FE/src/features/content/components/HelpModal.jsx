import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { HelpCircle, X, Search, BookOpen, ExternalLink, ChevronRight, CheckCircle2 } from 'lucide-react'
import { contentApi, mapRouteToHelpPage } from '../api/contentApi.js'

export function HelpModal({ isOpen, onClose, targetPage }) {
  const location = useLocation()
  const defaultPage = useMemo(() => {
    return targetPage || mapRouteToHelpPage(location.pathname)
  }, [targetPage, location.pathname])

  const [activePage, setActivePage] = useState(defaultPage)
  const [topics, setTopics] = useState([])
  const [currentHelp, setCurrentHelp] = useState(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState(null)

  // Sync active page with route whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setActivePage(targetPage || mapRouteToHelpPage(location.pathname))
      setSearchQuery('')
    }
  }, [isOpen, targetPage, location.pathname])

  // Load all topics once on open
  useEffect(() => {
    if (!isOpen) return
    let active = true
    setLoadingTopics(true)

    contentApi.getHelpTopics('id')
      .then((items) => {
        if (active) setTopics(items)
      })
      .catch((err) => {
        console.warn('Failed to load help topics list:', err)
      })
      .finally(() => {
        if (active) setLoadingTopics(false)
      })

    return () => {
      active = false
    }
  }, [isOpen])

  // Load content for activePage
  useEffect(() => {
    if (!isOpen || !activePage) return
    let active = true
    setLoadingContent(true)
    setError(null)

    contentApi.getHelpContext(activePage, 'id')
      .then((data) => {
        if (active) setCurrentHelp(data)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Gagal memuat panduan bantuan')
      })
      .finally(() => {
        if (active) setLoadingContent(false)
      })

    return () => {
      active = false
    }
  }, [isOpen, activePage])

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return topics
    const q = searchQuery.toLowerCase()
    return topics.filter(
      (t) =>
        t.topic.toLowerCase().includes(q) ||
        t.display_in_page.toLowerCase().includes(q)
    )
  }, [topics, searchQuery])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[85vh] max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Bantuan Online & Panduan Sistem
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Panduan kontekstual operasional CCH untuk setiap modul
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            aria-label="Tutup panduan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar / Topic List */}
          <div className="w-72 sm:w-80 border-r border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 flex flex-col shrink-0">
            {/* Search Input */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari topik bantuan…"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingTopics && (
                <div className="p-4 text-xs text-center text-slate-400">
                  Memuat daftar topik…
                </div>
              )}

              {!loadingTopics && filteredTopics.map((topic) => {
                const isSelected = activePage === topic.display_in_page
                return (
                  <button
                    key={`${topic.id}-${topic.display_in_page}`}
                    type="button"
                    onClick={() => setActivePage(topic.display_in_page)}
                    className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-900/50 shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate">{topic.topic}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                        {topic.display_in_page}
                      </div>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                    )}
                  </button>
                )
              })}

              {!loadingTopics && filteredTopics.length === 0 && (
                <div className="p-4 text-xs text-center text-slate-400">
                  Topik tidak ditemukan
                </div>
              )}
            </div>
          </div>

          {/* Guide Content Display */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingContent && (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Memuat panduan modul…</span>
                </div>
              )}

              {error && !loadingContent && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-xs">
                  {error}
                </div>
              )}

              {!loadingContent && !error && currentHelp && (
                <>
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[11px] font-semibold mb-2">
                      <BookOpen className="w-3.5 h-3.5" />
                      Modul: {currentHelp.display_in_page}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {currentHelp.topic}
                    </h2>
                  </div>

                  {/* Render guide description */}
                  <div
                    className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed space-y-3"
                    dangerouslySetInnerHTML={{ __html: currentHelp.description }}
                  />
                </>
              )}
            </div>

            {/* Bottom bar */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-between items-center text-xs text-slate-400 shrink-0">
              <span className="text-[11px]">
                Target Halaman: <code className="text-blue-600 dark:text-blue-400 font-mono">{activePage}</code>
              </span>
              <div className="flex items-center gap-3">
                <a
                  href={`/loadhelponline?page=${encodeURIComponent(activePage)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition text-xs"
                  title="Buka contract teks legacy (Topic~~~Description)"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Format Legacy
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition text-xs shadow-sm shadow-blue-600/30"
                >
                  Tutup Panduan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
