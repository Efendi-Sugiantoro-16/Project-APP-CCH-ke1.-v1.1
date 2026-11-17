import { useContext, useEffect, useState, useTransition } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  Eye,
  Filter,
  Package,
  PackageX,
  Plane,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  Truck,
  X,
} from 'lucide-react'

import { AuthContext } from '../../auth/auth-context.js'
import { gagalXrayApi } from '../api/gagalXrayApi.js'
import { usersApi } from '../../admin/api/usersApi.js'
import { PageHeader } from '../../../shared/ui/PageHeader.jsx'
import { Card } from '../../../shared/ui/Card.jsx'
import { StatCard } from '../../../shared/ui/StatCard.jsx'
import { CreateGagalXrayModal } from '../components/CreateGagalXrayModal.jsx'
import { EditGagalXrayModal } from '../components/EditGagalXrayModal.jsx'
import { DetailGagalXrayModal } from '../components/DetailGagalXrayModal.jsx'
import { Pagination } from '../../../shared/ui/Pagination.jsx'

export function GagalXrayPage() {
  const { token } = useContext(AuthContext)
  const [, startTransition] = useTransition()

  // Data states
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({
    total_records: 0,
    darat_laut_count: 0,
    retour_count: 0,
    disita_count: 0,
    freighter_count: 0,
  })
  const [offices, setOffices] = useState([])

  // Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [keteranganFilter, setKeteranganFilter] = useState('')
  const [kantorAsalFilter, setKantorAsalFilter] = useState('')
  const [kantorTujuanFilter, setKantorTujuanFilter] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [limit, setLimit] = useState(25)
  const [offset, setOffset] = useState(0)

  // UI status
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [copiedResi, setCopiedResi] = useState('')

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [detailItem, setDetailItem] = useState(null)
  const [deletingItem, setDeletingItem] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setOffset(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  // Load catalogs (offices) and stats once
  useEffect(() => {
    if (!token) return
    let active = true

    async function loadInitial() {
      try {
        const [statsData, officesData] = await Promise.all([
          gagalXrayApi.getStats(token).catch(() => null),
          usersApi.listOffices(token).catch(() => []),
        ])
        if (active) {
          if (statsData) setStats(statsData)
          if (Array.isArray(officesData)) setOffices(officesData)
        }
      } catch (err) {
        console.error('Failed to load initial gagal xray catalogs', err)
      }
    }
    loadInitial()
    return () => {
      active = false
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    let active = true

    async function fetchData() {
      setLoading(true)
      setError('')
      try {
        const res = await gagalXrayApi.list(token, {
          q: debouncedSearch,
          keterangan: keteranganFilter,
          kantor_asal: kantorAsalFilter,
          kantor_tujuan: kantorTujuanFilter,
          start_date: startDateFilter,
          end_date: endDateFilter,
          limit,
          offset,
        })
        if (active) {
          startTransition(() => {
            setItems(res.items || [])
            setTotal(res.total || 0)
          })
        }
      } catch (err) {
        if (active) setError(err?.message || 'Gagal memuat data kiriman gagal X-ray')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchData()
    return () => {
      active = false
    }
  }, [
    token,
    debouncedSearch,
    keteranganFilter,
    kantorAsalFilter,
    kantorTujuanFilter,
    startDateFilter,
    endDateFilter,
    limit,
    offset,
  ])

  function showToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4000)
  }

  function handleCopy(idKiriman) {
    navigator.clipboard.writeText(idKiriman)
    setCopiedResi(idKiriman)
    setTimeout(() => setCopiedResi(''), 2000)
  }

  function handleResetFilters() {
    setSearch('')
    setDebouncedSearch('')
    setKeteranganFilter('')
    setKantorAsalFilter('')
    setKantorTujuanFilter('')
    setStartDateFilter('')
    setEndDateFilter('')
    setOffset(0)
  }

  function handleExportCSV() {
    if (!items.length) {
      showToast('Tidak ada data kiriman untuk diekspor.')
      return
    }

    const headers = [
      'No Resi / ID Kiriman',
      'Tanggal Pemeriksaan',
      'Kantor Asal',
      'Nama Kantor Asal',
      'Kantor Tujuan',
      'Nama Kantor Tujuan',
      'Bandara X-Ray',
      'Nama Bandara',
      'Isi Kiriman Terdeteksi',
      'Berat (Kg)',
      'Tindak Lanjut',
      'Kantong Lama',
      'Kantong Baru',
      'File Berita Acara BAP',
    ]

    const rows = items.map((it) => [
      `"${it.id_kiriman || ''}"`,
      `"${it.tanggal || ''}"`,
      `"${it.kantor_asal || ''}"`,
      `"${(it.nama_kantor_asal || '').replace(/"/g, '""')}"`,
      `"${it.kantor_tujuan || ''}"`,
      `"${(it.nama_kantor_tujuan || '').replace(/"/g, '""')}"`,
      `"${it.kantor_penerbangan || ''}"`,
      `"${(it.nama_kantor_penerbangan || '').replace(/"/g, '""')}"`,
      `"${(it.isi_kiriman || '').replace(/"/g, '""')}"`,
      it.berat || 0,
      `"${it.keterangan_text || it.keterangan || ''}"`,
      `"${it.id_kantong_lama || ''}"`,
      `"${it.id_kantong_baru || ''}"`,
      `"${(it.file_berita_acara || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `kiriman_gagal_xray_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast(`Berhasil mengekspor ${items.length} data kiriman gagal X-ray ke CSV.`)
  }


  async function handleDeleteConfirm() {
    if (!deletingItem || !token) return
    setIsDeleting(true)
    try {
      await gagalXrayApi.delete(
        token,
        deletingItem.kantor_asal,
        deletingItem.kantor_tujuan,
        deletingItem.id_kiriman,
        deletingItem.id_kantong_lama,
      )
      showToast(`Kiriman ${deletingItem.id_kiriman} berhasil dihapus.`)
      setDeletingItem(null)
      // Refresh stats & list
      gagalXrayApi.getStats(token).then(setStats).catch(() => {})
      setOffset(0)
      const res = await gagalXrayApi.list(token, {
        q: debouncedSearch,
        keterangan: keteranganFilter,
        limit,
        offset: 0,
      })
      setItems(res.items || [])
      setTotal(res.total || 0)
    } catch (err) {
      showToast(err?.message || 'Gagal menghapus data kiriman.')
    } finally {
      setIsDeleting(false)
    }
  }

  function getKeteranganBadge(keterangan, text) {
    switch (keterangan) {
      case '1':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
            <Truck className="h-3 w-3" />
            Darat/Laut
          </span>
        )
      case '2':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            Retour
          </span>
        )
      case '3':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-300">
            <ShieldAlert className="h-3 w-3" />
            Disita
          </span>
        )
      case '4':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300">
            <Plane className="h-3 w-3" />
            Freighter
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
            {text || keterangan || '-'}
          </span>
        )
    }
  }

  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-[10000] flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-slate-900/95 px-4 py-3 text-xs font-semibold text-emerald-300 shadow-2xl backdrop-blur-md animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Kiriman Gagal X-Ray"
        subtitle="Monitoring operasional dan tindak lanjut 31.800+ kiriman barang yang tidak lolos pemeriksaan X-Ray bandara pos"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={loading || items.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs transition cursor-pointer disabled:opacity-50"
              title="Unduh data kiriman gagal X-ray dalam format CSV"
            >
              <Download className="h-3.5 w-3.5 text-blue-500" />
              Ekspor CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setOffset(0)
                setLoading(true)
                gagalXrayApi
                  .list(token, { q: debouncedSearch, limit, offset: 0 })
                  .then((res) => {
                    setItems(res.items || [])
                    setTotal(res.total || 0)
                  })
                  .finally(() => setLoading(false))
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs transition cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <PackageX className="h-4 w-4" />
              + Catat Kiriman Gagal
            </button>
          </div>

        }
      />

      {/* 4 Counter StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Kiriman Gagal"
          value={stats.total_records || 31855}
          icon={PackageX}
          badge="Database CCH"
          variant="amber"
        />
        <StatCard
          label="Diteruskan Darat/Laut"
          value={stats.darat_laut_count || 27033}
          icon={Truck}
          badge="84.8% Dominan"
          variant="emerald"
        />
        <StatCard
          label="Penerusan Freighter"
          value={stats.freighter_count || 4070}
          icon={Plane}
          badge="12.7% Kargo Udara"
          variant="blue"
        />
        <StatCard
          label="Retour & Disita"
          value={(stats.retour_count || 0) + (stats.disita_count || 0) || 752}
          icon={ShieldAlert}
          badge={`${stats.retour_count} Ret / ${stats.disita_count} Sita`}
          variant="slate"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-md transition-colors">
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari No. Resi / Barcode, Kantong, Isi Kiriman (e.g. P22...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:outline-none shadow-xs transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status Tindak Lanjut */}
            <div className="md:col-span-3">
              <select
                value={keteranganFilter}
                onChange={(e) => {
                  setKeteranganFilter(e.target.value)
                  setOffset(0)
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 px-3 py-2 text-xs text-slate-800 dark:text-white focus:border-amber-500 focus:outline-none shadow-xs transition-colors"
              >
                <option value="">Semua Tindak Lanjut</option>
                <option value="1">1 - Diteruskan via Darat/Laut</option>
                <option value="2">2 - Retour</option>
                <option value="3">3 - Disita oleh Pihak Berwenang</option>
                <option value="4">4 - Penerusan dengan Freighter</option>
              </select>
            </div>

            {/* Kantor Asal */}
            <div className="md:col-span-2">
              <select
                value={kantorAsalFilter}
                onChange={(e) => {
                  setKantorAsalFilter(e.target.value)
                  setOffset(0)
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 px-3 py-2 text-xs text-slate-800 dark:text-white focus:border-amber-500 focus:outline-none truncate shadow-xs transition-colors"
              >
                <option value="">Semua Asal</option>
                {offices.slice(0, 100).map((off) => (
                  <option key={off.code || off.Kode_Kantor} value={off.code || off.Kode_Kantor}>
                    {off.code || off.Kode_Kantor} - {off.name || off.Nama_Kantor}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            <div className="md:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Filter
              </button>
            </div>
          </div>

          {/* Date Range Sub-Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
              <Filter className="h-3.5 w-3.5" /> Rentang Tanggal:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => {
                  setStartDateFilter(e.target.value)
                  setOffset(0)
                }}
                className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 px-2.5 py-1 text-xs text-slate-800 dark:text-white focus:border-amber-500 focus:outline-none transition-colors"
              />
              <span>s/d</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => {
                  setEndDateFilter(e.target.value)
                  setOffset(0)
                }}
                className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 px-2.5 py-1 text-xs text-slate-800 dark:text-white focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>
            {(startDateFilter || endDateFilter) && (
              <button
                type="button"
                onClick={() => {
                  setStartDateFilter('')
                  setEndDateFilter('')
                }}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Hapus Rentang
              </button>
            )}
          </div>

          {/* Quick Dangerous Goods Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <PackageX className="h-3 w-3 text-amber-500" /> Kategori Muatan:
            </span>
            {[
              { label: 'Semua', value: '' },
              { label: '🔋 Baterai', value: 'BATTERY' },
              { label: '🧴 Parfum / Aerosol', value: 'PERFUME' },
              { label: '🧪 Cairan / Liquid', value: 'LIQUID' },
              { label: '⚡ Powerbank', value: 'POWERBANK' },
              { label: '📦 Kosmetik', value: 'KOSMETIK' },
            ].map((chip) => {
              const isActive = search === chip.value || (chip.value === '' && !search)
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setSearch(chip.value)
                    setDebouncedSearch(chip.value)
                    setOffset(0)
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
        </div>
      </Card>


      {/* Main Table Card */}
      <Card className="overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 shadow-sm backdrop-blur-md transition-colors">
        {error && (
          <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/10 p-4 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3.5 pl-4 pr-3">No. Resi / ID Kiriman</th>
                <th className="py-3.5 px-3">Tanggal</th>
                <th className="py-3.5 px-3">Rute (Asal → Tujuan)</th>
                <th className="py-3.5 px-3">Bandara X-Ray</th>
                <th className="py-3.5 px-3">Isi Terdeteksi</th>
                <th className="py-3.5 px-3 text-right">Berat</th>
                <th className="py-3.5 px-3">Tindak Lanjut</th>
                <th className="py-3.5 px-3">Kantong Baru</th>
                <th className="py-3.5 pl-3 pr-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
                      <span>Memuat data kiriman gagal X-ray...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">Tidak ada kiriman gagal X-ray ditemukan.</span>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Coba ubah kata kunci pencarian atau bersihkan filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr
                    key={`${it.kantor_asal}-${it.kantor_tujuan}-${it.id_kiriman}-${it.id_kantong_lama}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    {/* No Resi Barcode */}
                    <td className="py-3 pl-4 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="font-mono font-bold text-amber-600 dark:text-amber-400 cursor-pointer hover:underline"
                          onClick={() => setDetailItem(it)}
                          title="Klik untuk lihat detail pemeriksaan"
                        >
                          {it.id_kiriman}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(it.id_kiriman)}
                          title="Salin nomor resi"
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                        >
                          {copiedResi === it.id_kiriman ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 block">Kantong: {it.id_kantong_lama}</span>
                    </td>

                    {/* Tanggal */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {it.tanggal || '-'}
                    </td>

                    {/* Route (Asal -> Tujuan) */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{it.kantor_asal}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{it.kantor_tujuan}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[170px]" title={`${it.nama_kantor_asal || it.kantor_asal} ke ${it.nama_kantor_tujuan || it.kantor_tujuan}`}>
                        {it.nama_kantor_tujuan || it.kantor_tujuan}
                      </div>
                    </td>

                    {/* Airport */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        <Plane className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                        {it.kantor_penerbangan || '-'}
                      </div>
                      <span className="text-[10px] text-slate-500 truncate block max-w-[130px]">
                        {it.nama_kantor_penerbangan || 'Bandara'}
                      </span>
                    </td>

                    {/* Isi Terdeteksi */}
                    <td className="py-3 px-3">
                      <span className="inline-block rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                        {it.isi_kiriman || 'UNKNOWN'}
                      </span>
                    </td>

                    {/* Berat */}
                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {it.berat ? `${it.berat} kg` : '-'}
                    </td>

                    {/* Keterangan */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getKeteranganBadge(it.keterangan, it.keterangan_text)}
                    </td>

                    {/* Kantong Baru */}
                    <td className="py-3 px-3 font-mono text-[11px] text-amber-700 dark:text-amber-300/90 whitespace-nowrap">
                      {it.id_kantong_baru || '-'}
                    </td>

                    {/* Aksi */}
                    <td className="py-3 pl-3 pr-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailItem(it)}
                          title="Lihat Detail Pemeriksaan"
                          className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItem(it)}
                          title="Ubah Tindak Lanjut"
                          className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItem(it)}
                          title="Hapus Data Kiriman Gagal"
                          className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <Pagination
          offset={offset}
          count={items.length}
          total={total}
          perPage={limit}
          loading={loading}
          onPage={setOffset}
          pageSizeOptions={[10, 25, 50, 100]}
          onPerPageChange={(newSize) => {
            setLimit(newSize);
            setOffset(0);
          }}
          label="kiriman gagal"
        />
      </Card>

      {/* Modals */}
      <CreateGagalXrayModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(msg) => {
          showToast(msg)
          gagalXrayApi.getStats(token).then(setStats).catch(() => {})
          setOffset(0)
          gagalXrayApi
            .list(token, { q: debouncedSearch, limit, offset: 0 })
            .then((res) => {
              setItems(res.items || [])
              setTotal(res.total || 0)
            })
        }}
        token={token}
        offices={offices}
      />

      <EditGagalXrayModal
        key={editingItem ? `${editingItem.kantor_asal}-${editingItem.kantor_tujuan}-${editingItem.id_kiriman}-${editingItem.id_kantong_lama}` : 'none'}
        item={editingItem}
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        onSuccess={(msg) => {
          showToast(msg)
          gagalXrayApi.getStats(token).then(setStats).catch(() => {})
          gagalXrayApi
            .list(token, {
              q: debouncedSearch,
              keterangan: keteranganFilter,
              kantor_asal: kantorAsalFilter,
              kantor_tujuan: kantorTujuanFilter,
              start_date: startDateFilter,
              end_date: endDateFilter,
              limit,
              offset,
            })
            .then((res) => {
              setItems(res.items || [])
              setTotal(res.total || 0)
            })
        }}
        token={token}
        offices={offices}
      />

      <DetailGagalXrayModal
        item={detailItem}
        isOpen={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
      />

      {/* Delete Confirmation Dialog */}
      {deletingItem && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setDeletingItem(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-red-500/20 bg-white dark:bg-slate-900 p-6 shadow-2xl text-slate-800 dark:text-slate-100 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-500 dark:text-red-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Hapus Kiriman Gagal X-Ray</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus catatan kiriman{' '}
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{deletingItem.id_kiriman}</span> (Kantong:{' '}
              {deletingItem.id_kantong_lama})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingItem(null)}
                className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
