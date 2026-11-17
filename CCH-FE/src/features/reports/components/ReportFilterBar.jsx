import { useState, useEffect, useContext } from 'react'
import {
  Calendar,
  Download,
  FileSpreadsheet,
  Filter,
  Layers,
  MapPin,
  Package,
  Printer,
  RotateCcw,
} from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { complaintApi } from '../../complaints/api/complaintApi.js'

const STANDARD_REGIONALS = [
  { code: '', label: 'Semua Regional (Nasional)' },
  { code: '1', label: 'Regional 1 - Sumatera Bagian Utara' },
  { code: '2', label: 'Regional 2 - Sumatera Bagian Barat' },
  { code: '3', label: 'Regional 3 - DKI Jakarta & Banten' },
  { code: '4', label: 'Regional 4 - Jawa Barat' },
  { code: '5', label: 'Regional 5 - Jawa Tengah & DIY' },
  { code: '6', label: 'Regional 6 - Jawa Timur, Bali, Nusra' },
]

export function ReportFilterBar({
  filters,
  onChange,
  onApply,
  onExportExcel,
  onExportCsv,
  onPrint,
  totalItems = 0,
  loading = false,
  showOnlyTarget = false,
  hideProduct = false,
}) {
  const { token } = useContext(AuthContext)
  const [offices, setOffices] = useState([])
  const [shippingServices, setShippingServices] = useState([])

  // Load lookup options for offices and shipping services
  useEffect(() => {
    let active = true
    if (!token) return

    complaintApi.listOfficeOptions(token).then((data) => {
      if (active && Array.isArray(data)) {
        setOffices(data)
      }
    }).catch(() => {})

    complaintApi.listShippingServices(token).then((data) => {
      if (active && Array.isArray(data)) {
        setShippingServices(data)
      }
    }).catch(() => {})

    return () => {
      active = false
    }
  }, [token])

  // Filter offices by chosen regional
  const filteredOffices = offices.filter((off) => {
    if (!filters.regional) return true
    return off.regional_code === filters.regional || off.regional_code === `${filters.regional}0000`
  })

  // Preset date ranges
  const applyPreset = (preset) => {
    const today = new Date()
    const formatDate = (d) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    let fromDate = new Date()
    let toDate = new Date()

    if (preset === 'today') {
      fromDate = today
      toDate = today
    } else if (preset === '7days') {
      fromDate = new Date()
      fromDate.setDate(today.getDate() - 7)
      toDate = today
    } else if (preset === 'thisMonth') {
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1)
      toDate = today
    } else if (preset === 'last30days') {
      fromDate = new Date()
      fromDate.setDate(today.getDate() - 30)
      toDate = today
    }

    onChange({
      ...filters,
      from: formatDate(fromDate),
      to: formatDate(toDate),
    })
  }

  const handleReset = () => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const formatDate = (d) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    onChange({
      from: formatDate(firstDay),
      to: formatDate(today),
      regional: '',
      office: '',
      product_code: '',
    })
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
            <Filter size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Filter Parameter & Ekspor Laporan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sesuaikan periode, regional, kantor, dan jenis layanan untuk memfilter data rincian.
            </p>
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <span className="text-slate-400 mr-1 hidden sm:inline">Preset:</span>
          <button
            type="button"
            onClick={() => applyPreset('today')}
            className="rounded px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => applyPreset('7days')}
            className="rounded px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            7 Hari
          </button>
          <button
            type="button"
            onClick={() => applyPreset('thisMonth')}
            className="rounded px-2.5 py-1 font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400"
          >
            Bulan Ini
          </button>
          <button
            type="button"
            onClick={() => applyPreset('last30days')}
            className="rounded px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            30 Hari
          </button>
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Tanggal Awal */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Calendar size={13} className="text-slate-400" />
            Tanggal Awal
          </label>
          <input
            type="date"
            value={filters.from || ''}
            onChange={(e) => onChange({ ...filters, from: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        {/* Tanggal Akhir */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Calendar size={13} className="text-slate-400" />
            Tanggal Akhir
          </label>
          <input
            type="date"
            value={filters.to || ''}
            onChange={(e) => onChange({ ...filters, to: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        {/* Regional Selector */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Layers size={13} className="text-slate-400" />
            Regional Selector
          </label>
          <select
            value={filters.regional || ''}
            onChange={(e) => {
              onChange({ ...filters, regional: e.target.value, office: '' })
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {STANDARD_REGIONALS.map((reg) => (
              <option key={reg.code} value={reg.code}>
                {reg.label}
              </option>
            ))}
          </select>
        </div>

        {/* Kantor / UPT */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <MapPin size={13} className="text-slate-400" />
            Kantor / UPT
          </label>
          <select
            value={filters.office || ''}
            onChange={(e) => onChange({ ...filters, office: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">(Semua Kantor / UPT)</option>
            {filteredOffices.map((off) => (
              <option key={off.code} value={off.code}>
                {off.code} - {off.name}
              </option>
            ))}
          </select>
        </div>

        {/* Produk / Layanan */}
        {!hideProduct && (
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Package size={13} className="text-slate-400" />
              Layanan Produk
            </label>
            <select
              value={filters.product_code || ''}
              onChange={(e) => onChange({ ...filters, product_code: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">(Semua Produk)</option>
              {shippingServices.map((svc) => (
                <option key={svc.code} value={svc.code}>
                  {svc.code} - {svc.description}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Hanya Tujuan Langsung */}
        {showOnlyTarget && (
          <div className="flex items-end pb-1.5">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(filters.hanya_tujuan)}
                onChange={(e) => onChange({ ...filters, hanya_tujuan: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-900"
              />
              Hanya Tujuan Langsung
            </label>
          </div>
        )}
      </div>

      {/* Action Toolbar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onApply}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all disabled:opacity-50"
          >
            <Filter size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Memuat Data…' : 'Tampilkan Laporan'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <RotateCcw size={13} />
            Reset
          </button>

          <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
            Total Ditemukan: <strong className="text-slate-800 dark:text-slate-100 font-semibold">{totalItems}</strong> baris
          </span>
        </div>

        {/* Download & Print Buttons */}
        <div className="flex items-center gap-2">
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              disabled={loading || totalItems === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
              title="Cetak Laporan Resmi / Simpan sebagai PDF Eksekutif"
            >
              <Printer size={14} />
              Cetak / PDF
            </button>
          )}

          <button
            type="button"
            onClick={onExportExcel}
            disabled={loading || totalItems === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
            title="Download Excel Spreadsheet (.xls/.xlsx)"
          >
            <FileSpreadsheet size={14} />
            Download Excel (.xlsx)
          </button>

          <button
            type="button"
            onClick={onExportCsv}
            disabled={loading || totalItems === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
            title="Download Format CSV UTF-8"
          >
            <Download size={13} />
            CSV
          </button>
        </div>
      </div>
    </div>
  )
}
