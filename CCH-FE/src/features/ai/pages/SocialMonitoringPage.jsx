import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertOctagon,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Filter,
  Frown,
  Meh,
  MessageSquare,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  Smile,
  Sparkles,
  X,
} from 'lucide-react'
import { PageHeader } from '../../../shared/ui/PageHeader.jsx'
import { Card, CardHeader } from '../../../shared/ui/Card.jsx'
import { StatCard } from '../../../shared/ui/StatCard.jsx'
import { socialApi } from '../api/socialApi.js'
import { complaintDetailPath } from '../../complaints/complaintPath.js'

const PLATFORM_CONFIG = {
  all: { label: 'Semua Platform', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
  facebook: { label: 'Facebook', color: 'bg-blue-600 text-white', icon: '📘' },
  instagram: { label: 'Instagram', color: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white', icon: '📸' },
  threads: { label: 'Threads', color: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900', icon: '🧵' },
  telegram: { label: 'Telegram', color: 'bg-sky-500 text-white', icon: '✈️' },
  whatsapp: { label: 'WhatsApp', color: 'bg-emerald-600 text-white', icon: '💬' },
}

export function SocialMonitoringPage() {
  const [data, setData] = useState({
    total: 0,
    items: [],
    platform_counts: { all: 0, facebook: 0, instagram: 0, threads: 0, telegram: 0, whatsapp: 0 },
    urgency_counts: { P1_KRITIS: 0, P2_TINGGI: 0, P3_NORMAL: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Filters
  const [selectedPlatform, setSelectedPlatform] = useState('ALL')
  const [selectedUrgency, setSelectedUrgency] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Toast / Copy
  const [copiedText, setCopiedText] = useState('')

  // Agentic Autonomous Worker State
  const [agentStatus, setAgentStatus] = useState(null)
  const [pollingAgent, setPollingAgent] = useState(false)
  const [togglingAgent, setTogglingAgent] = useState(false)

  // Modal Manual Ingest State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [ingestForm, setIngestForm] = useState({
    platform: 'instagram',
    authorName: '',
    authorHandle: '',
    content: '',
    permalink: '',
    authorPhone: '',
    autoCreateTicket: true,
  })
  const [submittingIngest, setSubmittingIngest] = useState(false)
  const [ingestSuccessResult, setIngestSuccessResult] = useState(null)

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load feed data
  const loadFeed = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true)
      else setLoading(true)
      setError(null)

      const res = await socialApi.getFeed({
        platform: selectedPlatform,
        urgency: selectedUrgency,
      })
      setData(res)
    } catch (err) {
      console.error('Failed to load social feed:', err)
      setError(err.message || 'Gagal memuat stream feed media sosial.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Load agent worker status
  const loadAgentStatus = async () => {
    try {
      const status = await socialApi.getAgentStatus()
      setAgentStatus(status)
    } catch (err) {
      console.warn('Agent worker status unavailable:', err.message)
    }
  }

  // Toggle agent worker
  const handleToggleAgent = async () => {
    try {
      setTogglingAgent(true)
      const res = await socialApi.toggleAgent()
      await loadAgentStatus()
      setCopiedText(res.message || 'Status worker diperbarui!')
      setTimeout(() => setCopiedText(''), 2500)
    } catch (err) {
      alert(`Gagal mengubah status agent: ${err.message}`)
    } finally {
      setTogglingAgent(false)
    }
  }

  // Trigger poll on demand
  const handleTriggerPollNow = async () => {
    try {
      setPollingAgent(true)
      const res = await socialApi.triggerPollNow()
      if (res.detail?.ticket_id) {
        setCopiedText(`Tiket baru terbit otonom: ${res.detail.ticket_id}!`)
      } else if (res.detail?.action === 'SPAM_BLOCKED') {
        setCopiedText(`Konten spam diblokir otonom!`)
      } else {
        setCopiedText(`Siklus scraping selesai dianalisis.`)
      }
      setTimeout(() => setCopiedText(''), 3000)
      await loadAgentStatus()
      await loadFeed(true)
    } catch (err) {
      alert(`Gagal memicu scraping: ${err.message}`)
    } finally {
      setPollingAgent(false)
    }
  }

  useEffect(() => {
    loadFeed()
    loadAgentStatus()
  }, [selectedPlatform, selectedUrgency])

  const copyToClipboard = (text, type = 'Resi') => {
    if (!text || text === '-') return
    navigator.clipboard.writeText(text)
    setCopiedText(`${type} disalin!`)
    setTimeout(() => setCopiedText(''), 2000)
  }

  // Handle Submit Ingest Manual
  const handleSubmitIngest = async (e) => {
    e.preventDefault()
    if (!ingestForm.content.trim()) return

    try {
      setSubmittingIngest(true)
      const res = await socialApi.ingestPost(ingestForm)
      setIngestSuccessResult(res)
      // Refresh feed
      loadFeed(true)
    } catch (err) {
      alert(`Gagal memproses postingan: ${err.message}`)
    } finally {
      setSubmittingIngest(false)
    }
  }

  // Filtered by search text
  const filteredItems = useMemo(() => {
    if (!data.items) return []
    if (!debouncedSearch.trim()) return data.items

    const q = debouncedSearch.toLowerCase().trim()
    return data.items.filter((item) => {
      const matchAuthor = (item.author_name || '').toLowerCase().includes(q)
      const matchHandle = (item.author_handle || '').toLowerCase().includes(q)
      const matchContent = (item.content || '').toLowerCase().includes(q)
      const matchResi = (item.shipment_number || '').toLowerCase().includes(q)
      const matchTicket = (item.ticket_id || '').toLowerCase().includes(q)
      return matchAuthor || matchHandle || matchContent || matchResi || matchTicket
    })
  }, [data.items, debouncedSearch])

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
        eyebrow="OMNICHANNEL SOCIAL MEDIA AI · EFDS-DEV-TEAM"
        title="Monitoring Medsos & Telegram AI (Omnichannel Intake)"
        subtitle="Pemantauan Real-Time Keluhan Pelanggan Pos Indonesia di Facebook, Threads, Instagram, dan Telegram dengan Triase Otomatis"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-950/40 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500"></span>
              </span>
              Social Listener 24/7 Aktif
            </div>

            <button
              type="button"
              onClick={() => loadFeed(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              {refreshing ? 'Memperbarui...' : 'Segarkan Feed'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIngestSuccessResult(null)
                setIngestForm({
                  platform: 'instagram',
                  authorName: '',
                  authorHandle: '',
                  content: '',
                  permalink: '',
                  authorPhone: '',
                  autoCreateTicket: true,
                })
                setIsModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Ingest Manual URL / Teks
            </button>
          </div>
        }
      />

      {/* Error Banner jika ada masalah */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-rose-800 dark:text-rose-300 shadow-sm">
          <AlertOctagon className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-sm">Gagal Mengambil Stream Medsos</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Autonomous Agentic Ingestion & Scraping Control Bar */}
      <Card className="overflow-hidden border-blue-200 dark:border-blue-900/50 bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-purple-50/40 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition ${
                agentStatus?.is_running
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/40 animate-pulse'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Autonomous Agentic Omni-Scraper CCH
                </h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    agentStatus?.is_running
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      agentStatus?.is_running ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
                    }`}
                  />
                  {agentStatus?.is_running ? 'WORKER AKTIF (AUTO-INTAKE)' : 'STANDBY / PAUSED'}
                </span>
                {agentStatus?.environment && (
                  <span className="rounded-full bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700">
                    ENV: {agentStatus.environment}
                  </span>
                )}
                {agentStatus?.primary_llm && (
                  <span className="rounded-full bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    AI: {agentStatus.primary_llm.toUpperCase()} ({agentStatus.llm_model || 'Auto'})
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Menyisir mention medsos publik & Telegram, ekstraksi resi otomatis, proteksi spam, serta auto-ticket MariaDB CCH (Status 101 ENTRI).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleTriggerPollNow}
              disabled={pollingAgent}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`h-3.5 w-3.5 ${pollingAgent ? 'animate-spin' : ''}`} />
              {pollingAgent ? 'Menyisir & Intake...' : 'Scrape & Intake Sekarang'}
            </button>

            <button
              type="button"
              onClick={handleToggleAgent}
              disabled={togglingAgent}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-sm transition border ${
                agentStatus?.is_running
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
              }`}
            >
              {agentStatus?.is_running ? 'Hentikan Worker' : 'Aktifkan Worker'}
            </button>
          </div>
        </div>

        {/* Info stats sub-bar */}
        {agentStatus && (
          <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center gap-y-2 gap-x-6 text-[11px] text-slate-600 dark:text-slate-400">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Total Scraped: </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {agentStatus.total_scraped || 0}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Tiket Terbit Otonom: </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {agentStatus.total_tickets_created || 0}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Spam Dicegah: </span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                {agentStatus.total_spam_blocked || 0}
              </span>
            </div>
            {agentStatus.last_poll_time && (
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Polling Terakhir: </span>
                <span>{new Date(agentStatus.last_poll_time).toLocaleTimeString('id-ID')} WIB</span>
              </div>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Platform Terhubung: </span>
              <span className="font-medium text-slate-500">IG, Threads, Telegram, FB, WA</span>
            </div>
          </div>
        )}
      </Card>

      {/* 4 StatCards Ringkasan */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Postingan Terpantau"
          value={loading ? '...' : `${data.platform_counts.all || 0} Post`}
          icon={Radio}
          tone="brand"
          hint="4 Platform: FB, Threads, IG, Telegram"
        />

        <StatCard
          label="Sentimen Kritis (P1)"
          value={loading ? '...' : `${data.urgency_counts.P1_KRITIS || 0} Kasus`}
          icon={ShieldAlert}
          tone="rose"
          hint="Ancaman Hukum / Obat Darurat / Viral"
        />

        <StatCard
          label="Tiket CCH Terbit Otomatis"
          value={loading ? '...' : `${data.items.filter((i) => i.ticket_id).length} Tiket`}
          icon={Bot}
          tone="emerald"
          hint="Langsung Status 101 ENTRI di MariaDB"
        />

        <StatCard
          label="Platform Paling Aktif"
          value="Instagram & Threads"
          icon={Share2}
          tone="amber"
          hint={`${(data.platform_counts.instagram || 0) + (data.platform_counts.threads || 0)} aduan masuk hari ini`}
        />
      </div>

      {/* Filter Tabs Platform & Kontrol */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Platform Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'Semua Platform', count: data.platform_counts.all, icon: '🌐' },
              { id: 'facebook', label: 'Facebook', count: data.platform_counts.facebook, icon: '📘' },
              { id: 'threads', label: 'Threads', count: data.platform_counts.threads, icon: '🧵' },
              { id: 'instagram', label: 'Instagram', count: data.platform_counts.instagram, icon: '📸' },
              { id: 'telegram', label: 'Telegram', count: data.platform_counts.telegram, icon: '✈️' },
              { id: 'whatsapp', label: 'WhatsApp', count: data.platform_counts.whatsapp, icon: '💬' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlatform(p.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  selectedPlatform === p.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                    selectedPlatform === p.id
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {p.count || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Urgency Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              Urgensi:
            </span>
            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm outline-none"
            >
              <option value="ALL">Semua Urgensi</option>
              <option value="P1_KRITIS">P1 Kritis (24 Jam)</option>
              <option value="P2_TINGGI">P2 Tinggi (48 Jam)</option>
              <option value="P3_NORMAL">P3 Normal (72 Jam)</option>
            </select>
          </div>
        </div>

        {/* Search Bar Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari teks keluhan medsos, nomor resi, username pengadu, atau nomor tiket CCH..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition shadow-inner"
          />
        </div>
      </Card>

      {/* Stream Feed Cards Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-slate-400">
            <RefreshCw className="h-8 w-8 mx-auto text-blue-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Menghubungkan ke Social Ingestion Worker...
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-slate-400">
            <Radio className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Tidak ada postingan keluhan yang cocok dengan filter.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const platformCfg = PLATFORM_CONFIG[item.platform] || PLATFORM_CONFIG.all
            return (
              <Card
                key={item.id}
                className={`overflow-hidden border transition hover:shadow-md ${
                  item.urgency_level === 'P1_KRITIS'
                    ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/20 dark:bg-rose-950/10'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Top Bar: Platform, Author, Timestamp, Urgency */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {/* Platform Tag */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-xs ${platformCfg.color}`}
                      >
                        <span>{platformCfg.icon}</span>
                        <span>{platformCfg.label}</span>
                      </span>

                      {/* Author Info */}
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                          {item.author_name}
                          <span className="text-[11px] font-normal text-slate-400">
                            ({item.author_handle})
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.timestamp}
                        </p>
                      </div>
                    </div>

                    {/* Right Badges: Sentiment & Urgency */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Sentimen Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          item.sentiment?.sentiment === 'sangat_marah'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                            : item.sentiment?.sentiment === 'kecewa'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                            : item.sentiment?.sentiment === 'positif'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {item.sentiment?.sentiment === 'sangat_marah' && '😡 Sangat Marah'}
                        {item.sentiment?.sentiment === 'kecewa' && '😟 Kecewa'}
                        {item.sentiment?.sentiment === 'netral' && '😐 Netral'}
                        {item.sentiment?.sentiment === 'positif' && '😊 Puas'}
                        <span className="text-[10px] opacity-75">({item.sentiment?.score})</span>
                      </span>

                      {/* Urgensi Badge */}
                      <span
                        className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                          item.urgency_level === 'P1_KRITIS'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : item.urgency_level === 'P2_TINGGI'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                        }`}
                      >
                        {item.urgency_level.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3.5 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                    {item.content}
                  </div>

                  {/* Resi & Metadata Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    {/* Resi Box */}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium">Resi Terdeteksi:</span>
                      {item.shipment_number ? (
                        <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 px-2 py-1 font-mono font-bold text-blue-700 dark:text-blue-300">
                          <span>{item.shipment_number}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.shipment_number, 'Resi')}
                            className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200"
                            title="Salin Resi"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Tidak ada resi</span>
                      )}

                      {item.permalink && (
                        <a
                          href={item.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Lihat Post Asli
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {/* Official CCH Ticket Status */}
                    <div>
                      {item.ticket_id ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            Tiket CCH: {item.ticket_id} (101 ENTRI)
                          </span>
                          <Link
                            to={complaintDetailPath({ id: item.ticket_id, status_code: item.status_code })}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                          >
                            Buka Investigasi
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Belum terbit tiket CCH</span>
                      )}
                    </div>
                  </div>

                  {/* De-escalation Auto-Reply Preview */}
                  {item.de_escalation_reply && (
                    <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 p-3 text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
                        <Bot className="h-3.5 w-3.5 text-blue-600" />
                        <span>Balasan De-Eskalasi Otomatis (Terkirim ke Pengadu):</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic">
                        "{item.de_escalation_reply}"
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Modal Dialog Ingest Manual Postingan Medsos */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300">
                  <Share2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Ingest Manual Keluhan Medsos
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tarik komentar/postingan medsos langsung menjadi Tiket Resmi CCH
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitIngest} className="p-6 space-y-4 overflow-y-auto text-xs">
              {ingestSuccessResult ? (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Tiket CCH Berhasil Diterbitkan!</span>
                  </div>
                  <div className="space-y-1 text-slate-700 dark:text-slate-300">
                    <p>
                      <strong>No. Tiket Resmi:</strong>{' '}
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {ingestSuccessResult.ticket?.ticket_id}
                      </span>
                    </p>
                    <p>
                      <strong>Resi Terdeteksi:</strong> {ingestSuccessResult.extracted?.shipment_number || '-'}
                    </p>
                    <p>
                      <strong>Tingkat Urgensi:</strong> {ingestSuccessResult.sentiment?.urgency_level}
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-full rounded-xl bg-emerald-600 py-2 font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                    >
                      Tutup & Lihat di Feed
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Pilihan Platform */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Platform Medsos:</label>
                    <select
                      value={ingestForm.platform}
                      onChange={(e) => setIngestForm({ ...ingestForm, platform: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                    >
                      <option value="instagram">📸 Instagram</option>
                      <option value="threads">🧵 Threads</option>
                      <option value="facebook">📘 Facebook</option>
                      <option value="telegram">✈️ Telegram</option>
                      <option value="whatsapp">💬 WhatsApp</option>
                    </select>
                  </div>

                  {/* Nama & Handle */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">Nama Pengadu:</label>
                      <input
                        type="text"
                        required
                        value={ingestForm.authorName}
                        onChange={(e) => setIngestForm({ ...ingestForm, authorName: e.target.value })}
                        placeholder="Contoh: Dewi Lestari"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">Username / Handle:</label>
                      <input
                        type="text"
                        required
                        value={ingestForm.authorHandle}
                        onChange={(e) => setIngestForm({ ...ingestForm, authorHandle: e.target.value })}
                        placeholder="Contoh: @dewi_lestari"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                      />
                    </div>
                  </div>

                  {/* Isi Komplain */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Teks Keluhan / Komentar Pelanggan:
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={ingestForm.content}
                      onChange={(e) => setIngestForm({ ...ingestForm, content: e.target.value })}
                      placeholder="Tempel teks komentar pelanggan di sini (misal: Paket saya resi POS123456ID belum sampai...)"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none leading-relaxed"
                    />
                  </div>

                  {/* URL Permalink */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      URL Tautan Postingan (Opsional):
                    </label>
                    <input
                      type="url"
                      value={ingestForm.permalink}
                      onChange={(e) => setIngestForm({ ...ingestForm, permalink: e.target.value })}
                      placeholder="https://instagram.com/p/... atau https://facebook.com/..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submittingIngest}
                      className="w-full rounded-xl bg-blue-600 py-2.5 font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submittingIngest ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Menganalisis & Menerbitkan Tiket CCH...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Ekstrak & Terbitkan Tiket Resmi CCH (Status 101)</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

