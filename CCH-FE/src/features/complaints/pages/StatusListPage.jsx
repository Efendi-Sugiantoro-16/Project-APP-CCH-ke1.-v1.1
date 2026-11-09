import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  X,
  Zap,
} from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { complaintApi } from '../api/complaintApi.js'
import { PageHeader } from '../../../shared/ui/PageHeader.jsx'
import { Card } from '../../../shared/ui/Card.jsx'
import { Button } from '../../../shared/ui/Button.jsx'
import { Pagination } from '../../../shared/ui/Pagination.jsx'
import { exportToExcel, exportToCsv } from '../../../shared/utils/excelExport.js'
import { formatDateTime } from '../format.js'

const STATUS_CONFIGS = {
  belum_respon: {
    id: 'belum_respon',
    label: 'Belum Respon',
    sublabel: 'Status 101',
    description: 'Tiket baru masuk yang belum mendapat respon dari kantor tujuan.',
    lightCardClass: 'bg-amber-50/90 border-amber-200 hover:border-amber-300 text-amber-900',
    lightActiveCardClass: 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-400/30 text-amber-950 shadow-md',
    darkCardClass: 'dark:bg-amber-500/10 dark:border-amber-500/30 dark:hover:border-amber-500/50 dark:text-amber-200',
    darkActiveCardClass: 'dark:bg-amber-500/20 dark:border-amber-400 dark:ring-2 dark:ring-amber-500/40 dark:text-amber-100 dark:shadow-lg dark:shadow-amber-500/10',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    indicatorColor: 'bg-amber-500',
    tabActiveClass: 'border-amber-500 text-amber-700 bg-amber-50 dark:border-amber-400 dark:text-amber-300 dark:bg-amber-500/15',
  },
  masih_terbuka: {
    id: 'masih_terbuka',
    label: 'Masih Terbuka',
    sublabel: 'Status ≠ 109',
    description: 'Semua tiket aktif dalam proses penanganan yang belum berstatus selesai.',
    lightCardClass: 'bg-emerald-50/90 border-emerald-200 hover:border-emerald-300 text-emerald-900',
    lightActiveCardClass: 'bg-emerald-100/90 border-emerald-400 ring-2 ring-emerald-400/30 text-emerald-950 shadow-md',
    darkCardClass: 'dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:hover:border-emerald-500/50 dark:text-emerald-200',
    darkActiveCardClass: 'dark:bg-emerald-500/20 dark:border-emerald-400 dark:ring-2 dark:ring-emerald-500/40 dark:text-emerald-100 dark:shadow-lg dark:shadow-emerald-500/10',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
    indicatorColor: 'bg-emerald-500',
    tabActiveClass: 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:border-emerald-400 dark:text-emerald-300 dark:bg-emerald-500/15',
  },
  sudah_respon: {
    id: 'sudah_respon',
    label: 'Sudah Respon',
    sublabel: 'Status ≠ 101',
    description: 'Tiket yang telah ditanggapi dan diperbarui oleh kantor penanggung jawab.',
    lightCardClass: 'bg-sky-50/90 border-sky-200 hover:border-sky-300 text-sky-900',
    lightActiveCardClass: 'bg-sky-100/90 border-sky-400 ring-2 ring-sky-400/30 text-sky-950 shadow-md',
    darkCardClass: 'dark:bg-sky-500/10 dark:border-sky-500/30 dark:hover:border-sky-500/50 dark:text-sky-200',
    darkActiveCardClass: 'dark:bg-sky-500/20 dark:border-sky-400 dark:ring-2 dark:ring-sky-500/40 dark:text-sky-100 dark:shadow-lg dark:shadow-sky-500/10',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
    indicatorColor: 'bg-sky-500',
    tabActiveClass: 'border-sky-500 text-sky-700 bg-sky-50 dark:border-sky-400 dark:text-sky-300 dark:bg-sky-500/15',
  },
  sudah_selesai: {
    id: 'sudah_selesai',
    label: 'Sudah Selesai',
    sublabel: 'Status 109',
    description: 'Tiket komplain yang telah tuntas dan ditutup secara resmi.',
    lightCardClass: 'bg-purple-50/90 border-purple-200 hover:border-purple-300 text-purple-900',
    lightActiveCardClass: 'bg-purple-100/90 border-purple-400 ring-2 ring-purple-400/30 text-purple-950 shadow-md',
    darkCardClass: 'dark:bg-purple-500/10 dark:border-purple-500/30 dark:hover:border-purple-500/50 dark:text-purple-200',
    darkActiveCardClass: 'dark:bg-purple-500/20 dark:border-purple-400 dark:ring-2 dark:ring-purple-500/40 dark:text-purple-100 dark:shadow-lg dark:shadow-purple-500/10',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30',
    indicatorColor: 'bg-purple-500',
    tabActiveClass: 'border-purple-500 text-purple-700 bg-purple-50 dark:border-purple-400 dark:text-purple-300 dark:bg-purple-500/15',
  },
}

const PAGE_SIZE = 25

export function StatusListPage() {
  const { token } = useContext(AuthContext)

  // Matriks Utama: Direction (received vs sent)
  const [direction, setDirection] = useState('received')

  // Status Tab aktif (belum_respon | masih_terbuka | sudah_respon | sudah_selesai)
  const [statusCategory, setStatusCategory] = useState('belum_respon')

  // Filter form
  const [filters, setFilters] = useState(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 60)
    return {
      from: start.toISOString().split('T')[0],
      to: end.toISOString().split('T')[0],
      regional: '',
      product_code: '',
      search: '',
    }
  })

  // Pagination
  const [offset, setOffset] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  // Options
  const [regionalOptions, setRegionalOptions] = useState([])
  const [shippingServices, setShippingServices] = useState([])

  // Data Result
  const [items, setItems] = useState([])
  const [counts, setCounts] = useState({
    total: 0,
    belum_respon: 0,
    masih_terbuka: 0,
    sudah_respon: 0,
    sudah_selesai: 0,
  })
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  // Load dropdown options
  useEffect(() => {
    let active = true
    if (!token) return

    complaintApi.listRegionalOptions(token).then((res) => {
      if (active && res) setRegionalOptions(res)
    })
    complaintApi.listShippingServices(token).then((res) => {
      if (active && res) setShippingServices(res)
    })

    return () => {
      active = false
    }
  }, [token])

  // Reset pagination offset whenever tab or direction changes
  const handleDirectionChange = (newDir) => {
    setDirection(newDir)
    setOffset(0)
  }

  const handleStatusChange = (newStatus) => {
    setStatusCategory(newStatus)
    setOffset(0)
  }

  // Fetch status list
  useEffect(() => {
    let active = true
    if (!token) return

    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const response = await complaintApi.listStatusComplaints(token, {
          direction,
          status: statusCategory,
          from: filters.from,
          to: filters.to,
          regional: filters.regional,
          product_code: filters.product_code,
          search: filters.search,
          limit: pageSize,
          offset,
        })
        if (!active) return

        if (response) {
          const list = Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.items)
            ? response.items
            : (response.data?.items ?? [])
          setItems(list)
          setTotalCount(response.total ?? response.pagination?.total ?? list.length)
          const countsObj = response.counts || response.data?.counts
          if (countsObj) {
            setCounts(countsObj)
          }
        } else {
          setItems([])
          setTotalCount(0)
        }
      } catch (err) {
        if (!active) return
        setError(err.message || 'Gagal memuat daftar status komplain')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [token, direction, statusCategory, filters, offset, pageSize, refreshIndex])

  // Quick Date Presets
  const applyDatePreset = (days) => {
    const end = new Date()
    const start = new Date()
    if (days === 'year') {
      start.setMonth(0, 1)
    } else {
      start.setDate(end.getDate() - days)
    }
    setFilters((prev) => ({
      ...prev,
      from: start.toISOString().split('T')[0],
      to: end.toISOString().split('T')[0],
    }))
    setOffset(0)
  }

  // Export handlers
  const handleExportExcel = () => {
    if (!items.length) return
    const exportData = items.map((item, idx) => ({
      No: offset + idx + 1,
      'No Tiket': item.id,
      'Tgl Komplain': formatDateTime(item.complaint_date),
      'Kantor Asal': `${item.origin_office_code} - ${item.origin_office_name}`,
      'Kantor Tujuan': `${item.destination_office_code} - ${item.destination_office_name}`,
      'No Kiriman': item.shipment_number || '-',
      Layanan: item.shipment_type_name || item.shipment_type_code || '-',
      'Tipe Komplain': item.complaint_type_name || item.complaint_type_code || '-',
      'Status Akhir': `${item.final_status_code} - ${item.final_status_name}`,
      'Umur (Hari)': item.duration_days,
      'Kantor Update': item.status_office_name || item.status_office_code || '-',
      'Tgl Update': formatDateTime(item.status_date),
      Keterangan: item.summary || '-',
    }))
    const fileName = `Daftar_Status_${direction.toUpperCase()}_${statusCategory}_${new Date().toISOString().split('T')[0]}`
    exportToExcel(exportData, fileName, 'Daftar Status Tiket')
  }

  const handleExportCsv = () => {
    if (!items.length) return
    const exportData = items.map((item, idx) => ({
      No: offset + idx + 1,
      No_Tiket: item.id,
      Tgl_Komplain: formatDateTime(item.complaint_date),
      Kantor_Asal: `${item.origin_office_code} - ${item.origin_office_name}`,
      Kantor_Tujuan: `${item.destination_office_code} - ${item.destination_office_name}`,
      No_Kiriman: item.shipment_number || '-',
      Layanan: item.shipment_type_name || item.shipment_type_code || '-',
      Tipe_Komplain: item.complaint_type_name || item.complaint_type_code || '-',
      Status_Akhir: `${item.final_status_code} - ${item.final_status_name}`,
      Umur_Hari: item.duration_days,
      Kantor_Update: item.status_office_name || item.status_office_code || '-',
      Tgl_Update: formatDateTime(item.status_date),
      Keterangan: item.summary || '-',
    }))
    const fileName = `Daftar_Status_${direction.toUpperCase()}_${statusCategory}_${new Date().toISOString().split('T')[0]}`
    exportToCsv(exportData, fileName)
  }

  // Active status description helper
  const currentStatusInfo = STATUS_CONFIGS[statusCategory] || STATUS_CONFIGS.belum_respon

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 1. Header Halaman */}
      <PageHeader
        eyebrow="Call Center SLA Monitoring"
        title="Daftar Status Tiket Komplain (8 Varian)"
        subtitle="Monitoring operasional tiket terima & kirim secara real-time berdasarkan SLA respon dan tahapan status tiket."
      />

      {/* 2. Matriks Utama: Direction Switcher (Mobile Responsive) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-slate-100/90 dark:bg-slate-900/60 p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleDirectionChange('received')}
            className={`flex items-center justify-center sm:justify-start gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
              direction === 'received'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <ArrowDownLeft size={18} className={direction === 'received' ? 'text-white' : 'text-blue-500'} />
            <div className="text-left">
              <div className="leading-tight">Tiket Diterima (Terima)</div>
              <div className="text-[10px] sm:text-[11px] opacity-80 font-normal">Tujuan/Update ke Kantor User</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDirectionChange('sent')}
            className={`flex items-center justify-center sm:justify-start gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
              direction === 'sent'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <ArrowUpRight size={18} className={direction === 'sent' ? 'text-white' : 'text-emerald-500'} />
            <div className="text-left">
              <div className="leading-tight">Tiket Dikirim (Kirim)</div>
              <div className="text-[10px] sm:text-[11px] opacity-80 font-normal">Dibuat dari Kantor Asal User</div>
            </div>
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 px-3 py-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/50 shadow-xs">
          <span className="flex items-center gap-1.5">
            <Zap size={14} className="text-amber-500 dark:text-amber-400 shrink-0" />
            <span>Varian Aktif:</span>
          </span>
          <strong className="font-mono text-slate-800 dark:text-slate-200 break-all">{`cch_status_${statusCategory}_${direction === 'received' ? 'terima' : 'kirim'}`}</strong>
        </div>
      </div>

      {/* 3. 4 Interactive Stat Cards (SLA Categories - Light/Dark/System Theme Adaptif) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Object.values(STATUS_CONFIGS).map((cfg) => {
          const isCurrentActive = statusCategory === cfg.id
          const cardStyle = isCurrentActive
            ? `${cfg.lightActiveCardClass} ${cfg.darkActiveCardClass}`
            : `${cfg.lightCardClass} ${cfg.darkCardClass}`

          return (
            <div
              key={cfg.id}
              onClick={() => handleStatusChange(cfg.id)}
              className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border ${cardStyle} select-none`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cfg.indicatorColor} ${isCurrentActive ? 'animate-pulse' : ''}`} />
                  {cfg.label}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${cfg.badgeClass}`}>
                  {direction === 'received' ? 'Terima' : 'Kirim'}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight">
                {counts[cfg.id]?.toLocaleString('id-ID') || 0}
              </div>
              <div className="text-[11px] sm:text-xs opacity-75 mt-1 font-medium">
                {cfg.sublabel} ({cfg.id === 'belum_respon' ? 'Tindakan segera' : cfg.id === 'masih_terbuka' ? 'Aktif dalam proses' : cfg.id === 'sudah_respon' ? 'Telah ditanggapi' : 'Tiket tuntas'})
              </div>
            </div>
          )
        })}
      </div>

      {/* 4. Filter Toolbar & Action Bar (Fully Responsive PC/Tablet/Mobile) */}
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="p-3.5 sm:p-5 space-y-4">
          {/* Status Tabs Navigation (Horizontal Scrollable on Mobile) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-100 dark:border-slate-800">
            {Object.values(STATUS_CONFIGS).map((cfg) => {
              const isActive = statusCategory === cfg.id
              return (
                <button
                  key={cfg.id}
                  type="button"
                  onClick={() => handleStatusChange(cfg.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 border cursor-pointer ${
                    isActive
                      ? cfg.tabActiveClass
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.indicatorColor}`} />
                  <span>{cfg.label}</span>
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-[10px] font-mono text-slate-700 dark:text-slate-300">
                    {counts[cfg.id] || 0}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Filter Controls Row (Responsive Grid: 1 col HP, 2 col Tablet, 6 col Laptop/PC) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Quick Date Range */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Dari Tanggal</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, from: e.target.value }))
                  setOffset(0)
                }}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, to: e.target.value }))
                  setOffset(0)
                }}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Regional Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Regional</label>
              <select
                value={filters.regional}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, regional: e.target.value }))
                  setOffset(0)
                }}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Semua Regional</option>
                {regionalOptions.map((reg, index) => {
                  const regKey = reg.code || reg.id || `reg-${index}`
                  const regName = reg.name || reg.label || regKey
                  return (
                    <option key={regKey} value={regKey}>
                      {regName}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Shipping Product Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Layanan Kiriman</label>
              <select
                value={filters.product_code}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, product_code: e.target.value }))
                  setOffset(0)
                }}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Semua Layanan</option>
                {shippingServices.map((prod, index) => {
                  const prodKey = prod.code || prod.id || `prod-${index}`
                  const prodDesc = prod.description || prod.label || prodKey
                  return (
                    <option key={prodKey} value={prodKey}>
                      {prodDesc}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Search Input */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Cari Tiket / Resi / Kantor</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ID tiket, resi, kantor..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                    setOffset(0)
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                {filters.search && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, search: '' }))
                      setOffset(0)
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preset Buttons & Action Tools (Responsive Wrap) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 text-xs border-t border-slate-100 dark:border-slate-800/80">
            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="text-[11px] font-medium mr-1">Preset:</span>
              <button
                type="button"
                onClick={() => applyDatePreset(7)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset(30)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
              >
                30 Hari
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset(60)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
              >
                60 Hari
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('year')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
              >
                Tahun Ini
              </button>
            </div>

            {/* Actions (Segarkan, CSV, Excel) */}
            <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRefreshIndex((v) => v + 1)}
                className="flex-1 sm:flex-none justify-center gap-1.5 text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                <span>Segarkan</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={!items.length}
                className="flex-1 sm:flex-none justify-center gap-1.5 text-xs border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Download size={13} />
                <span>CSV</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleExportExcel}
                disabled={!items.length}
                className="flex-1 sm:flex-none justify-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
              >
                <FileSpreadsheet size={13} />
                <span>Excel</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 5. Data Table Section (Full 3-Mode & Multi-Device Mobile/Tablet/PC) */}
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {/* Table Description Bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50/80 dark:bg-slate-900/60 transition-colors">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{currentStatusInfo.label}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${currentStatusInfo.badgeClass}`}>
                {currentStatusInfo.sublabel}
              </span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{currentStatusInfo.description}</div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Total Ditemukan: <strong className="text-slate-900 dark:text-slate-100 font-bold">{totalCount.toLocaleString('id-ID')}</strong> tiket
          </div>
        </div>

        {/* Content Box */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-3">
            <Loader2 size={32} className="animate-spin text-blue-500" />
            <div className="text-sm font-medium">Memuat data tiket {currentStatusInfo.label}…</div>
          </div>
        ) : error ? (
          <div className="py-16 flex flex-col items-center justify-center text-rose-600 dark:text-rose-400 gap-3 px-4 text-center">
            <AlertCircle size={32} />
            <div className="font-semibold text-sm">{error}</div>
            <Button size="sm" variant="outline" onClick={() => setRefreshIndex((v) => v + 1)}>
              Coba Lagi
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-3 px-4 text-center">
            <Inbox size={42} className="text-slate-300 dark:text-slate-600" />
            <div className="font-bold text-slate-700 dark:text-slate-300">Tidak ada tiket komplain ditemukan</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Tidak ada data tiket dengan filter dan status terpilih. Coba ubah rentang tanggal atau kata kunci pencarian Anda.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[760px] sm:min-w-[850px]">
              <thead className="bg-slate-100/90 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">No Tiket</th>
                  <th className="py-3 px-3">Tgl Masuk</th>
                  <th className="py-3 px-3">Rute (Asal → Tujuan)</th>
                  <th className="py-3 px-3">Kiriman / Layanan</th>
                  <th className="py-3 px-3">Tipe Komplain</th>
                  <th className="py-3 px-3">Status Akhir</th>
                  <th className="py-3 px-3 text-center">Umur (SLA)</th>
                  <th className="py-3 px-3">Pembaruan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {items.map((item, index) => {
                  const isClosed = item.final_status_code === '109'
                  const detailUrl = isClosed
                    ? `/workspace/complaints/completed/${item.id}`
                    : `/workspace/complaints/open/${item.id}`

                  // Durasi status badge
                  let durationClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                  if (item.duration_days >= 4) {
                    durationClass = 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
                  } else if (item.duration_days >= 2) {
                    durationClass = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
                  }

                  const rowKey = `${item.id}-${item.target_update_office || item.destination_office_code || index}`

                  return (
                    <tr key={rowKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* No Tiket */}
                      <td className="py-3 px-4 font-medium whitespace-nowrap">
                        <Link
                          to={detailUrl}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-1 font-mono font-bold"
                        >
                          {item.id}
                        </Link>
                      </td>

                      {/* Tgl Masuk */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {formatDateTime(item.complaint_date)}
                      </td>

                      {/* Rute (Asal -> Tujuan) */}
                      <td className="py-3 px-3 max-w-[200px]">
                        <div className="font-semibold text-slate-900 dark:text-slate-200 truncate">
                          {item.origin_office_code} - {item.origin_office_name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                          <span>→</span>
                          <span>{item.destination_office_code} - {item.destination_office_name}</span>
                        </div>
                      </td>

                      {/* Kiriman / Layanan */}
                      <td className="py-3 px-3 max-w-[150px]">
                        <div className="font-mono font-medium text-slate-900 dark:text-slate-200 truncate">
                          {item.shipment_number || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {item.shipment_type_name || item.shipment_type_code || '-'}
                        </div>
                      </td>

                      {/* Tipe Komplain */}
                      <td className="py-3 px-3 max-w-[160px]">
                        <div className="text-slate-800 dark:text-slate-200 font-medium truncate" title={item.complaint_type_name}>
                          {item.complaint_type_name || item.complaint_type_code || '-'}
                        </div>
                        {item.summary && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]" title={item.summary}>
                            {item.summary}
                          </div>
                        )}
                      </td>

                      {/* Status Akhir */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            item.final_status_code === '101'
                              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
                              : item.final_status_code === '109'
                              ? 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30'
                              : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30'
                          }`}
                        >
                          {item.final_status_code} - {item.final_status_name}
                        </span>
                      </td>

                      {/* Umur Hari (SLA) */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${durationClass}`}>
                          <Clock size={11} className="mr-1 inline" />
                          {item.duration_days} hr
                        </span>
                      </td>

                      {/* Pembaruan */}
                      <td className="py-3 px-3 max-w-[170px]">
                        <div className="text-slate-800 dark:text-slate-200 font-medium truncate">
                          {item.status_office_name || item.status_office_code || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatDateTime(item.status_date)}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          to={detailUrl}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        >
                          <span>Buka</span>
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Section */}
        {!loading && items.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Pagination
              offset={offset}
              count={items.length}
              total={totalCount}
              perPage={pageSize}
              loading={loading}
              onPage={setOffset}
              pageSizeOptions={[10, 25, 50, 100]}
              onPerPageChange={(newSize) => {
                setPageSize(newSize)
                setOffset(0)
              }}
              label="tiket"
            />
          </div>
        )}
      </Card>
    </div>
  )
}
export default StatusListPage
