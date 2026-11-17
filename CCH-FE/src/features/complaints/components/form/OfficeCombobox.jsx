import { useState, useRef, useEffect, useMemo } from 'react'
import { Building2, Search, X, Check, ChevronDown } from 'lucide-react'

const POPULAR_OFFICES = [
  { code: '50000', name: 'Surabaya' },
  { code: '40000', name: 'Bandung' },
  { code: '10000', name: 'Jakarta Pst' },
  { code: '20000', name: 'Medan' },
  { code: '90000', name: 'Makassar' },
  { code: '40005CC', name: 'Call Center' },
]

/**
 * Modern Searchable Combobox for Pos Indonesia Office selection.
 * Allows searching by Office Name (e.g., "Bandung", "Kediri") or Nopend Code (e.g., "40005CC", "64100").
 */
export function OfficeCombobox({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  disabled = false,
  offices = [],
  placeholder = 'Cari nama kantor atau kode pos/nopend...',
  helperText,
  showQuickChips = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Find currently selected office object
  const selectedOffice = useMemo(() => {
    if (!value) return null
    return offices.find(
      (o) => String(o.code).toLowerCase() === String(value).toLowerCase()
    ) || { code: value, name: value }
  }, [value, offices])

  // Filter offices based on search query
  const filteredOffices = useMemo(() => {
    if (!searchTerm.trim()) {
      return offices.slice(0, 15)
    }
    const q = searchTerm.toLowerCase().trim()
    return offices
      .filter(
        (o) =>
          String(o.code).toLowerCase().includes(q) ||
          String(o.name).toLowerCase().includes(q) ||
          String(o.abbreviation || '').toLowerCase().includes(q)
      )
      .slice(0, 20)
  }, [offices, searchTerm])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (officeCode) => {
    onChange?.({ target: { name, value: officeCode } })
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange?.({ target: { name, value: '' } })
    setSearchTerm('')
    if (inputRef.current) inputRef.current.focus()
  }

  return (
    <div className="relative mb-3" ref={containerRef}>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Selected chip view or trigger button */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen)
            setTimeout(() => inputRef.current?.focus(), 50)
          }
        }}
        className={`w-full min-h-[42px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition text-sm ${
          disabled
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : error
            ? 'border-red-400 bg-red-50/30 ring-2 ring-red-400/20'
            : isOpen
            ? 'border-blue-500 bg-white ring-2 ring-blue-500/20 shadow-xs'
            : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          {value ? (
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                {selectedOffice?.code || value}
              </span>
              <span className="text-xs font-medium text-slate-800 truncate">
                {selectedOffice?.name && selectedOffice.name !== value ? selectedOffice.name : ''}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              title="Hapus pilihan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1">
          {/* Search bar inside dropdown */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari kode atau nama kantor pos..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Office List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {filteredOffices.length > 0 ? (
              filteredOffices.map((office) => {
                const isSelected = String(office.code).toLowerCase() === String(value).toLowerCase()
                return (
                  <button
                    key={office.code}
                    type="button"
                    onClick={() => handleSelect(office.code)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-blue-50/70 transition cursor-pointer text-xs ${
                      isSelected ? 'bg-blue-50 font-semibold text-blue-900' : 'text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {office.code}
                      </span>
                      <span className="truncate">{office.name}</span>
                      {office.type && (
                        <span className="text-[10px] text-slate-400 bg-slate-50 px-1 py-0.2 rounded border border-slate-200">
                          {office.type}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                )
              })
            ) : (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-400 mb-1">
                  Tidak ditemukan kantor dengan kata kunci "{searchTerm}".
                </p>
                {searchTerm.trim().length >= 3 && (
                  <button
                    type="button"
                    onClick={() => handleSelect(searchTerm.trim().toUpperCase())}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Gunakan kode manual: "{searchTerm.trim().toUpperCase()}"
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {helperText && !error && <p className="mt-1 text-[11px] text-slate-400">{helperText}</p>}

      {/* Quick Hub Chips */}
      {showQuickChips && !disabled && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <span className="text-[10px] text-slate-400 font-medium">Pilih Cepat:</span>
          {POPULAR_OFFICES.map((pop) => (
            <button
              key={pop.code}
              type="button"
              onClick={() => handleSelect(pop.code)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition border cursor-pointer ${
                value === pop.code
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
              }`}
              title={`${pop.name} (${pop.code})`}
            >
              {pop.code}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
