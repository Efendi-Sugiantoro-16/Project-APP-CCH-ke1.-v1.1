import { useEffect, useState } from 'react'
import { Info, X, ShieldCheck, Cpu, Database, ExternalLink } from 'lucide-react'
import { contentApi } from '../api/contentApi.js'

export function AboutModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    let active = true
    setLoading(true)
    setError(null)

    contentApi.getAbout('id')
      .then((res) => {
        if (active) setData(res)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Gagal memuat informasi tentang sistem')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [isOpen])

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Tentang Aplikasi CCH
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customer Complaint Handling • PT Pos Indonesia
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Memuat informasi Tentang Kami…</span>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <>
              <div className="panel bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border-blue-100 dark:border-blue-900/50 p-4 rounded-xl">
                <div className="font-semibold text-slate-900 dark:text-white mb-1">
                  {data.site_title || 'Customer Complaint Handling'}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Versi 7.0 Modernized Architecture (Go + React)
                </div>
              </div>

              {/* Rich About Text from database */}
              <div 
                className="prose prose-slate dark:prose-invert max-w-none text-sm space-y-3 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: data.about_text }}
              />

              {/* System Specs Badges */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 text-xs">
                  <Cpu className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="font-semibold text-slate-700 dark:text-slate-200">Backend Core</div>
                    <div className="text-slate-400">Go Fiber API v3</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 text-xs">
                  <Database className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="font-semibold text-slate-700 dark:text-slate-200">Database</div>
                    <div className="text-slate-400">MariaDB CCH</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 text-xs">
                  <ShieldCheck className="w-4 h-4 text-purple-500" />
                  <div>
                    <div className="font-semibold text-slate-700 dark:text-slate-200">Security</div>
                    <div className="text-slate-400">JWT & Audit Shield</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-between items-center text-xs text-slate-400">
          <span>© 2026 PT Pos Indonesia (Persero)</span>
          <div className="flex items-center gap-3">
            <a
              href="/loadaboutus"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition"
              title="Tampilkan versi HTML asli legacy"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Tampilan Legacy
            </a>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-medium transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
