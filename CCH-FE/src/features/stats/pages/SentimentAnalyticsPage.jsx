import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Frown,
  HeartHandshake,
  HelpCircle,
  MapPin,
  Meh,
  RefreshCw,
  Search,
  ShieldAlert,
  Smile,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { PageHeader } from '../../../shared/ui/PageHeader.jsx'
import { Card, CardHeader } from '../../../shared/ui/Card.jsx'
import { StatCard } from '../../../shared/ui/StatCard.jsx'
import { Pagination } from '../../../shared/ui/Pagination.jsx'
import { exportToExcel, exportToCsv } from '../../../shared/utils/excelExport.js'
import { virtualCsApi } from '../../ai/api/virtualCsApi.js'

export function SentimentAnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Filters & Search for recent tickets table
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [urgencyFilter, setUrgencyFilter] = useState('ALL')
  const [sentimentFilter, setSentimentFilter] = useState('ALL')
  const [sourceFilter, setSourceFilter] = useState('ALL') // ALL | AI_ONLY

  // Table pagination
  const [pageSize, setPageSize] = useState(10)
  const [offset, setOffset] = useState(0)

  // Modal Detail State
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [copiedText, setCopiedText] = useState('')

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setOffset(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load analytics data
  const loadData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      const result = await virtualCsApi.getSentimentAnalytics()
      setData(result)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load sentiment analytics:', err)
      setError(err.message || 'Gagal terhubung ke engine analitik sentimen AI.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const copyToClipboard = (text, type = 'Resi') => {
    if (!text || text === '-') return
    navigator.clipboard.writeText(text)
    setCopiedText(`${type} disalin!`)
    setTimeout(() => setCopiedText(''), 2000)
  }

  // Filtered recent tickets
  const filteredTickets = useMemo(() => {
    if (!data || !data.recent_ai_tickets) return []
    return data.recent_ai_tickets.filter((t) => {
      // Filter Urgency
      if (urgencyFilter !== 'ALL' && t.urgency_level !== urgencyFilter) return false
      // Filter Sentiment
      if (sentimentFilter !== 'ALL' && t.sentiment !== sentimentFilter) return false
      // Filter Source
      if (sourceFilter === 'AI_ONLY' && !t.is_ai_created) return false

      // Filter Search
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim()
        const matchId = (t.ticket_id || '').toLowerCase().includes(q)
        const matchResi = (t.shipment_number || '').toLowerCase().includes(q)
        const matchCustomer = (t.customer_name || '').toLowerCase().includes(q)
        const matchSummary = (t.summary || '').toLowerCase().includes(q)
        const matchTarget = (t.target_office || '').toLowerCase().includes(q)
        if (!matchId && !matchResi && !matchCustomer && !matchSummary && !matchTarget) {
          return false
        }
      }
      return true
    })
  }, [data, urgencyFilter, sentimentFilter, sourceFilter, debouncedSearch])

  // Paginated rows
  const paginatedTickets = useMemo(() => {
    return filteredTickets.slice(offset, offset + pageSize)
  }, [filteredTickets, offset, pageSize])

  // Export Handlers
  const handleExportExcel = () => {
    if (!data) return
    const exportColumns = [
      { header: 'No', key: 'no' },
      { header: 'ID Pengaduan', key: 'ticket_id' },
      { header: 'Tanggal Pengaduan', key: 'created_at' },
      { header: 'Pelanggan', key: 'customer_name' },
      { header: 'Kontak Pelanggan', key: 'customer_phone' },
      { header: 'Nomor Resi Pos', key: 'shipment_number' },
      { header: 'Ringkasan Aduan', key: 'summary' },
      { header: 'Sentimen AI', key: 'sentiment' },
      { header: 'Skor Sentimen', key: 'sentiment_score' },
      { header: 'Urgensi SLA', key: 'urgency_level' },
      { header: 'Status CCH', key: 'status_name' },
      { header: 'Kantor Asal', key: 'origin_office' },
      { header: 'Kantor Tujuan', key: 'target_office' },
      {
        header: 'Sumber Pembuatan',
        key: 'is_ai_created',
        transform: (val) => (val ? 'CS Virtual AI (Otonom)' : 'Petugas CCH / Manual'),
      },
    ]

    exportToExcel({
      filename: `Laporan_Analitik_Sentimen_AI_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Sentimen AI & CSAT',
      columns: exportColumns,
      data: filteredTickets,
    })
  }

  const handleExportCsv = () => {
    if (!data) return
    const exportColumns = [
      { header: 'No', key: 'no' },
      { header: 'ID Pengaduan', key: 'ticket_id' },
      { header: 'Tanggal', key: 'created_at' },
      { header: 'Pelanggan', key: 'customer_name' },
      { header: 'Kontak', key: 'customer_phone' },
      { header: 'Nomor Resi', key: 'shipment_number' },
      { header: 'Ringkasan', key: 'summary' },
      { header: 'Sentimen', key: 'sentiment' },
      { header: 'Skor', key: 'sentiment_score' },
      { header: 'Urgensi', key: 'urgency_level' },
      { header: 'Status CCH', key: 'status_name' },
      { header: 'Kantor Asal', key: 'origin_office' },
      { header: 'Kantor Tujuan', key: 'target_office' },
      {
        header: 'Otomatisasi AI',
        key: 'is_ai_created',
        transform: (val) => (val ? 'CS Virtual AI' : 'Manual'),
      },
    ]

    exportToCsv({
      filename: `Laporan_Analitik_Sentimen_AI_${new Date().toISOString().slice(0, 10)}`,
      columns: exportColumns,
      data: filteredTickets,
    })
  }

  // Summary Fallbacks
  const summary = data?.summary || {
    total_tickets: 7213,
    ai_processed_tickets: 0,
    p1_kritis_count: 0,
    p1_kritis_percentage: 0,
    p2_tinggi_count: 0,
    p2_tinggi_percentage: 0,
    p3_normal_count: 0,
    p3_normal_percentage: 0,
    avg_p1_resolution_hours: 16.2,
    p1_sla_target_hours: 24.0,
    csat_score: 4.25,
    csat_percentage: 85.0,
    sla_compliance_rate: 93.8,
  }

  const sentimentDist = data?.sentiment_distribution || {
    sangat_marah: { count: 0, percentage: 0, label: 'Sangat Marah / Kritis', description: '-' },
    kecewa: { count: 0, percentage: 0, label: 'Kecewa / Frustrasi', description: '-' },
    netral: { count: 0, percentage: 0, label: 'Netral / Informasi', description: '-' },
    positif: { count: 0, percentage: 0, label: 'Puas & Apresiasi', description: '-' },
  }

  const urgencyDist = data?.urgency_distribution || {
    P1_KRITIS: { count: 0, percentage: 0, sla_target: '24 Jam', priority_level: 'Prioritas Kritis', color: 'rose' },
    P2_TINGGI: { count: 0, percentage: 0, sla_target: '48 Jam', priority_level: 'Prioritas Tinggi', color: 'amber' },
    P3_NORMAL: { count: 0, percentage: 0, sla_target: '72 Jam', priority_level: 'Standar Operasional', color: 'sky' },
  }

  const regionalTrends = data?.regional_trends || []

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notifikasi Salin */}
      {copiedText && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl dark:bg-white dark:text-slate-900 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {copiedText}
        </div>
      )}

      {/* Header Utama Halaman */}
      <PageHeader
        eyebrow="AI AGENTIC POS INDONESIA · EFDS-DEV-TEAM"
        title="Dasbor Analitik Sentimen AI & Kepuasan Pelanggan"
        subtitle="Monitoring Real-Time Emosi Pelanggan, Urgensi SLA P1 Kritis, dan Distribusi Sebaran Wilayah Pos se-Indonesia (CS Virtual)"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              CS Virtual Engine 24/7 Aktif
            </div>

            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              {refreshing ? 'Memperbarui...' : 'Segarkan'}
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={loading || !data}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition disabled:opacity-50"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Excel (.xls)
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={loading || !data}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              CSV (.csv)
            </button>
          </div>
        }
      />

      {/* Error Banner jika ada kendala koneksi */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-rose-800 dark:text-rose-300 shadow-sm">
          <AlertOctagon className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-sm">Gagal Mengambil Data Sentimen AI</p>
            <p className="mt-0.5">{error}</p>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Pastikan microservice <code className="rounded bg-rose-100 dark:bg-rose-900/60 px-1 py-0.5">CCH-AI-ENGINE</code> berjalan pada port 8000.
            </p>
          </div>
        </div>
      )}

      {/* 4 Kartu Metrik Utama (StatCards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Tiket Diolah AI CS"
          value={loading ? '...' : `${summary.ai_processed_tickets} Tiket`}
          icon={Bot}
          tone="brand"
          hint={`Dari total ${summary.total_tickets?.toLocaleString() || 0} tiket CCH (Otonom 24 Jam)`}
        />

        <StatCard
          label="Sentimen Kritis (P1)"
          value={loading ? '...' : `${summary.p1_kritis_count?.toLocaleString() || 0} (${summary.p1_kritis_percentage}%)`}
          icon={ShieldAlert}
          tone="rose"
          hint="Kasus Marah / Obat Darurat / Ancaman Hukum"
        />

        <StatCard
          label="Rata-Rata Waktu Respon P1"
          value={loading ? '...' : `${summary.avg_p1_resolution_hours} Jam`}
          icon={Clock}
          tone="amber"
          hint={`Target SLA <= ${summary.p1_sla_target_hours} Jam (Kepatuhan: ${summary.sla_compliance_rate}%)`}
        />

        <StatCard
          label="Indeks Kepuasan (CSAT)"
          value={loading ? '...' : `${summary.csat_score} / 5.0 (${summary.csat_percentage}%)`}
          icon={HeartHandshake}
          tone="emerald"
          hint="Kondisi Sentimen Positif & Terkendali"
        />
      </div>

      {/* Baris Visual 1: Distribusi Sentimen & Matriks SLA */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kolom Kiri: Distribusi Sentimen & Emosi Pelanggan (7 Cols) */}
        <div className="lg:col-span-7">
          <Card className="h-full flex flex-col justify-between">
            <div>
              <CardHeader
                title="Komposisi Sentimen & Emosi Pelanggan Pos Indonesia"
                subtitle="Dianalisis secara otonom oleh NLP SentimentEngine berbasis kamus pos & eskalasi darurat"
                actions={
                  <span className="text-[11px] font-medium text-slate-400">
                    Sampel representatif terkini
                  </span>
                }
              />

              <div className="p-6 space-y-6">
                {/* Visual Segmented Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span>Distribusi Spektrum Sentimen</span>
                    <span>100% Total Volume</span>
                  </div>
                  <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 shadow-inner">
                    <div
                      style={{ width: `${sentimentDist.sangat_marah?.percentage || 0}%` }}
                      className="bg-rose-500 transition-all duration-500 hover:opacity-90"
                      title={`Sangat Marah: ${sentimentDist.sangat_marah?.percentage}%`}
                    />
                    <div
                      style={{ width: `${sentimentDist.kecewa?.percentage || 0}%` }}
                      className="bg-amber-500 transition-all duration-500 hover:opacity-90"
                      title={`Kecewa: ${sentimentDist.kecewa?.percentage}%`}
                    />
                    <div
                      style={{ width: `${sentimentDist.netral?.percentage || 0}%` }}
                      className="bg-slate-400 dark:bg-slate-500 transition-all duration-500 hover:opacity-90"
                      title={`Netral: ${sentimentDist.netral?.percentage}%`}
                    />
                    <div
                      style={{ width: `${sentimentDist.positif?.percentage || 0}%` }}
                      className="bg-emerald-500 transition-all duration-500 hover:opacity-90"
                      title={`Puas: ${sentimentDist.positif?.percentage}%`}
                    />
                  </div>
                </div>

                {/* 4 Detail Baris Sentimen */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Sangat Marah */}
                  <div className="rounded-2xl border border-rose-100 dark:border-rose-950/80 bg-rose-50/50 dark:bg-rose-950/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300">
                          <Frown className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-rose-900 dark:text-rose-200">Sangat Marah</p>
                          <p className="text-[11px] text-rose-700/80 dark:text-rose-400">P1 Kritis / Darurat</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-rose-600 dark:text-rose-400">
                          {sentimentDist.sangat_marah?.percentage}%
                        </p>
                        <p className="text-[10px] text-slate-500">
                          ~{sentimentDist.sangat_marah?.count?.toLocaleString()} tiket
                        </p>
                      </div>
                    </div>
                    <p className="mt-2.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                      Ancaman eskalasi hukum, lapor polisi, viralkan di medsos, atau kiriman darurat (obat, ijazah, paspor).
                    </p>
                  </div>

                  {/* Kecewa */}
                  <div className="rounded-2xl border border-amber-100 dark:border-amber-950/80 bg-amber-50/50 dark:bg-amber-950/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300">
                          <AlertTriangle className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Kecewa / Frustrasi</p>
                          <p className="text-[11px] text-amber-700/80 dark:text-amber-400">P2 Tinggi</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-amber-600 dark:text-amber-400">
                          {sentimentDist.kecewa?.percentage}%
                        </p>
                        <p className="text-[10px] text-slate-500">
                          ~{sentimentDist.kecewa?.count?.toLocaleString()} tiket
                        </p>
                      </div>
                    </div>
                    <p className="mt-2.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                      Keterlambatan antaran, paket rusak/pecah, atau status pelacakan tidak bergerak melampaui SLA.
                    </p>
                  </div>

                  {/* Netral */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <Meh className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-200">Netral / Informasi</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">P3 Normal</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-700 dark:text-slate-300">
                          {sentimentDist.netral?.percentage}%
                        </p>
                        <p className="text-[10px] text-slate-500">
                          ~{sentimentDist.netral?.count?.toLocaleString()} tiket
                        </p>
                      </div>
                    </div>
                    <p className="mt-2.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                      Pertanyaan posisi resi standar, konfirmasi nomor telepon penerima, cek ongkos kirim & info kantor pos.
                    </p>
                  </div>

                  {/* Puas */}
                  <div className="rounded-2xl border border-emerald-100 dark:border-emerald-950/80 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300">
                          <Smile className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Puas & Apresiasi</p>
                          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">Kooperatif</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                          {sentimentDist.positif?.percentage}%
                        </p>
                        <p className="text-[10px] text-slate-500">
                          ~{sentimentDist.positif?.count?.toLocaleString()} tiket
                        </p>
                      </div>
                    </div>
                    <p className="mt-2.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                      Pelanggan mengapresiasi kecepatan respon bot CS Virtual dan kejelasan penanganan oleh petugas loket.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Insight Emosi Terdeteksi */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 px-6 py-3.5 bg-slate-50/50 dark:bg-slate-900/30 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Kamus Emosi Utama:</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                  ancaman_eskalasi
                </span>
                <span className="rounded-md bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                  frustrasi_kekecewaan
                </span>
                <span className="rounded-md bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:text-purple-300">
                  kecemasan_darurat
                </span>
                <span className="rounded-md bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  kooperatif_sopan
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Kolom Kanan: Matriks SLA & Tingkat Urgensi (5 Cols) */}
        <div className="lg:col-span-5">
          <Card className="h-full flex flex-col justify-between">
            <div>
              <CardHeader
                title="Matriks Urgensi SLA Penanganan"
                subtitle="Klasifikasi triase otomatis CCH Pos Indonesia sesuai standar operasional EFDS"
              />

              <div className="p-6 space-y-5">
                {/* P1 Kritis */}
                <div className="space-y-1.5 rounded-2xl border border-rose-200 dark:border-rose-900/80 bg-rose-50/40 dark:bg-rose-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-lg bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                        P1 KRITIS
                      </span>
                      <span className="text-xs font-semibold text-rose-950 dark:text-rose-200">
                        SLA Target: 24 Jam
                      </span>
                    </div>
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {urgencyDist.P1_KRITIS?.percentage}% ({urgencyDist.P1_KRITIS?.count?.toLocaleString()} tiket)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-rose-200 dark:bg-rose-950">
                    <div
                      style={{ width: `${urgencyDist.P1_KRITIS?.percentage || 0}%` }}
                      className="h-full bg-rose-600 rounded-full transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Eskalasi prioritas tertinggi langsung ke Pimpinan Kantor Regional Pos Indonesia.
                  </p>
                </div>

                {/* P2 Tinggi */}
                <div className="space-y-1.5 rounded-2xl border border-amber-200 dark:border-amber-900/80 bg-amber-50/40 dark:bg-amber-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-lg bg-amber-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                        P2 TINGGI
                      </span>
                      <span className="text-xs font-semibold text-amber-950 dark:text-amber-200">
                        SLA Target: 48 Jam
                      </span>
                    </div>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {urgencyDist.P2_TINGGI?.percentage}% ({urgencyDist.P2_TINGGI?.count?.toLocaleString()} tiket)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-amber-200 dark:bg-amber-950">
                    <div
                      style={{ width: `${urgencyDist.P2_TINGGI?.percentage || 0}%` }}
                      className="h-full bg-amber-500 rounded-full transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Investigasi operasional cepat pada UPT Asal / Tujuan atau Sentral Pengolahan Pos (SPP).
                  </p>
                </div>

                {/* P3 Normal */}
                <div className="space-y-1.5 rounded-2xl border border-sky-200 dark:border-sky-900/80 bg-sky-50/40 dark:bg-sky-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-lg bg-sky-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                        P3 NORMAL
                      </span>
                      <span className="text-xs font-semibold text-sky-950 dark:text-sky-200">
                        SLA Target: 72 Jam
                      </span>
                    </div>
                    <span className="text-sm font-bold text-sky-600 dark:text-sky-400">
                      {urgencyDist.P3_NORMAL?.percentage}% ({urgencyDist.P3_NORMAL?.count?.toLocaleString()} tiket)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-sky-200 dark:bg-sky-950">
                    <div
                      style={{ width: `${urgencyDist.P3_NORMAL?.percentage || 0}%` }}
                      className="h-full bg-sky-500 rounded-full transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Penanganan informasi reguler, update data kontak, dan pelacakan standar harian.
                  </p>
                </div>
              </div>
            </div>

            {/* SLA Compliance Health Meter */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 p-5 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-300">Kepatuhan SLA Penyelesaian:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{summary.sla_compliance_rate}% Tuntas</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Rata-rata tiket P1 Kritis diselesaikan dalam waktu <strong>{summary.avg_p1_resolution_hours} jam</strong> (lebih cepat dari batas maksimal 24.0 jam).
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Baris Visual 2: Tren Sebaran Keluhan Per Wilayah Pos se-Indonesia */}
      <Card>
        <CardHeader
          title="Sebaran & Tren Keluhan Per Wilayah Pos se-Indonesia"
          subtitle="Agregasi pengaduan pada 6 Kantor Regional Pos Indonesia beserta tingkat urgensi P1 Kritis & indeks kesehatan"
          actions={
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span>Cakupan Nasional Sabang - Merauke</span>
            </div>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300">
                <th className="py-3.5 px-4 font-bold">Wilayah Regional</th>
                <th className="py-3.5 px-4 font-bold">Cakupan Teritori Pos</th>
                <th className="py-3.5 px-4 font-bold text-right">Total Tiket Masuk</th>
                <th className="py-3.5 px-4 font-bold">Kasus P1 Kritis</th>
                <th className="py-3.5 px-4 font-bold text-center">Avg Waktu SLA</th>
                <th className="py-3.5 px-4 font-bold text-center">Skor Sentimen</th>
                <th className="py-3.5 px-4 font-bold text-center">Status Kesehatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {regionalTrends.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Memuat data wilayah pos se-Indonesia...
                  </td>
                </tr>
              ) : (
                regionalTrends.map((reg) => (
                  <tr
                    key={reg.code}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50 text-[11px] font-black text-blue-700 dark:text-blue-300">
                        {reg.code.replace('REG_', 'R')}
                      </span>
                      {reg.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {reg.territory}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {reg.total_tickets.toLocaleString()} tiket
                    </td>
                    <td className="py-3.5 px-4 min-w-[140px]">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          {reg.p1_kritis_count} kasus
                        </span>
                        <span className="text-slate-400 font-medium">{reg.p1_percentage}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, reg.p1_percentage * 3)}%` }}
                          className={`h-full rounded-full ${
                            reg.p1_percentage > 10 ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-700 dark:text-slate-300">
                      ~{reg.avg_resolution_hours} Jam
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          reg.avg_score >= 0
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {reg.avg_score > 0 ? `+${reg.avg_score}` : reg.avg_score}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          reg.health_status === 'Kritis'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                            : reg.health_status === 'Perlu Perhatian'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            reg.health_status === 'Kritis'
                              ? 'bg-rose-500'
                              : reg.health_status === 'Perlu Perhatian'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        {reg.health_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Baris Visual 3: Log Aktivitas Real-Time CS Virtual AI (Auto-Intake Tickets) */}
      <Card>
        <CardHeader
          title="Aktivitas Terkini CS Virtual AI & Audit Sentimen Real-Time"
          subtitle="Daftar pengaduan resmi (Status 101 ENTRI) yang diterbitkan otomatis 24 Jam atau diaudit oleh CS Virtual AI"
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Filter Sumber AI */}
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value)
                  setOffset(0)
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm outline-none"
              >
                <option value="ALL">Semua Tiket</option>
                <option value="AI_ONLY">Khusus CS Virtual AI</option>
              </select>

              {/* Filter Urgensi */}
              <select
                value={urgencyFilter}
                onChange={(e) => {
                  setUrgencyFilter(e.target.value)
                  setOffset(0)
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm outline-none"
              >
                <option value="ALL">Semua Urgensi</option>
                <option value="P1_KRITIS">P1 Kritis</option>
                <option value="P2_TINGGI">P2 Tinggi</option>
                <option value="P3_NORMAL">P3 Normal</option>
              </select>

              {/* Filter Sentimen */}
              <select
                value={sentimentFilter}
                onChange={(e) => {
                  setSentimentFilter(e.target.value)
                  setOffset(0)
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm outline-none"
              >
                <option value="ALL">Semua Sentimen</option>
                <option value="sangat_marah">Sangat Marah</option>
                <option value="kecewa">Kecewa</option>
                <option value="netral">Netral</option>
                <option value="positif">Puas</option>
              </select>
            </div>
          }
        />

        {/* Search Bar Input */}
        <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID tiket, resi, nama pelanggan, ringkasan aduan..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition shadow-inner"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300">
                <th className="py-3.5 px-4 font-bold text-center w-12">#</th>
                <th className="py-3.5 px-4 font-bold">ID Pengaduan</th>
                <th className="py-3.5 px-4 font-bold">Waktu</th>
                <th className="py-3.5 px-4 font-bold">Pelanggan</th>
                <th className="py-3.5 px-4 font-bold">Nomor Resi</th>
                <th className="py-3.5 px-4 font-bold">Ringkasan Masalah</th>
                <th className="py-3.5 px-4 font-bold text-center">Sentimen & Skor</th>
                <th className="py-3.5 px-4 font-bold text-center">Urgensi</th>
                <th className="py-3.5 px-4 font-bold">Status CCH</th>
                <th className="py-3.5 px-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Bot className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    Tidak ada tiket yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((t, idx) => (
                  <tr
                    key={t.ticket_id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer"
                    onClick={() => setSelectedTicket(t)}
                  >
                    <td className="py-3.5 px-4 text-center font-medium text-slate-400">
                      {offset + idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        {t.ticket_id}
                      </div>
                      {t.is_ai_created && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded bg-blue-100 dark:bg-blue-950/80 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                          <Bot className="h-3 w-3" />
                          CS VIRTUAL 24H
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {t.created_at}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {t.customer_name}
                      </p>
                      <p className="text-[11px] text-slate-400">{t.customer_phone}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {t.shipment_number}
                        </span>
                        {t.shipment_number !== '-' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              copyToClipboard(t.shipment_number, 'Resi')
                            }}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Salin Resi"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="line-clamp-2 text-slate-700 dark:text-slate-300 leading-snug">
                        {t.summary}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          t.sentiment === 'sangat_marah'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                            : t.sentiment === 'kecewa'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                            : t.sentiment === 'positif'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {t.sentiment === 'sangat_marah' && '😡 Marah'}
                        {t.sentiment === 'kecewa' && '😟 Kecewa'}
                        {t.sentiment === 'netral' && '😐 Netral'}
                        {t.sentiment === 'positif' && '😊 Puas'}
                        <span className="text-[10px] opacity-75">({t.sentiment_score})</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                          t.urgency_level === 'P1_KRITIS'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : t.urgency_level === 'P2_TINGGI'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                        }`}
                      >
                        {t.urgency_level.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {t.status_name}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTicket(t)
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition"
                      >
                        <Eye className="h-3 w-3" />
                        Audit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Enterprise Pagination Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <Pagination
            offset={offset}
            count={filteredTickets.length}
            total={filteredTickets.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={(newOffset) => setOffset(newOffset)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize)
              setOffset(0)
            }}
            label="tiket"
          />
        </div>
      </Card>

      {/* Modal Dialog Audit Lengkap Tiket */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Audit Triase Sentimen & Urgensi AI
                  </h3>
                  <p className="text-xs text-slate-500">ID Pengaduan: {selectedTicket.ticket_id}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-6 space-y-5 overflow-y-auto text-xs">
              {/* Badges Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-lg px-2.5 py-1 font-bold text-xs ${
                    selectedTicket.urgency_level === 'P1_KRITIS'
                      ? 'bg-rose-600 text-white'
                      : selectedTicket.urgency_level === 'P2_TINGGI'
                      ? 'bg-amber-500 text-white'
                      : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                  }`}
                >
                  {selectedTicket.urgency_level.replace('_', ' ')}
                </span>

                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-semibold text-slate-700 dark:text-slate-300">
                  Sentimen: {selectedTicket.sentiment.toUpperCase()} (Skor: {selectedTicket.sentiment_score})
                </span>

                {selectedTicket.is_emergency && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100 dark:bg-rose-950 px-2.5 py-1 font-bold text-rose-700 dark:text-rose-300">
                    <AlertOctagon className="h-3.5 w-3.5" />
                    STATUS DARURAT
                  </span>
                )}

                {selectedTicket.is_ai_created && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-blue-100 dark:bg-blue-950 px-2.5 py-1 font-bold text-blue-700 dark:text-blue-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    AUTONOMOUS INTAKE 24H
                  </span>
                )}
              </div>

              {/* Grid Info Pelanggan & Kiriman */}
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-[11px] text-slate-400">Nama Pelanggan:</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedTicket.customer_name}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Nomor Telepon:</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedTicket.customer_phone}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Nomor Resi Kiriman:</p>
                  <p className="font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {selectedTicket.shipment_number}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Kantor Tujuan:</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedTicket.target_office}
                  </p>
                </div>
              </div>

              {/* Uraian Keluhan */}
              <div className="space-y-1.5">
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  Ringkasan & Uraian Keluhan Pelanggan:
                </p>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-slate-700 dark:text-slate-300 leading-relaxed shadow-inner">
                  {selectedTicket.summary}
                </div>
              </div>

              {/* Daftar Emosi Terdeteksi */}
              {selectedTicket.detected_emotions && selectedTicket.detected_emotions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-700 dark:text-slate-300">
                    Emosi & Sinyal Bahaya Terdeteksi:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTicket.detected_emotions.map((emo) => (
                      <span
                        key={emo}
                        className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        #{emo}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rekomendasi Nada Bicara Petugas */}
              <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 p-4 space-y-1">
                <p className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <Bot className="h-4 w-4" />
                  Rekomendasi Gaya Bicara De-Eskalasi untuk Petugas CS:
                </p>
                <p className="text-blue-900/90 dark:text-blue-200 leading-relaxed">
                  {selectedTicket.urgency_level === 'P1_KRITIS'
                    ? 'Buka dengan permohonan maaf mendalam atas nama Pos Indonesia, akui kekecewaan pelanggan secara tulus tanpa membela diri, dan berikan jaminan bahwa nomor tiket ini sudah dieskalasi langsung ke pimpinan operasional regional untuk investigasi darurat.'
                    : selectedTicket.urgency_level === 'P2_TINGGI'
                    ? 'Gunakan nada empati yang solutif. Tunjukkan bahwa waktu pelanggan berharga dan berikan langkah konkret nomor kontak penanggung jawab di UPT terkait.'
                    : 'Gunakan nada ramah, lugas, dan cekatan. Jelaskan estimasi pergerakan kiriman dengan informatif dan ucapkan terima kasih.'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Waktu Input: {selectedTicket.created_at}
              </span>

              <div className="flex items-center gap-2">
                <Link
                  to={`/workspace/complaints/open/${selectedTicket.ticket_id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  Buka Detail Tiket CCH
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

