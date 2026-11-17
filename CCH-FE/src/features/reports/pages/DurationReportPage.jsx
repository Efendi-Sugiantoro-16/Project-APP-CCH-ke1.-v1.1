import { useContext, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  Eye,
  Filter,
  FileSpreadsheet,
  Inbox,
  Layers,
  Loader2,
  Printer,
  RefreshCw,
  Send,
  X,
  Zap,
} from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { complaintApi } from '../../complaints/api/complaintApi.js'
import { PageHeader } from '../../../shared/ui/PageHeader.jsx'
import { Card } from '../../../shared/ui/Card.jsx'
import { Button } from '../../../shared/ui/Button.jsx'
import { StatCard } from '../../../shared/ui/StatCard.jsx'
import { Pagination } from '../../../shared/ui/Pagination.jsx'
import { exportToExcel, exportToCsv, printExecutiveReport } from '../../../shared/utils/excelExport.js'
import { formatDateTime } from '../../complaints/format.js'
import { complaintDetailPath } from '../../complaints/complaintPath.js'

const STATUS_TABS = [
  { id: 'masih_terbuka', label: 'Masih Terbuka', color: 'emerald', desc: 'Tiket aktif yang belum selesai' },
  { id: 'belum_respon', label: 'Belum Respon', color: 'amber', desc: 'Tiket belum direspon kantor tujuan' },
  { id: 'sudah_respon', label: 'Sudah Respon', color: 'blue', desc: 'Tiket yang telah direspon pertama kali' },
  { id: 'sudah_selesai', label: 'Sudah Selesai', color: 'purple', desc: 'Tiket berstatus akhir 109 selesai' },
]

export function DurationReportPage() {
  const { token } = useContext(AuthContext)

  // Filters State
  const [direction, setDirection] = useState('received')
  const [status, setStatus] = useState('masih_terbuka')
  const [filters, setFilters] = useState(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 60)
    return {
      from: start.toISOString().split('T')[0],
      to: end.toISOString().split('T')[0],
      regional: '',
      product_code: '',
    }
  })

  // Options State
  const [regionalOptions, setRegionalOptions] = useState([])
  const [shippingServices, setShippingServices] = useState([])

  // Data State
  const [data, setData] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [detailPageSize, setDetailPageSize] = useState(25)
  const [detailPage, setDetailPage] = useState(1)

  // Drilldown Detail Modal State
  const [detailModal, setDetailModal] = useState({
    isOpen: false,
    officeCode: '',
    officeName: '',
    bucket: 'all',
    bucketLabel: '',
  })
  const [detailData, setDetailData] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)

  // Load Dropdown Options
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

  // Load Summary Data
  useEffect(() => {
    let active = true
    if (!token) return

    async function loadSummary() {
      setLoading(true)
      setError(null)
      try {
        const res = await complaintApi.listDurationSummary(token, {
          direction,
          status,
          from: filters.from,
          to: filters.to,
          regional: filters.regional,
          product_code: filters.product_code,
          limit: 200,
        })
        if (active) {
          setData(res.data || [])
          setSummary(res.summary || {})
        }
      } catch (err) {
        if (active) {
          setError(err?.message || 'Gagal memuat rekap durasi penanganan.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSummary()
    setPage(1)
    return () => {
      active = false
    }
  }, [token, direction, status, filters, refreshKey])

  // Load Drilldown Detail Data when Modal Opens
  useEffect(() => {
    let active = true
    if (!detailModal.isOpen || !token || !detailModal.officeCode) return

    async function loadDetail() {
      setDetailLoading(true)
      setDetailError(null)
      try {
        const res = await complaintApi.listDurationDetail(token, {
          direction,
          status,
          office_code: detailModal.officeCode,
          duration_bucket: detailModal.bucket,
          from: filters.from,
          to: filters.to,
          product_code: filters.product_code,
          limit: 100,
        })
        if (active) {
          setDetailData(res || [])
        }
      } catch (err) {
        if (active) {
          setDetailError(err?.message || 'Gagal memuat rincian tiket durasi.')
        }
      } finally {
        if (active) setDetailLoading(false)
      }
    }

    loadDetail()
    return () => {
      active = false
    }
  }, [detailModal, token, direction, status, filters])

  // Helpers
  const handleOpenDetail = (officeCode, officeName, bucket, bucketLabel) => {
    setDetailModal({
      isOpen: true,
      officeCode,
      officeName,
      bucket,
      bucketLabel,
    })
  }

  const handleCloseDetail = () => {
    setDetailModal((prev) => ({ ...prev, isOpen: false }))
    setDetailData([])
    setDetailError(null)
  }

  // Exports
  const handleExportSummaryExcel = () => {
    const filename = `Rekap_Durasi_${direction}_${status}_${filters.from}_sd_${filters.to}`
    const columns = [
      { header: 'No.', key: 'no' },
      { header: 'Kode Kantor', key: 'office_code' },
      { header: 'Nama Kantor', key: 'office_name' },
      { header: 'Total Pengaduan', key: 'total' },
      { header: '0 Hari (Jml)', key: 'day_zero' },
      { header: '0 Hari (%)', key: 'day_zero_pct', transform: (v) => `${v}%` },
      { header: '1 Hari (Jml)', key: 'day_one' },
      { header: '1 Hari (%)', key: 'day_one_pct', transform: (v) => `${v}%` },
      { header: '2 Hari (Jml)', key: 'day_two' },
      { header: '2 Hari (%)', key: 'day_two_pct', transform: (v) => `${v}%` },
      { header: '3 Hari (Jml)', key: 'day_three' },
      { header: '3 Hari (%)', key: 'day_three_pct', transform: (v) => `${v}%` },
      { header: '>= 4 Hari (Jml)', key: 'day_four_plus' },
      { header: '>= 4 Hari (%)', key: 'day_four_plus_pct', transform: (v) => `${v}%` },
    ]
    const exportRows = data.map((row, idx) => ({ ...row, no: idx + 1 }))
    if (summary && summary.total > 0) {
      exportRows.push({ ...summary, no: 'TOTAL' })
    }
    exportToExcel({
      filename,
      sheetName: 'Rekap Durasi',
      columns,
      data: exportRows,
    })
  }

  const handleExportSummaryCsv = () => {
    const filename = `Rekap_Durasi_${direction}_${status}_${filters.from}_sd_${filters.to}`
    const columns = [
      { header: 'No.', key: 'no' },
      { header: 'Kode Kantor', key: 'office_code' },
      { header: 'Nama Kantor', key: 'office_name' },
      { header: 'Total Pengaduan', key: 'total' },
      { header: '0 Hari (Jml)', key: 'day_zero' },
      { header: '0 Hari (%)', key: 'day_zero_pct', transform: (v) => `${v}%` },
      { header: '1 Hari (Jml)', key: 'day_one' },
      { header: '1 Hari (%)', key: 'day_one_pct', transform: (v) => `${v}%` },
      { header: '2 Hari (Jml)', key: 'day_two' },
      { header: '2 Hari (%)', key: 'day_two_pct', transform: (v) => `${v}%` },
      { header: '3 Hari (Jml)', key: 'day_three' },
      { header: '3 Hari (%)', key: 'day_three_pct', transform: (v) => `${v}%` },
      { header: '>= 4 Hari (Jml)', key: 'day_four_plus' },
      { header: '>= 4 Hari (%)', key: 'day_four_plus_pct', transform: (v) => `${v}%` },
    ]
    const exportRows = data.map((row, idx) => ({ ...row, no: idx + 1 }))
    exportToCsv({
      filename,
      columns,
      data: exportRows,
    })
  }

  const handleExportDetailExcel = () => {
    const filename = `Rincian_Durasi_${detailModal.officeCode}_${detailModal.bucket}_${filters.from}_sd_${filters.to}`
    const columns = [
      { header: 'No.', key: 'no' },
      { header: 'ID Pengaduan', key: 'complaint_id' },
      { header: 'Jenis Pengaduan', key: 'complaint_type' },
      { header: 'Nomor Kiriman (Resi)', key: 'shipment_number' },
      { header: 'Produk', key: 'product_code' },
      { header: 'Ringkasan', key: 'summary' },
      { header: 'Kantor Asal', key: 'source_office_code' },
      { header: 'Kantor Tujuan', key: 'target_office_code' },
      { header: 'Status Terakhir', key: 'latest_status_code' },
      { header: 'Kantor Update', key: 'latest_status_office' },
      { header: 'Tanggal Update', key: 'latest_status_at', transform: (v) => formatDateTime(v) },
      { header: 'Tanggal Pengaduan', key: 'created_at', transform: (v) => formatDateTime(v) },
      { header: 'Durasi (Hari)', key: 'duration_days' },
    ]
    const exportRows = detailData.map((row, idx) => ({ ...row, no: idx + 1 }))
    exportToExcel({
      filename,
      sheetName: 'Rincian Durasi',
      columns,
      data: exportRows,
    })
  }

  const handlePrint = () => {
    const dirLabel = direction === 'received' ? 'Pengaduan Diterima (Kantor Tujuan)' : 'Pengaduan Dikirim (Kantor Asal)'
    const statusTab = STATUS_TABS.find((s) => s.id === status)
    const title = 'Laporan Rekapitulasi Durasi Penanganan SLA'
    const subtitle = `Status: ${statusTab?.label || status} • Arah: ${dirLabel} • Periode: ${filters.from} s/d ${filters.to}`
    const metadata = [
      { label: 'Arah Aliran', value: dirLabel },
      { label: 'Status Analisis', value: statusTab?.label || status },
      { label: 'Periode Analisis', value: `${filters.from} s/d ${filters.to}` },
      { label: 'Filter Regional', value: filters.regional ? `Regional ${filters.regional}` : 'Semua Regional (Nasional)' },
      { label: 'Filter Layanan', value: filters.product_code || 'Semua Produk' },
    ]
    const kpis = [
      { label: 'Total Pengaduan', value: grandTotal, tone: 'brand' },
      { label: 'Respon Cepat (0-1 Hari)', value: `${fastTotal} (${grandTotal > 0 ? Math.round((fastTotal / grandTotal) * 100) : 0}%)`, tone: 'success' },
      { label: 'Respon Sedang (2-3 Hari)', value: `${medTotal} (${grandTotal > 0 ? Math.round((medTotal / grandTotal) * 100) : 0}%)`, tone: 'warning' },
      { label: 'Overdue (>= 4 Hari)', value: `${slowTotal} (${grandTotal > 0 ? Math.round((slowTotal / grandTotal) * 100) : 0}%)`, tone: 'danger' },
    ]
    const columns = [
      { header: 'No.', key: 'no' },
      { header: 'Kode', key: 'office_code' },
      { header: 'Nama Kantor Pos', key: 'office_name' },
      { header: 'Total Aduan', key: 'total' },
      { header: '0 Hari', key: 'day_zero' },
      { header: '% 0 Hari', key: 'day_zero_pct', transform: (v) => `${v}%` },
      { header: '1 Hari', key: 'day_one' },
      { header: '% 1 Hari', key: 'day_one_pct', transform: (v) => `${v}%` },
      { header: '2 Hari', key: 'day_two' },
      { header: '% 2 Hari', key: 'day_two_pct', transform: (v) => `${v}%` },
      { header: '3 Hari', key: 'day_three' },
      { header: '% 3 Hari', key: 'day_three_pct', transform: (v) => `${v}%` },
      { header: '>= 4 Hari', key: 'day_four_plus' },
      { header: '% >= 4 Hari', key: 'day_four_plus_pct', transform: (v) => `${v}%` },
    ]
    const exportRows = data.map((row, idx) => ({ ...row, no: idx + 1 }))
    if (summary && summary.total > 0) {
      exportRows.push({ ...summary, no: 'TOTAL' })
    }
    printExecutiveReport({
      title,
      subtitle,
      metadata,
      kpis,
      columns,
      data: exportRows,
      notes: 'Kelompok umur durasi penanganan pengaduan berpedoman pada standar Service Level Agreement (SLA) PT Pos Indonesia.',
    })
  }

  const handlePrintDetail = () => {
    const dirLabel = direction === 'received' ? 'Kantor Tujuan' : 'Kantor Asal'
    const title = `Rincian Pengaduan Durasi — ${detailModal.bucketLabel}`
    const subtitle = `Kantor: ${detailModal.officeName || detailModal.officeCode} (${detailModal.officeCode}) • Periode: ${filters.from} s/d ${filters.to}`
    const metadata = [
      { label: 'Kantor Terpilih', value: `${detailModal.officeName} (${detailModal.officeCode})` },
      { label: 'Kelompok Durasi', value: detailModal.bucketLabel },
      { label: 'Status Analisis', value: status },
      { label: 'Arah Aliran', value: dirLabel },
      { label: 'Periode Analisis', value: `${filters.from} s/d ${filters.to}` },
    ]
    const kpis = [
      { label: 'Jumlah Tiket', value: detailData.length, tone: 'brand' },
      { label: 'Status SLA', value: detailModal.bucketLabel, tone: detailModal.bucket === 'ge_4' ? 'danger' : 'success' },
    ]
    const columns = [
      { header: 'No.', key: 'no' },
      { header: 'ID Pengaduan', key: 'complaint_id' },
      { header: 'Jenis Aduan', key: 'complaint_type' },
      { header: 'Nomor Kiriman', key: 'shipment_number' },
      { header: 'Produk', key: 'product_code' },
      { header: 'Ringkasan', key: 'summary' },
      { header: 'Kantor Asal', key: 'source_office_code' },
      { header: 'Kantor Tujuan', key: 'target_office_code' },
      { header: 'Status Terakhir', key: 'latest_status_code' },
      { header: 'Tanggal Aduan', key: 'created_at', transform: (v) => formatDateTime(v) },
      { header: 'Durasi (Hari)', key: 'duration_days' },
    ]
    printExecutiveReport({
      title,
      subtitle,
      metadata,
      kpis,
      columns,
      data: detailData,
      notes: 'Rincian tiket pengaduan aktif berdasarkan drill-down kelompok durasi penanganan.',
    })
  }

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [data, page, pageSize])

  const paginatedDetailData = useMemo(() => {
    const start = (detailPage - 1) * detailPageSize
    return detailData.slice(start, start + detailPageSize)
  }, [detailData, detailPage, detailPageSize])

  const grandTotal = summary?.total || 0
  const fastTotal = (summary?.day_zero || 0) + (summary?.day_one || 0)
  const medTotal = (summary?.day_two || 0) + (summary?.day_three || 0)
  const slowTotal = summary?.day_four_plus || 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Laporan Operasional POSIND"
        title="Laporan Rekap & Rincian Durasi Penanganan (SLA)"
        subtitle="Analisis waktu penanganan pengaduan berdasarkan kelompok umur hari (0 s.d. ≥ 4 hari) dengan drill-down rincian tiket."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              disabled={loading || data.length === 0}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
            >
              <Printer size={14} className="mr-1.5" />
              Cetak / PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportSummaryCsv}
              disabled={loading || data.length === 0}
            >
              <Download size={14} className="mr-1.5" />
              CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportSummaryExcel}
              disabled={loading || data.length === 0}
            >
              <FileSpreadsheet size={14} className="mr-1.5" />
              Download Excel (.xlsx)
            </Button>
          </div>
        }
      />

      {/* Direction & Status Selector Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        {/* Direction Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setDirection('received')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              direction === 'received'
                ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Inbox size={14} />
            <span>Pengaduan Diterima (Terima)</span>
          </button>
          <button
            type="button"
            onClick={() => setDirection('sent')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              direction === 'sent'
                ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <Send size={14} />
            <span>Pengaduan Dikirim (Kirim)</span>
          </button>
        </div>

        {/* Status Mode Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map((tab) => {
            const isActive = status === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatus(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-600'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
                title={tab.desc}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filter Controls Card */}
      <Card>
        <div className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                <Calendar size={13} className="inline mr-1 text-slate-400" />
                Periode Awal
              </label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                <Calendar size={13} className="inline mr-1 text-slate-400" />
                Periode Akhir
              </label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                <Filter size={13} className="inline mr-1 text-slate-400" />
                Regional POSIND
              </label>
              <select
                value={filters.regional}
                onChange={(e) => setFilters((prev) => ({ ...prev, regional: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="">(Semua Regional)</option>
                {regionalOptions.map((reg) => (
                  <option key={reg.code || reg.id} value={reg.code || reg.id}>
                    {reg.name || `Regional ${reg.code}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                <Layers size={13} className="inline mr-1 text-slate-400" />
                Jenis Kiriman / Produk
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={filters.product_code}
                  onChange={(e) => setFilters((prev) => ({ ...prev, product_code: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="">(Semua Produk)</option>
                  {shippingServices.map((svc) => (
                    <option key={svc.code || svc.id} value={svc.code || svc.id}>
                      {svc.code} - {svc.name || svc.description}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRefreshKey((k) => k + 1)}
                  disabled={loading}
                  title="Segarkan data"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={`Total Pengaduan (${direction === 'sent' ? 'Kirim' : 'Terima'})`}
          value={grandTotal}
          icon={Clock}
          tone="brand"
        />
        <StatCard
          label="Cepat (0 - 1 Hari)"
          value={fastTotal}
          caption={`${grandTotal > 0 ? ((fastTotal * 100) / grandTotal).toFixed(1) : 0}% dari total`}
          icon={Zap}
          tone="emerald"
        />
        <StatCard
          label="Sedang (2 - 3 Hari)"
          value={medTotal}
          caption={`${grandTotal > 0 ? ((medTotal * 100) / grandTotal).toFixed(1) : 0}% dari total`}
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Kritis / Lambat (≥ 4 Hari)"
          value={slowTotal}
          caption={`${grandTotal > 0 ? ((slowTotal * 100) / grandTotal).toFixed(1) : 0}% melebih batas`}
          icon={AlertCircle}
          tone="rose"
        />
      </div>

      {/* Main Summary Table */}
      <Card>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin text-blue-600" />
              <p className="text-xs font-semibold">Memuat rekapitulasi durasi penanganan…</p>
            </div>
          ) : error ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="rounded-full bg-red-50 p-3 text-red-600 dark:bg-red-950/50">
                <AlertCircle size={28} />
              </div>
              <p className="text-xs text-red-600 font-medium">{error}</p>
              <Button variant="secondary" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
                Coba Lagi
              </Button>
            </div>
          ) : data.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Clock size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Tidak ada data durasi untuk filter yang dipilih
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Silakan ubah rentang tanggal atau pilih regional lain.
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                  <th rowSpan={2} className="py-3 px-3 text-center w-12 border-r border-slate-200 dark:border-slate-800">
                    No.
                  </th>
                  <th rowSpan={2} className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 min-w-[200px]">
                    {direction === 'sent' ? 'Kantor Asal Pengirim' : 'Kantor Tujuan / Penanganan'}
                  </th>
                  <th rowSpan={2} className="py-3 px-3 text-right border-r border-slate-200 dark:border-slate-800 min-w-[80px]">
                    Total
                  </th>
                  <th colSpan={2} className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                    0 Hari
                  </th>
                  <th colSpan={2} className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800 bg-sky-50/50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-300">
                    1 Hari
                  </th>
                  <th colSpan={2} className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
                    2 Hari
                  </th>
                  <th colSpan={2} className="py-2 px-3 text-center border-r border-slate-200 dark:border-slate-800 bg-orange-50/50 dark:bg-orange-950/20 text-orange-800 dark:text-orange-300">
                    3 Hari
                  </th>
                  <th colSpan={2} className="py-2 px-3 text-center bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300">
                    ≥ 4 Hari
                  </th>
                </tr>
                <tr className="border-b border-slate-200 bg-slate-100/60 font-semibold text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                  <th className="py-1.5 px-2 text-right">Jml</th>
                  <th className="py-1.5 px-2 text-right border-r border-slate-200 dark:border-slate-800">%</th>
                  <th className="py-1.5 px-2 text-right">Jml</th>
                  <th className="py-1.5 px-2 text-right border-r border-slate-200 dark:border-slate-800">%</th>
                  <th className="py-1.5 px-2 text-right">Jml</th>
                  <th className="py-1.5 px-2 text-right border-r border-slate-200 dark:border-slate-800">%</th>
                  <th className="py-1.5 px-2 text-right">Jml</th>
                  <th className="py-1.5 px-2 text-right border-r border-slate-200 dark:border-slate-800">%</th>
                  <th className="py-1.5 px-2 text-right">Jml</th>
                  <th className="py-1.5 px-2 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedData.map((row, idx) => (
                  <tr
                    key={row.office_code}
                    className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 border-r border-slate-100 dark:border-slate-800/60 font-mono text-[11px]">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 dark:border-slate-800/60">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {row.office_name || row.office_code}
                      </div>
                      <div className="mono text-[11px] text-slate-400">{row.office_code}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(row.office_code, row.office_name, 'all', 'Semua Durasi')}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                        title="Lihat semua tiket kantor ini"
                      >
                        {row.total}
                      </button>
                    </td>

                    {/* 0 Hari */}
                    <td className="py-2.5 px-2 text-right text-emerald-700 dark:text-emerald-400 font-medium">
                      {row.day_zero > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(row.office_code, row.office_name, '0', '0 Hari')}
                          className="hover:underline font-bold"
                        >
                          {row.day_zero}
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right text-[11px] text-slate-400 border-r border-slate-100 dark:border-slate-800/60">
                      {row.day_zero_pct}%
                    </td>

                    {/* 1 Hari */}
                    <td className="py-2.5 px-2 text-right text-sky-700 dark:text-sky-400 font-medium">
                      {row.day_one > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(row.office_code, row.office_name, '1', '1 Hari')}
                          className="hover:underline font-bold"
                        >
                          {row.day_one}
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right text-[11px] text-slate-400 border-r border-slate-100 dark:border-slate-800/60">
                      {row.day_one_pct}%
                    </td>

                    {/* 2 Hari */}
                    <td className="py-2.5 px-2 text-right text-amber-700 dark:text-amber-400 font-medium">
                      {row.day_two > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(row.office_code, row.office_name, '2', '2 Hari')}
                          className="hover:underline font-bold"
                        >
                          {row.day_two}
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right text-[11px] text-slate-400 border-r border-slate-100 dark:border-slate-800/60">
                      {row.day_two_pct}%
                    </td>

                    {/* 3 Hari */}
                    <td className="py-2.5 px-2 text-right text-orange-700 dark:text-orange-400 font-medium">
                      {row.day_three > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(row.office_code, row.office_name, '3', '3 Hari')}
                          className="hover:underline font-bold"
                        >
                          {row.day_three}
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right text-[11px] text-slate-400 border-r border-slate-100 dark:border-slate-800/60">
                      {row.day_three_pct}%
                    </td>

                    {/* >= 4 Hari */}
                    <td className="py-2.5 px-2 text-right text-rose-700 dark:text-rose-400 font-bold">
                      {row.day_four_plus > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(row.office_code, row.office_name, '4_plus', '≥ 4 Hari')}
                          className="hover:underline"
                        >
                          {row.day_four_plus}
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right text-[11px] text-slate-400">
                      {row.day_four_plus_pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Grand Total Footer */}
              {summary && summary.total > 0 ? (
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                    <td colSpan={2} className="py-3 px-3 text-right uppercase tracking-wider text-[11px]">
                      TOTAL KESELURUHAN:
                    </td>
                    <td className="py-3 px-3 text-right font-black text-sm text-blue-600 dark:text-blue-400 border-r border-slate-200 dark:border-slate-700">
                      {summary.total}
                    </td>
                    <td className="py-3 px-2 text-right text-emerald-700 dark:text-emerald-400">
                      {summary.day_zero}
                    </td>
                    <td className="py-3 px-2 text-right text-[11px] text-slate-500 border-r border-slate-200 dark:border-slate-700">
                      {summary.day_zero_pct}%
                    </td>
                    <td className="py-3 px-2 text-right text-sky-700 dark:text-sky-400">
                      {summary.day_one}
                    </td>
                    <td className="py-3 px-2 text-right text-[11px] text-slate-500 border-r border-slate-200 dark:border-slate-700">
                      {summary.day_one_pct}%
                    </td>
                    <td className="py-3 px-2 text-right text-amber-700 dark:text-amber-400">
                      {summary.day_two}
                    </td>
                    <td className="py-3 px-2 text-right text-[11px] text-slate-500 border-r border-slate-200 dark:border-slate-700">
                      {summary.day_two_pct}%
                    </td>
                    <td className="py-3 px-2 text-right text-orange-700 dark:text-orange-400">
                      {summary.day_three}
                    </td>
                    <td className="py-3 px-2 text-right text-[11px] text-slate-500 border-r border-slate-200 dark:border-slate-700">
                      {summary.day_three_pct}%
                    </td>
                    <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400">
                      {summary.day_four_plus}
                    </td>
                    <td className="py-3 px-2 text-right text-[11px] text-slate-500">
                      {summary.day_four_plus_pct}%
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          )}
        </div>

        {!loading && !error && data.length > 0 && (
          <Pagination
            page={page}
            count={paginatedData.length}
            total={data.length}
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

      {/* Drilldown Detail Modal */}
      {detailModal.isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/50">
                  <Clock size={20} />
                </span>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                    Rincian Tiket Pengaduan — Durasi {detailModal.bucketLabel}
                  </h3>
                  <p className="mono text-xs text-slate-400">
                    Kantor: {detailModal.officeName || detailModal.officeCode} ({detailModal.officeCode}) · Status: {status}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePrintDetail}
                  disabled={detailLoading || detailData.length === 0}
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
                >
                  <Printer size={14} className="mr-1.5" />
                  Cetak / PDF
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportDetailExcel}
                  disabled={detailLoading || detailData.length === 0}
                >
                  <FileSpreadsheet size={14} className="mr-1.5" />
                  Export Excel
                </Button>
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Tutup"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 overflow-auto p-4 bg-slate-50 dark:bg-slate-950/40">
              {detailLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 size={32} className="animate-spin text-blue-600" />
                  <p className="text-xs font-semibold">Memuat rincian tiket durasi…</p>
                </div>
              ) : detailError ? (
                <div className="p-8 text-center text-red-600 text-xs font-medium">
                  {detailError}
                </div>
              ) : detailData.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Tidak ada tiket pengaduan ditemukan untuk kriteria ini.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">No.</th>
                        <th className="py-2.5 px-3 min-w-[140px]">ID Pengaduan</th>
                        <th className="py-2.5 px-3 min-w-[120px]">Resi / Kiriman</th>
                        <th className="py-2.5 px-3 min-w-[160px]">Jenis & Ringkasan</th>
                        <th className="py-2.5 px-3 min-w-[100px]">Asal / Tujuan</th>
                        <th className="py-2.5 px-3 text-center min-w-[100px]">Status Terakhir</th>
                        <th className="py-2.5 px-3 min-w-[110px]">Tgl Pengaduan</th>
                        <th className="py-2.5 px-3 text-right min-w-[90px]">Durasi</th>
                        <th className="py-2.5 px-3 text-center w-12">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {paginatedDetailData.map((row, idx) => {
                        const globalDetailIdx = (detailPage - 1) * detailPageSize + idx + 1
                        const isCompleted = row.final_status_code === '109'
                        const detailUrl = complaintDetailPath({
                          id: row.complaint_id,
                          status_code: row.latest_status_code || row.final_status_code || row.status_code,
                        })
                        const rowKey = `${row.complaint_id || 'duration'}-${row.office_code || row.target_office_code || ''}-${idx}`

                        return (
                          <tr key={rowKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-3 text-center text-slate-400 mono text-[11px]">
                              {globalDetailIdx}
                            </td>
                            <td className="py-2 px-3">
                              <Link
                                to={detailUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 dark:text-blue-400"
                              >
                                {row.complaint_id}
                                <ExternalLink size={11} className="opacity-70" />
                              </Link>
                            </td>
                            <td className="py-2 px-3 mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              {row.shipment_number || '-'}
                              {row.product_code ? (
                                <span className="ml-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800">
                                  {row.product_code}
                                </span>
                              ) : null}
                            </td>
                            <td className="py-2 px-3 max-w-xs truncate" title={row.summary}>
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {row.complaint_type || '-'}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {row.summary || '-'}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-[11px]">
                              <div>Asal: <span className="mono font-semibold">{row.source_office_code}</span></div>
                              <div>Tujuan: <span className="mono font-semibold">{row.target_office_code}</span></div>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {row.latest_status_code || row.final_status_code}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-500">
                              {formatDateTime(row.created_at)}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                                  row.duration_days >= 4
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                    : row.duration_days >= 2
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                }`}
                              >
                                {row.duration_days} Hari
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Link
                                to={detailUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                title="Buka Detail Tiket"
                              >
                                <Eye size={14} />
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>

                  {detailData.length > 0 && (
                    <div className="mt-3">
                      <Pagination
                        page={detailPage}
                        count={paginatedDetailData.length}
                        total={detailData.length}
                        perPage={detailPageSize}
                        loading={detailLoading}
                        onPage={setDetailPage}
                        pageSizeOptions={[10, 25, 50, 100]}
                        onPerPageChange={(newSize) => {
                          setDetailPageSize(newSize)
                          setDetailPage(1)
                        }}
                        label="tiket durasi"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
