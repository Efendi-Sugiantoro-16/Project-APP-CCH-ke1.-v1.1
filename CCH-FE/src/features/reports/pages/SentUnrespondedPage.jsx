import { useState, useContext, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Send,
  ShieldAlert,
} from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { complaintApi } from '../../complaints/api/complaintApi.js'
import { PageHeader } from '../../../shared/ui/PageHeader.jsx'
import { Card } from '../../../shared/ui/Card.jsx'
import { Pagination } from '../../../shared/ui/Pagination.jsx'
import { StateBox } from '../../../shared/ui/StateBox.jsx'
import { StatCard } from '../../../shared/ui/StatCard.jsx'
import { ReportFilterBar } from '../components/ReportFilterBar.jsx'
import { exportToExcel, exportToCsv, printExecutiveReport } from '../../../shared/utils/excelExport.js'
import { formatDateTime } from '../../complaints/format.js'

const PAGE_SIZE = 50

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0 hari'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (days > 0) {
    return `${days} hari ${hours} jam`
  }
  if (hours > 0) {
    return `${hours} jam ${mins} mnt`
  }
  return `${mins} menit`
}

export function SentUnrespondedPage() {
  const { token } = useContext(AuthContext)

  // Default dates: start of current month until today
  const today = useMemo(() => new Date(), [])
  const firstDay = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today])
  const formatDate = (d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [filters, setFilters] = useState({
    from: formatDate(firstDay),
    to: formatDate(today),
    regional: '',
    office: '',
    product_code: '',
  })

  const [offset, setOffset] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    if (!token) return

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const items = await complaintApi.listSentUnresponded(token, {
          from: filters.from,
          to: filters.to,
          product_code: filters.product_code,
          regional: filters.regional,
          office: filters.office,
          limit: pageSize,
          offset,
        })
        if (active) {
          setData(items || [])
        }
      } catch (err) {
        if (active) {
          setError(err?.message || 'Gagal memuat rincian belum respon.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [token, filters, offset, pageSize, refreshKey])

  // Calculation for stats
  const totalCount = data.length
  const overdueCount = data.filter((row) => (row.duration_seconds || 0) >= 345600).length
  const warningCount = data.filter((row) => {
    const s = row.duration_seconds || 0
    return s >= 172800 && s < 345600
  }).length
  const freshCount = totalCount - overdueCount - warningCount

  // Export Columns definition
  const exportColumns = [
    { header: 'No.', key: 'no' },
    { header: 'ID Pengaduan', key: 'complaint_id' },
    { header: 'Jenis Kiriman', key: 'shipment_type_code' },
    { header: 'Nomor Kiriman (Resi)', key: 'shipment_number' },
    { header: 'Kantor Tujuan', key: 'shipment_destination_office_code' },
    { header: 'Status Terakhir', key: 'latest_status_code', transform: (val, row) => `${val || '101'} - ${row.latest_status_description || 'Belum Direspon'}` },
    { header: 'Kantor Update', key: 'latest_status_office_code' },
    { header: 'Tanggal Update', key: 'latest_status_at', transform: (val) => formatDateTime(val) },
    { header: 'Durasi Total', key: 'duration_seconds', transform: (val) => formatDuration(val) },
    { header: 'Tanggal Tambah', key: 'complaint_created_at', transform: (val) => formatDateTime(val) },
  ]

  const handleExportExcel = () => {
    const filename = `Rincian_Kirim_Belum_Respon_${filters.from}_sd_${filters.to}`
    exportToExcel({
      filename,
      sheetName: 'Kirim Belum Respon',
      columns: exportColumns,
      data,
    })
  }

  const handleExportCsv = () => {
    const filename = `Rincian_Kirim_Belum_Respon_${filters.from}_sd_${filters.to}`
    exportToCsv({
      filename,
      columns: exportColumns,
      data,
    })
  }

  const handlePrint = () => {
    const title = 'Laporan Rincian Pengaduan Dikirim (Status Belum Respon)'
    const subtitle = `Periode: ${filters.from} s/d ${filters.to}`
    const metadata = [
      { label: 'Arah Aliran', value: 'Pengaduan Dikirim (Kantor Asal)' },
      { label: 'Status Analisis', value: 'Belum Respon' },
      { label: 'Periode Analisis', value: `${filters.from} s/d ${filters.to}` },
      { label: 'Filter Regional', value: filters.regional ? `Regional ${filters.regional}` : 'Semua Regional (Nasional)' },
      { label: 'Filter Kantor', value: filters.office || 'Semua Kantor' },
      { label: 'Filter Layanan', value: filters.product_code || 'Semua Produk' },
    ]
    const kpis = [
      { label: 'Total Belum Respon', value: totalCount, tone: 'brand' },
      { label: 'Kritis (>= 4 Hari)', value: overdueCount, tone: 'danger' },
      { label: 'Perlu Perhatian (2-3 Hari)', value: warningCount, tone: 'warning' },
      { label: 'Baru Dikirim (< 2 Hari)', value: freshCount, tone: 'success' },
    ]
    printExecutiveReport({
      title,
      subtitle,
      metadata,
      kpis,
      columns: exportColumns,
      data,
      notes: 'Tiket pengaduan yang dikirimkan oleh unit asal dan belum memperoleh respon dari unit tujuan.',
    })
  }

  return (
    <div>
      <PageHeader
        eyebrow="Laporan Operasional POSIND"
        title="Rincian Pengaduan Dikirim (Status Belum Direspon)"
        subtitle="Rincian tiket pengaduan yang diajukan oleh kantor asal dan belum direspon oleh unit tujuan (Legacy #24 Parity)."
      />

      {/* KPI Stats Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          label="Total Belum Respon"
          value={totalCount}
          icon={Send}
          tone="indigo"
        />
        <StatCard
          label="Kritis (≥ 4 Hari)"
          value={overdueCount}
          icon={AlertTriangle}
          tone="red"
        />
        <StatCard
          label="Perlu Perhatian (2-3 Hari)"
          value={warningCount}
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Baru Masuk (< 2 Hari)"
          value={freshCount}
          icon={Send}
          tone="green"
        />
      </div>

      {/* Filter and Export Bar */}
      <ReportFilterBar
        filters={filters}
        onChange={(newFilters) => {
          setFilters(newFilters)
          setOffset(0)
        }}
        onApply={() => {
          setOffset(0)
          setRefreshKey((k) => k + 1)
        }}
        onExportExcel={handleExportExcel}
        onExportCsv={handleExportCsv}
        onPrint={handlePrint}
        totalItems={totalCount}
        loading={loading}
      />

      {/* Main Table Card */}
      <Card>
        <StateBox
          loading={loading}
          error={error}
          loadingLabel="Memuat rincian pengaduan kirim belum respon…"
          isEmpty={!loading && data.length === 0}
          empty={
            <div className="state-box border-0 shadow-none py-12">
              <ShieldAlert size={36} className="text-slate-400 dark:text-slate-500 mb-2" />
              <strong className="text-base text-slate-700 dark:text-slate-200">
                Tidak ada data pengaduan belum respon
              </strong>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Semua pengaduan yang dikirim pada periode dan lingkup kantor yang dipilih telah direspon oleh kantor tujuan.
              </span>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                <tr>
                  <th scope="col" className="w-12 px-3 py-3 text-center">No.</th>
                  <th scope="col" className="px-4 py-3">ID Pengaduan</th>
                  <th scope="col" className="px-3 py-3">Jenis Layanan</th>
                  <th scope="col" className="px-3 py-3">No. Kiriman (Resi)</th>
                  <th scope="col" className="px-3 py-3">Kantor Tujuan</th>
                  <th scope="col" className="px-3 py-3">Status Terakhir</th>
                  <th scope="col" className="px-3 py-3">Kantor Update</th>
                  <th scope="col" className="px-3 py-3">Tanggal Update</th>
                  <th scope="col" className="px-3 py-3 text-right">Durasi Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.map((item, idx) => {
                  const isOverdue = (item.duration_seconds || 0) >= 345600
                  const isWarning = !isOverdue && (item.duration_seconds || 0) >= 172800

                  return (
                    <tr
                      key={`${item.complaint_id || 'unresponded'}-${item.office_code || item.target_office_code || ''}-${idx}`}
                      className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                        isOverdue ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="px-3 py-3 text-center text-slate-400">
                        {offset + idx + 1}
                      </td>

                      <td className="px-4 py-3 font-semibold text-red-600 dark:text-red-400">
                        <Link
                          to={`/workspace/complaints/open/${item.complaint_id}`}
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          {item.complaint_id}
                          <ExternalLink size={11} className="opacity-60" />
                        </Link>
                      </td>

                      <td className="px-3 py-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {item.shipment_type_code || '-'}
                        </span>
                      </td>

                      <td className="px-3 py-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {item.shipment_number || '-'}
                      </td>

                      <td className="px-3 py-3 font-medium text-slate-700 dark:text-slate-300">
                        {item.shipment_destination_office_code || item.origin_office_update_code || '-'}
                      </td>

                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          {item.latest_status_code || '101'} - {item.latest_status_description || 'Belum Direspon'}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                        {item.latest_status_office_code || '-'}
                      </td>

                      <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                        {formatDateTime(item.latest_status_at)}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <span
                          className={`font-semibold ${
                            isOverdue
                              ? 'text-red-600 dark:text-red-400 font-bold'
                              : isWarning
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {formatDuration(item.duration_seconds)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            offset={offset}
            count={data.length}
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
        </StateBox>
      </Card>
    </div>
  )
}
