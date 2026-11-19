import { useEffect, useState } from 'react'
import { FileText, X, Printer, ShieldAlert, ExternalLink } from 'lucide-react'
import { contentApi } from '../api/contentApi.js'

export function TermsModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    let active = true
    setLoading(true)
    setError(null)

    contentApi.getTerms('id')
      .then((res) => {
        if (active) setData(res)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Gagal memuat syarat & ketentuan')
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

  const handlePrint = () => {
    // Open legacy print-friendly view which auto-invokes window.print()
    window.open('/printtermsconditions', '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Syarat & Ketentuan Layanan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Integritas dan Ketentuan Operasional Penanganan Keluhan
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
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span>Memuat Syarat & Ketentuan…</span>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  Harap membaca seluruh klausul integritas di bawah ini dengan seksama. 
                  Setiap staf, petugas, dan pengguna sistem CCH terikat secara hukum dan kedinasan pada ketentuan ini.
                </div>
              </div>

              {/* Rich Terms Text from database */}
              <div 
                className="prose prose-slate dark:prose-invert max-w-none text-sm space-y-3 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: data.terms_text }}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap justify-between items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <a
              href="/loadtermsconditions"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 transition"
              title="Tampilkan versi HTML asli legacy"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Tampilan Legacy
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Cetak Syarat & Ketentuan
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium transition shadow-sm shadow-amber-600/30"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
