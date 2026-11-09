import { useState, useContext, useEffect, useMemo } from 'react'
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { complaintApi } from '../../complaints/api/complaintApi.js'
import { PageHeader } from '../../../shared/ui/PageHeader.jsx'
import { Card } from '../../../shared/ui/Card.jsx'
import { StateBox } from '../../../shared/ui/StateBox.jsx'
import { StatCard } from '../../../shared/ui/StatCard.jsx'
import { ReportFilterBar } from '../components/ReportFilterBar.jsx'
import { Pagination } from '../../../shared/ui/Pagination.jsx'
import { exportToExcel, exportToCsv, printExecutiveReport } from '../../../shared/utils/excelExport.js'
import { cx } from '../../../shared/ui/cx.js'

export function OfficeSummaryReportPage() {
  const { token } = useContext(AuthContext)

  // Default dates: start of month to today
  const today = useMemo(() => new Date(), [])
  const firstDay = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today])
  const formatDate = (d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Active Direction Mode: 'received' (cch_rekap_terima) | 'sent' (cch_rekap_kirim)
  const [direction, setDirection] = useState('received')

  // Filters
  const [filters, setFilters] = useState({
    from: formatDate(firstDay),
    to: formatDate(today),
    regional: '',
    product_code: '',
    hanya_tujuan: false,
  })

  // Table client-side search
  const [tableSearch, setTableSearch] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)

  // Data State
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch summary data from Go Backend
  useEffect(() => {
    let active = true
    if (!token) return

    async function loadSummary() {
      setLoading(true)
      setError(null)
      try {
        const queryParams = {
          from: filters.from,
          to: filters.to,
          regional: filters.regional || undefined,
          product_code: filters.product_code || undefined,
          limit: 1000,
        }

        let res = []
        if (direction === 'received') {
          queryParams.hanya_tujuan = filters.hanya_tujuan ? 'on' : undefined
          res = await complaintApi.listReceivedSummary(token, queryParams)
        } else {
          res = await complaintApi.listSentSummary(token, queryParams)
        }

        if (active) {
          setData(Array.isArray(res) ? res : [])
        }
      } catch (err) {
        if (active) {
          setError(err?.message || 'Gagal memuat rekapitulasi data per kantor')
          setData([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadSummary()

    return () => {
      active = false
    }
  }, [token, direction, filters, refreshKey])

  // Aggregate Totals for StatCards
  const totals = useMemo(() => {
    let total = 0
    let completed = 0
    let open = 0
    let responded = 0
    let unresponded = 0

    for (const row of data) {
      total += row.total || 0
      completed += row.completed || 0
      open += row.open || 0
      responded += row.responded || 0
      unresponded += row.unresponded || 0
    }

    const completedPct = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0'
    const openPct = total > 0 ? ((open / total) * 100).toFixed(1) : '0.0'
    const respondedPct = total > 0 ? ((responded / total) * 100).toFixed(1) : '0.0'
    const unrespondedPct = total > 0 ? ((unresponded / total) * 100).toFixed(1) : '0.0'

    return {
      total,
      completed,
      completedPct,
      open,
      openPct,
      responded,
      respondedPct,
      unresponded,
      unrespondedPct,
    }
  }, [data])

  // Filtered rows by search input
  const filteredData = useMemo(() => {
    if (!tableSearch.trim()) return data
    const q = tableSearch.toLowerCase().trim()
    return data.filter(
      (row) =>
        (row.office_code && String(row.office_code).toLowerCase().includes(q)) ||
        (row.office_name && String(row.office_name).toLowerCase().includes(q)),
    )
  }, [data, tableSearch])

  // Reset page when search or data changes
  useEffect(() => {
    setPage(1)
  }, [tableSearch, direction, filters])

  // Paginated data slice
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, page, pageSize])

  // Handlers
  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  const handleApply = () => {
    setRefreshKey((k) => k + 1)
  }

  // Export
  const handleExportExcel = () => {
    const filename = `Rekap_${direction === 'received' ? 'Terima' : 'Kirim'}_Kantor_${filters.from}_sd_${filters.to}`
    const rows = filteredData.map((r, i) => ({
      No: i + 1,
      'Kode Kantor': r.office_code,
      'Nama Kantor': r.office_name,
      'Total Pengaduan': r.total,
      'Selesai (109)': r.completed,
      '% Selesai': `${r.completed_percent ?? r.completed_pct ?? 0}%`,
      'Terbuka (101-103)': r.open,
      '% Terbuka': `${r.open_percent ?? r.open_pct ?? 0}%`,
      'Sudah Respon': r.responded,
      '% Sudah Respon': `${r.responded_percent ?? r.responded_pct ?? 0}%`,
      'Belum Respon': r.unresponded,
      '% Belum Respon': `${r.unresponded_percent ?? r.unresponded_pct ?? 0}%`,
    }))
    exportToExcel(rows, filename, 'Rekapitulasi Kantor')
  }

  const handleExportCsv = () => {
    const filename = `Rekap_${direction === 'received' ? 'Terima' : 'Kirim'}_Kantor_${filters.from}_sd_${filters.to}`
    const rows = filteredData.map((r, i) => ({
      No: i + 1,
      'Kode Kantor': r.office_code,
      'Nama Kantor': r.office_name,
      'Total Pengaduan': r.total,
      'Selesai (109)': r.completed,
      '% Selesai': `${r.completed_percent ?? r.completed_pct ?? 0}%`,
      'Terbuka (101-103)': r.open,
      '% Terbuka': `${r.open_percent ?? r.open_pct ?? 0}%`,
      'Sudah Respon': r.responded,
      '% Sudah Respon': `${r.responded_percent ?? r.responded_pct ?? 0}%`,
      'Belum Respon': r.unresponded,
      '% Belum Respon': `${r.unresponded_percent ?? r.unresponded_pct ?? 0}%`,
    }))
    exportToCsv(rows, filename)
  }

  const handlePrint = () => {
    const dirLabel = direction === 'received' ? 'Kantor Tujuan (Diterima)' : 'Kantor Asal (Dikirim)'
    const title = 'Laporan Rekapitulasi Pengaduan Per Kantor Pos'
    const subtitle = `Arah Aliran: ${dirLabel} • Periode: ${filters.from} s/d ${filters.to}`
    const metadata = [
      { label: 'Arah Aliran', value: dirLabel },
      { label: 'Periode Analisis', value: `${filters.from} s/d ${filters.to}` },
      { label: 'Filter Regional', value: filters.regional ? `Regional ${filters.regional}` : 'Semua Regional (Nasional)' },
      { label: 'Filter Kantor', value: filters.office || 'Semua Kantor' },
      { label: 'Hanya Tujuan Langsung', value: filters.hanya_tujuan ? 'Ya' : 'Tidak' },
    ]
    const kpis = [
      { label: 'Total Tiket Masuk', value: totals.total, tone: 'brand' },
      { label: 'Selesai (109)', value: totals.completed, tone: 'success' },
      { label: 'Tingkat Resolusi', value: totals.total > 0 ? `${Math.round((totals.completed / totals.total) * 100)}%` : '0%', tone: 'warning' },
      { label: 'Belum Respon', value: totals.unresponded, tone: 'danger' },
    ]
    const columns = [
      { header: 'No.', key: 'no' },
      { header: 'Kode', key: 'office_code' },
      { header: 'Nama Kantor Pos', key: 'office_name' },
      { header: 'Total Aduan', key: 'total' },
      { header: 'Selesai (109)', key: 'completed' },
      { header: '% Selesai', key: 'completed_pct', transform: (v, r) => `${r.completed_percent ?? r.completed_pct ?? 0}%` },
      { header: 'Terbuka', key: 'open' },
      { header: 'Sudah Respon', key: 'responded' },
      { header: 'Belum Respon', key: 'unresponded' },
      { header: '% Belum Respon', key: 'unresponded_pct', transform: (v, r) => `${r.unresponded_percent ?? r.unresponded_pct ?? 0}%` },
    ]
    printExecutiveReport({
      title,
      subtitle,
      metadata,
      kpis,
      columns,
      data: filteredData,
      notes: 'Rekapitulasi beban aduan per unit pelayanan PT Pos Indonesia (Persero).',
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="Laporan & Rekapitulasi Operasional POSIND"
        title="Rekapitulasi Pengaduan Per Kantor Pos"
        subtitle="Analisis agregasi kinerja penanganan aduan per kantor pos asal dan tujuan se-Indonesia (cch_rekap_terima & cch_rekap_kirim)."
      />

      {/* Direction Switcher Pill */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => setDirection('received')}
            className={cx(
              'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all',
              direction === 'received'
                ? 'bg-white text-blue-600 shadow-md dark:bg-slate-900 dark:text-blue-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
            )}
          >
            <ArrowDownLeft size={16} />
            Rekap Terima (Kantor Tujuan)
          </button>
          <button
            type="button"
            onClick={() => setDirection('sent')}
            className={cx(
              'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all',
              direction === 'sent'
                ? 'bg-white text-emerald-600 shadow-md dark:bg-slate-900 dark:text-emerald-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
            )}
          >
            <ArrowUpRight size={16} />
            Rekap Kirim (Kantor Asal)
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{filteredData.length} Kantor Pos Terdata</span>
        </div>
      </div>

      {/* Filter Bar */}
      <ReportFilterBar
        filters={filters}
        onChange={handleFilterChange}
        onApply={handleApply}
        onExportExcel={handleExportExcel}
        onExportCsv={handleExportCsv}
        onPrint={handlePrint}
        totalItems={filteredData.length}
        loading={loading}
        showOnlyTarget={direction === 'received'}
      />

      {/* 4 Summary StatCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Total Pengaduan"
          value={totals.total.toLocaleString('id-ID')}
          tone="blue"
          sublabel="Semua kantor pos terdaftar"
        />
        <StatCard
          icon={CheckCircle2}
          label="Selesai (Status 109)"
          value={`${totals.completed.toLocaleString('id-ID')} (${totals.completedPct}%)`}
          tone="emerald"
          sublabel="Telah ditutup tuntas"
        />
        <StatCard
          icon={Clock}
          label="Masih Terbuka (101-103)"
          value={`${totals.open.toLocaleString('id-ID')} (${totals.openPct}%)`}
          tone="amber"
          sublabel="Dalam penanganan aktif"
        />
        <StatCard
          icon={AlertCircle}
          label="Belum Respon (Lewat SLA)"
          value={`${totals.unresponded.toLocaleString('id-ID')} (${totals.unrespondedPct}%)`}
          tone="rose"
          sublabel="Butuh tindakan segera"
        />
      </div>

      {/* Main Table Card */}
      <Card className="overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode atau nama kantor..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs transition focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:bg-slate-800"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              Menampilkan <strong>{filteredData.length}</strong> kantor
            </span>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-3">Memuat rekapitulasi data kantor pos...</p>
          </div>
        ) : error ? (
          <div className="p-8">
            <StateBox tone="error" title="Gagal Memuat Data" message={error} />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12">
            <StateBox
              tone="empty"
              title="Tidak Ada Data Rekapitulasi"
              message="Tidak ditemukan rekaman pengaduan untuk periode dan filter kantor yang dipilih."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                <tr>
                  <th className="py-3.5 pl-4 pr-2 w-12 text-center">No</th>
                  <th className="px-3 py-3.5 w-28">Kode Kantor</th>
                  <th className="px-3 py-3.5 min-w-[200px]">Nama Kantor Pos</th>
                  <th className="px-3 py-3.5 text-right font-bold text-slate-900 dark:text-white">
                    Total
                  </th>
                  <th className="px-3 py-3.5 text-right text-emerald-700 dark:text-emerald-400">
                    Selesai (109)
                  </th>
                  <th className="px-3 py-3.5 text-right text-amber-700 dark:text-amber-400">
                    Terbuka (101-103)
                  </th>
                  <th className="px-3 py-3.5 text-right text-blue-700 dark:text-blue-400">
                    Sudah Respon
                  </th>
                  <th className="px-3 py-3.5 text-right pr-4 text-rose-700 dark:text-rose-400">
                    Belum Respon
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedData.map((row, idx) => {
                  const globalIdx = (page - 1) * pageSize + idx + 1
                  const completedPct = row.completed_percent ?? row.completed_pct ?? 0
                  const openPct = row.open_percent ?? row.open_pct ?? 0
                  const unrespPct = row.unresponded_percent ?? row.unresponded_pct ?? 0

                  return (
                    <tr
                      key={row.office_code || idx}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-3 pl-4 pr-2 text-center text-slate-400 font-mono">
                        {globalIdx}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {row.office_code}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {row.office_name}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                        {row.total?.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        <div>{row.completed?.toLocaleString('id-ID')}</div>
                        <div className="text-[10px] text-slate-400">({completedPct}%)</div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-amber-600 dark:text-amber-400">
                        <div>{row.open?.toLocaleString('id-ID')}</div>
                        <div className="text-[10px] text-slate-400">({openPct}%)</div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-blue-600 dark:text-blue-400">
                        <div>{row.responded?.toLocaleString('id-ID')}</div>
                        <div className="text-[10px] text-slate-400">
                          ({row.responded_percent ?? row.responded_pct ?? 0}%)
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right pr-4 font-mono text-rose-600 dark:text-rose-400">
                        <div className="font-semibold">
                          {row.unresponded?.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-slate-400">({unrespPct}%)</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filteredData.length > 0 && (
          <Pagination
            page={page}
            count={paginatedData.length}
            total={filteredData.length}
            perPage={pageSize}
            loading={loading}
            onPage={setPage}
            pageSizeOptions={[10, 25, 50, 100]}
            onPerPageChange={(newSize) => {
              setPageSize(newSize)
              setPage(1)
            }}
            label="kantor pos"
          />
        )}
      </Card>
    </div>
  )
}

