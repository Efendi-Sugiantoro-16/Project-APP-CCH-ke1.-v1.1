import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Frown,
  Loader2,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react'
import { coreApi } from '../api/coreApi.js'

export function QuickSearchBox() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Shortcut Ctrl+K or / to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        const res = await coreApi.searchComplaints(query, 8)
        setResults(res.results || [])
        setIsOpen(true)
        setSelectedIndex(-1)
      } catch (err) {
        console.error('Quick search error:', err)
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => clearTimeout(timer)
  }, [query])

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex])
      } else if (results.length > 0) {
        handleSelect(results[0])
      }
    }
  }

  const handleSelect = (item) => {
    setIsOpen(false)
    setQuery('')
    navigate(item.detail_url)
  }

  return (
    <div ref={containerRef} className="relative hidden xl:block">
      {/* Search Input Box */}
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Cari tiket, resi, nama... (Ctrl+K)"
          className="w-48 2xl:w-64 pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 transition"
          aria-label="Cari tiket global"
        />

        {loading ? (
          <Loader2
            size={13}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-blue-600"
          />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setResults([])
              setIsOpen(false)
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={13} />
          </button>
        ) : null}
      </div>

      {/* Floating Search Results Dropdown */}
      {isOpen && query.trim() && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 text-xs">
          <div className="border-b border-slate-100 dark:border-slate-800 px-3.5 py-2 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
            <span className="font-semibold text-[11px] text-slate-500">
              Hasil Pencarian ({results.length} ditemukan)
            </span>
            <span className="text-[10px] text-slate-400">Tekan Enter untuk buka</span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {results.length === 0 && !loading ? (
              <div className="p-6 text-center text-slate-400">
                <Search size={20} className="mx-auto mb-1.5 text-slate-300 dark:text-slate-600" />
                <p className="font-medium text-slate-600 dark:text-slate-300">
                  Tidak ada tiket atau resi yang cocok
                </p>
                <p className="text-[11px] mt-0.5 text-slate-400">
                  Coba kata kunci nomor resi, ID aduan, atau nama pengadu.
                </p>
              </div>
            ) : (
              results.map((item, idx) => {
                const isSelected = idx === selectedIndex
                return (
                  <div
                    key={item.ticket_id}
                    onClick={() => handleSelect(item)}
                    className={`p-3 transition cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 truncate">
                          {item.ticket_id}
                        </span>
                        {item.is_ai_created && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1 py-0.2 text-[9px] font-bold shrink-0">
                            <Bot size={10} />
                            AI
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.urgency_level === 'P1_KRITIS' ? (
                          <span className="inline-flex items-center rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                            P1 KRITIS
                          </span>
                        ) : item.urgency_level === 'P2_TINGGI' ? (
                          <span className="inline-flex items-center rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                            P2 TINGGI
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 px-1.5 py-0.5 text-[10px] font-medium">
                            P3
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {item.customer_name}
                        </span>
                        {item.shipment_number !== '-' && (
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                            {item.shipment_number}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{item.created_at}</span>
                    </div>

                    <p className="line-clamp-1 text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                      {item.summary}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100/60 dark:border-slate-800/50 text-[10px] text-slate-400">
                      <span>Status: {item.status_name}</span>
                      <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-semibold">
                        Buka Tiket <ArrowRight size={10} />
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

