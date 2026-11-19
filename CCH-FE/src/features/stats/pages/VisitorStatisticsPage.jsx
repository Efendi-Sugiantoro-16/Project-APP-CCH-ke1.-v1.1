import { useContext, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  FileSpreadsheet,
  Globe,
  Monitor,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { statsApi } from '../api/statsApi.js'
import { PageHeader } from '../../../shared/ui/PageHeader.jsx'
import { Card } from '../../../shared/ui/Card.jsx'
import { StatCard } from '../../../shared/ui/StatCard.jsx'
import { Pagination } from '../../../shared/ui/Pagination.jsx'

function formatTrendLabel(item, period) {
  if (period === 'hourly') {
    return `Jam ${String(item.hour).padStart(2, '0')}:00 - ${String(item.hour).padStart(2, '0')}:59`
  }
  if (period === 'daily') {
    return `Tgl ${item.date}/${item.month}/${item.year}`
  }
  if (period === 'monthly') {
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    return `${monthNames[item.month] || item.month} ${item.year}`
  }
  return `Tahun ${item.year}`
}

export function VisitorStatisticsPage() {
  const { token } = useContext(AuthContext)

  // Top summary KPIs
  const [summary, setSummary] = useState({
    total_hits: 0,
    total_unique_visitors: 0,
    today_hits: 0,
    month_hits: 0,
    year_hits: 0,
    browsers: [],
    operating_systems: [],
  })

  // Trends state
  const currentDate = new Date()
  const [period, setPeriod] = useState('daily') // hourly, daily, monthly, yearly
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState(currentDate.getDate())
  const [trendsData, setTrendsData] = useState([])
  const [trendsLoading, setTrendsLoading] = useState(false)

  // Visitor IP Logs state
  const [visitors, setVisitors] = useState([])
  const [visitorsTotal, setVisitorsTotal] = useState(0)
  const [visitorSearch, setVisitorSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [visitorLimit, setVisitorLimit] = useState(25)
  const [visitorOffset, setVisitorOffset] = useState(0)
  const [visitorsLoading, setVisitorsLoading] = useState(false)

  // General UI states
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [copiedIp, setCopiedIp] = useState('')
  const [error, setError] = useState('')

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(visitorSearch)
      setVisitorOffset(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [visitorSearch])

  // Initial summary load
  useEffect(() => {
    if (!token) return
    let active = true

    statsApi
      .getSummary(token)
      .then((data) => {
        if (!active || !data) return
        setSummary(data)
        setLastUpdated(new Date())
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to load visitor summary:', err)
          setError(err.message || 'Gagal memuat ringkasan statistik')
        }
      })

    return () => {
      active = false
    }
  }, [token])

  // Reactive trends load
  useEffect(() => {
    if (!token) return
    let active = true

    statsApi
      .getTrends(token, {
        period,
        year: selectedYear,
        month: selectedMonth,
        date: selectedDate,
      })
      .then((data) => {
        if (!active || !data) return
        if (period === 'hourly' && Array.isArray(data.hourly)) {
          setTrendsData(data.hourly)
        } else if (period === 'daily' && Array.isArray(data.daily)) {
          setTrendsData(data.daily)
        } else if (period === 'monthly' && Array.isArray(data.monthly)) {
          setTrendsData(data.monthly)
        } else if (period === 'yearly' && Array.isArray(data.yearly)) {
          setTrendsData(data.yearly)
        } else {
          setTrendsData([])
        }
      })
      .catch((err) => {
        if (active) console.error('Failed to load visitor trends:', err)
      })
      .finally(() => {
        if (active) setTrendsLoading(false)
      })

    return () => {
      active = false
    }
  }, [token, period, selectedYear, selectedMonth, selectedDate])

  // Reactive visitors load
  useEffect(() => {
    if (!token) return
    let active = true

    statsApi
      .getVisitorLogs(token, {
        limit: visitorLimit,
        offset: visitorOffset,
        q: debouncedSearch,
      })
      .then((res) => {
        if (!active || !res?.data) return
        setVisitors(res.data)
        setVisitorsTotal(res.total || 0)
      })
      .catch((err) => {
        if (active) console.error('Failed to load visitor logs:', err)
      })
      .finally(() => {
        if (active) setVisitorsLoading(false)
      })

    return () => {
      active = false
    }
  }, [token, visitorLimit, visitorOffset, debouncedSearch])

  // Manual refresh all
  const handleRefresh = async () => {
    setRefreshing(true)
    setError('')
    try {
      const [sumData, trData, visRes] = await Promise.all([
        statsApi.getSummary(token),
        statsApi.getTrends(token, {
          period,
          year: selectedYear,
          month: selectedMonth,
          date: selectedDate,
        }),
        statsApi.getVisitorLogs(token, {
          limit: visitorLimit,
          offset: visitorOffset,
          q: debouncedSearch,
        }),
      ])
      if (sumData) {
        setSummary(sumData)
        setLastUpdated(new Date())
      }
      if (trData) {
        if (period === 'hourly' && Array.isArray(trData.hourly)) {
          setTrendsData(trData.hourly)
        } else if (period === 'daily' && Array.isArray(trData.daily)) {
          setTrendsData(trData.daily)
        } else if (period === 'monthly' && Array.isArray(trData.monthly)) {
          setTrendsData(trData.monthly)
        } else if (period === 'yearly' && Array.isArray(trData.yearly)) {
          setTrendsData(trData.yearly)
        } else {
          setTrendsData([])
        }
      }
      if (visRes && visRes.data) {
        setVisitors(visRes.data)
        setVisitorsTotal(visRes.total || 0)
      }
    } catch (err) {
      setError(err?.message || 'Gagal menyegarkan data statistik')
    } finally {
      setRefreshing(false)
    }
  }

  // Copy IP handler
  const handleCopyIp = (ip) => {
    navigator.clipboard?.writeText(ip)
    setCopiedIp(ip)
    setTimeout(() => setCopiedIp(''), 2000)
  }

  // Calculate max hits in current trend for proportional bar heights
  const maxTrendHits = useMemo(() => {
    if (!trendsData.length) return 1
    return Math.max(...trendsData.map((d) => d.hits || 0), 1)
  }, [trendsData])

  // Total hits in current trend
  const totalTrendHits = useMemo(() => {
    return trendsData.reduce((acc, curr) => acc + (curr.hits || 0), 0)
  }, [trendsData])

  // Export Visitor Logs to CSV
  const exportVisitorsCSV = () => {
    if (!visitors.length) return
    const headers = ['No', 'Alamat IP', 'Hostname', 'Kunjungan Pertama', 'Kunjungan Terakhir', 'Total Hits']
    const rows = visitors.map((v, i) => [
      visitorOffset + i + 1,
      v.ip_address,
      v.hostname || '-',
      v.first_visit ? new Date(v.first_visit).toLocaleString('id-ID') : '-',
      v.last_visit ? new Date(v.last_visit).toLocaleString('id-ID') : '-',
      v.counter,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `cch_visitor_logs_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export Trends to CSV
  const exportTrendsCSV = () => {
    if (!trendsData.length) return
    const headers = ['Periode', 'Tahun', 'Bulan', 'Tanggal', 'Jam', 'Hits']
    const rows = trendsData.map((t) => [
      period,
      t.year || selectedYear,
      t.month || (period === 'monthly' ? t.month : selectedMonth),
      t.date || (period === 'hourly' ? selectedDate : '-'),
      t.hour !== undefined ? `${String(t.hour).padStart(2, '0')}:00` : '-',
      t.hits || 0,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `cch_visitor_trends_${period}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalPages = Math.max(1, Math.ceil(visitorsTotal / visitorLimit))
  const currentPage = Math.floor(visitorOffset / visitorLimit) + 1

  return (
    <div className="space-y-6 pb-12 transition-colors">
      {/* Top Page Header */}
      <PageHeader
        title="Statistik Pengunjung"
        subtitle="Analisis lalu lintas aplikasi CCH, audit riwayat alamat IP pengunjung, distribusi peramban (browser) dan sistem operasi."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {lastUpdated && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mr-2">
                <Clock className="w-3.5 h-3.5" />
                Diperbarui: {lastUpdated.toLocaleTimeString('id-ID')}
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-all cursor-pointer"
              title="Segarkan data statistik"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              <span>{refreshing ? 'Memuat...' : 'Segarkan'}</span>
            </button>
            <div className="relative inline-block text-left">
              <button
                type="button"
                onClick={exportVisitorsCSV}
                disabled={!visitors.length}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Unduh log pengunjung ke file CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh CSV Log</span>
              </button>
            </div>
          </div>
        }
      />

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/90 dark:bg-rose-950/40 p-4 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* KPI Highlights Grid (5 StatCards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Kunjungan"
          value={summary.total_hits}
          icon={Activity}
          tone="brand"
          hint="Akumulasi seluruh page hit"
        />
        <StatCard
          label="Pengunjung Unik"
          value={summary.total_unique_visitors}
          icon={Users}
          tone="indigo"
          hint="Total IP unik terdaftar"
        />
        <StatCard
          label="Kunjungan Hari Ini"
          value={summary.today_hits}
          icon={Calendar}
          tone="green"
          hint={new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        />
        <StatCard
          label="Kunjungan Bulan Ini"
          value={summary.month_hits}
          icon={TrendingUp}
          tone="sky"
          hint={new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
        />
        <StatCard
          label="Kunjungan Tahun Ini"
          value={summary.year_hits}
          icon={Globe}
          tone="amber"
          hint={`Tahun ${new Date().getFullYear()}`}
        />
      </div>

      {/* Interactive Traffic Trends Studio */}
      <Card className="p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Eksplorasi Tren Lalu Lintas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Visualisasi distribusi frekuensi kunjungan berdasarkan interval waktu
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period Segmented Switcher */}
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-medium dark:border-slate-800 dark:bg-slate-800/80">
              {[
                { id: 'hourly', label: 'Per Jam' },
                { id: 'daily', label: 'Harian' },
                { id: 'monthly', label: 'Bulanan' },
                { id: 'yearly', label: 'Tahunan' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                    period === p.id
                      ? 'bg-white dark:bg-slate-700 font-bold text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Parameter Selectors */}
            <div className="flex items-center gap-1.5">
              {/* Year Selector */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              {/* Month Selector for hourly and daily */}
              {(period === 'hourly' || period === 'daily') && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      Bulan {m}
                    </option>
                  ))}
                </select>
              )}

              {/* Date Selector for hourly */}
              {period === 'hourly' && (
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(Number(e.target.value))}
                  className="text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Tgl {d}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={exportTrendsCSV}
                disabled={!trendsData.length}
                className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Ekspor Tren ke CSV"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Traffic Chart Canvas */}
        <div className="mt-6">
          {trendsLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-xs">Memuat visualisasi tren...</p>
            </div>
          ) : trendsData.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Tidak ada aktivitas kunjungan pada periode ini</p>
              <p className="text-xs mt-1">Coba pilih rentang waktu atau bulan lainnya</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary banner */}
              <div className="flex flex-wrap items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-300">
                <span>
                  Total Rekaman: <strong className="text-slate-900 dark:text-white font-bold">{trendsData.length}</strong> entri
                </span>
                <span>
                  Total Hits Terdata: <strong className="text-blue-600 dark:text-blue-400 font-bold">{totalTrendHits.toLocaleString('id-ID')}</strong> hits
                </span>
                <span>
                  Tertinggi: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{maxTrendHits.toLocaleString('id-ID')}</strong> hits
                </span>
              </div>

              {/* Bar Visualization: Responsive Horizontal Bar List */}
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2">
                {trendsData.map((item, idx) => {
                  const label = formatTrendLabel(item, period)
                  const hits = item.hits || 0
                  const pct = Math.max(2, Math.round((hits / maxTrendHits) * 100))

                  return (
                    <div key={idx} className="group flex items-center gap-3 text-xs">
                      <div className="w-28 sm:w-36 shrink-0 font-medium text-slate-600 dark:text-slate-300 truncate">
                        {label}
                      </div>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-5 overflow-hidden p-0.5 relative">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-500 transition-all duration-500 group-hover:brightness-110 flex items-center justify-end pr-2"
                          style={{ width: `${pct}%` }}
                        >
                          {pct >= 15 && (
                            <span className="text-[10px] font-bold text-white drop-shadow-xs">
                              {hits.toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-16 text-right shrink-0 font-bold text-slate-700 dark:text-slate-200">
                        {hits.toLocaleString('id-ID')} <span className="text-[10px] font-normal text-slate-400">hits</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Platform & Environment Grid (Browser & OS Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Browser Breakdown Card */}
        <Card className="p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-500" />
              Distribusi Peramban (Browser)
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {summary.browsers?.length || 0} varian
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {summary.browsers && summary.browsers.length > 0 ? (
              summary.browsers.map((b, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {b.variable}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {b.counter} <span className="text-slate-400 font-normal">({b.percentage}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-blue-500 dark:from-sky-500 dark:to-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(b.counter > 0 ? 3 : 0, b.percentage)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">Belum ada data peramban</p>
            )}
          </div>
        </Card>

        {/* OS Breakdown Card */}
        <Card className="p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-indigo-500" />
              Distribusi Sistem Operasi (OS)
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {summary.operating_systems?.length || 0} sistem
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {summary.operating_systems && summary.operating_systems.length > 0 ? (
              summary.operating_systems.map((os, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {os.variable}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {os.counter} <span className="text-slate-400 font-normal">({os.percentage}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(os.counter > 0 ? 3 : 0, os.percentage)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">Belum ada data sistem operasi</p>
            )}
          </div>
        </Card>
      </div>

      {/* Visitor IP Audit Logs Table */}
      <Card className="p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Buku Tamu / Log Pengunjung (IP Address)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Daftar rekam jejak kunjungan unik berdasarkan alamat IP dan nama host
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={visitorSearch}
                onChange={(e) => setVisitorSearch(e.target.value)}
                placeholder="Cari IP atau Hostname..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Alamat IP</th>
                <th className="py-3 px-4">Nama Host (Hostname)</th>
                <th className="py-3 px-4">Kunjungan Pertama</th>
                <th className="py-3 px-4">Kunjungan Terakhir</th>
                <th className="py-3 px-4 text-center">Total Kunjungan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visitorsLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Memuat data pengunjung...
                  </td>
                </tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Tidak ada catatan kunjungan yang cocok
                  </td>
                </tr>
              ) : (
                visitors.map((v, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
                      {visitorOffset + idx + 1}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                          {v.ip_address}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyIp(v.ip_address)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition"
                          title="Salin Alamat IP"
                        >
                          {copiedIp === v.ip_address ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {v.hostname || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {v.first_visit ? new Date(v.first_visit).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {v.last_visit ? new Date(v.last_visit).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                        {v.counter} kali
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          offset={visitorOffset}
          count={visitors.length}
          total={visitorsTotal}
          perPage={visitorLimit}
          loading={visitorsLoading}
          onPage={setVisitorOffset}
          pageSizeOptions={[10, 25, 50, 100]}
          onPerPageChange={(newLimit) => {
            setVisitorLimit(newLimit)
            setVisitorOffset(0)
          }}
          label="pengunjung unik"
        />
      </Card>
    </div>
  )
}
export default VisitorStatisticsPage
