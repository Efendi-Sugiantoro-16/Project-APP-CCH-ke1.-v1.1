import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  CalendarRange,
  CheckCircle2,
  Clock,
  FileClock,
  Inbox,
  Megaphone,
  PackageCheck,
  Plus,
  RefreshCw,
  Send,
  Ticket,
  X,
} from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { complaintApi } from '../api/complaintApi.js'
import { followUpsApi } from '../../followups/api/followUpsApi.js'
import { mastersApi } from '../../admin/api/mastersApi.js'
import { PageHeader } from '../../../shared/ui/PageHeader.jsx'
import { StatCard } from '../../../shared/ui/StatCard.jsx'
import { Card, CardHeader } from '../../../shared/ui/Card.jsx'
import { Button } from '../../../shared/ui/Button.jsx'
import { StateBox } from '../../../shared/ui/StateBox.jsx'
import { cx } from '../../../shared/ui/cx.js'
import { StatusBadge } from '../components/StatusBadge.jsx'
import { ComplaintTable } from '../components/ComplaintTable.jsx'
import { QuickComplaintModal } from '../components/create/QuickComplaintModal.jsx'
import { formatDateTime } from '../format.js'
import { useWorkspaceApi } from '../useWorkspaceApi.js'

function formatYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getPresetRange(key) {
  const now = new Date()
  switch (key) {
    case 'today': {
      const ymd = formatYMD(now)
      return { from: ymd, to: ymd, label: 'Hari Ini' }
    }
    case 'last7': {
      const past = new Date()
      past.setDate(now.getDate() - 6)
      return { from: formatYMD(past), to: formatYMD(now), label: '7 Hari Terakhir' }
    }
    case 'last30': {
      const past = new Date()
      past.setDate(now.getDate() - 29)
      return { from: formatYMD(past), to: formatYMD(now), label: '30 Hari Terakhir' }
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { from: formatYMD(start), to: formatYMD(end), label: 'Bulan Ini' }
    }
    case 'all':
    default:
      return { from: '', to: '', label: 'Semua Waktu' }
  }
}

function useDashboard(token, dateRange) {
  const { from, to } = dateRange || {}
  return useWorkspaceApi(
    () => {
      if (!token) return Promise.resolve({ counts: null, open: [], dueToday: [], overdueList: [] })
      const queryParams = {
        from: from || undefined,
        to: to || undefined,
      }
      return Promise.all([
        complaintApi.countOpen(token, queryParams),
        complaintApi.countReceivedOpen(token, queryParams),
        complaintApi.countSentOpen(token, queryParams),
        complaintApi.countCompleted(token, queryParams),
        complaintApi.countRequestClose(token, queryParams),
        followUpsApi.countOverdue(token, queryParams),
        complaintApi.listOpen(token, { limit: 5 }),
        followUpsApi.listDueToday(token, { limit: 5 }),
        followUpsApi.listOverdue(token, { limit: 5, ...queryParams }),
      ]).then(([open, received, sent, completed, requestClose, overdue, openList, dueToday, overdueList]) => ({
        counts: { open, received, sent, completed, requestClose, overdue },
        open: openList,
        dueToday,
        overdueList,
      }))
    },
    [token, from, to],
  )
}

export function WorkspaceDashboard() {
  const { token } = useContext(AuthContext)
  const [activePreset, setActivePreset] = useState('all')
  const [dateRange, setDateRange] = useState({ from: '', to: '', label: 'Semua Waktu' })
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [followUpTab, setFollowUpTab] = useState('dueToday')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState({})

  useEffect(() => {
    if (!token) return
    mastersApi.announcements.list(token)
      .then((res) => {
        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])
        const active = list.filter((a) => a.is_active)
        setAnnouncements(active)
      })
      .catch(() => setAnnouncements([]))
  }, [token])

  const { data, loading, error, refresh } = useDashboard(token, dateRange)
  const counts = data?.counts
  const open = data?.open || []
  const dueToday = data?.dueToday || []
  const overdueList = data?.overdueList || []

  function handlePresetClick(key) {
    setActivePreset(key)
    if (key === 'custom') {
      const now = new Date()
      const past30 = new Date()
      past30.setDate(now.getDate() - 29)
      const defaultFrom = formatYMD(past30)
      const defaultTo = formatYMD(now)
      setCustomFrom(defaultFrom)
      setCustomTo(defaultTo)
      setDateRange({ from: defaultFrom, to: defaultTo, label: `${defaultFrom} s/d ${defaultTo}` })
    } else {
      const preset = getPresetRange(key)
      setDateRange(preset)
    }
  }

  function handleCustomSubmit(e) {
    e.preventDefault()
    if (customFrom && customTo) {
      setDateRange({
        from: customFrom,
        to: customTo,
        label: `${customFrom} s/d ${customTo}`,
      })
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Call Center Workspace"
        title="Ringkasan pengaduan"
        subtitle="Pantau tiket terbuka, diterima, dikirim, selesai, follow-up overdue, dan permohonan tutup sesuai kebijakan kantor Anda."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              className="gap-2 shadow-sm font-semibold"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={16} />
              Buat Pengaduan Baru
            </Button>
            <Button variant="secondary" onClick={() => void refresh()}>
              <RefreshCw size={15} className={loading ? 'animate-spin-slow' : ''} />
              Muat ulang
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="alert alert-error mb-6" role="alert">
          <span>{error}</span>
        </div>
      ) : null}

      {/* Date Range Filter Bar */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">
              <CalendarRange size={15} className="text-blue-600 dark:text-blue-400" />
              Periode Tanggal:
            </span>
            {[
              { id: 'all', label: 'Semua Waktu' },
              { id: 'today', label: 'Hari Ini' },
              { id: 'last7', label: '7 Hari Terakhir' },
              { id: 'last30', label: '30 Hari Terakhir' },
              { id: 'thisMonth', label: 'Bulan Ini' },
              { id: 'custom', label: 'Kustom' },
            ].map((preset) => {
              const isActive = activePreset === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetClick(preset.id)}
                  className={cx(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                  )}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>

          {activePreset !== 'all' && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                {dateRange.label || `${dateRange.from} s/d ${dateRange.to}`}
              </span>
              <button
                type="button"
                onClick={() => handlePresetClick('all')}
                className="text-xs text-slate-400 hover:text-slate-600 underline dark:hover:text-slate-200"
              >
                Reset Filter
              </button>
            </div>
          )}
        </div>

        {/* Custom Date Range Picker inputs when 'custom' is active */}
        {activePreset === 'custom' && (
          <form
            onSubmit={handleCustomSubmit}
            className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-800"
          >
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Dari:</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Sampai:</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                required
              />
            </div>
            <Button size="sm" type="submit" variant="primary">
              Terapkan
            </Button>
          </form>
        )}
      </div>

      {/* Dynamic Announcement Banner from cch_announcement */}
      {announcements
        .filter((a) => !dismissedAnnouncements[a.id])
        .slice(0, 1)
        .map((a) => (
          <div
            key={a.id}
            className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50/80 to-blue-50 p-4 text-blue-950 shadow-sm dark:border-blue-900/50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 dark:text-blue-100"
          >
            <div className="flex items-start gap-3 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <Megaphone size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-200/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:bg-blue-900/70 dark:text-blue-300">
                    Pengumuman Resmi
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {a.topic}
                  </h4>
                </div>
                <div
                  className="mt-1 text-xs text-slate-600 dark:text-slate-300 [&_p]:my-0.5 [&_strong]:font-semibold [&_img]:inline-block [&_img]:h-4 [&_img]:align-middle"
                  dangerouslySetInnerHTML={{ __html: a.message }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDismissedAnnouncements((prev) => ({ ...prev, [a.id]: true }))}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 shrink-0"
              title="Tutup pengumuman"
            >
              <X size={16} />
            </button>
          </div>
        ))}

      {/* Overdue Alert Banner if overdue followups exist */}
      {counts?.overdue > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-rose-800 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-400">
              <AlertTriangle size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold">
                Perhatian: Terdapat {counts.overdue} Follow-Up Kadaluarsa (Overdue)!
              </p>
              <p className="text-xs text-rose-600/90 dark:text-rose-300/80">
                Follow-up ini belum direalisasi dan telah melewati tanggal rencana tindak lanjut.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFollowUpTab('overdue')}
            className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
          >
            Lihat Overdue
          </button>
        </div>
      )}

      {/* 6 StatCards Grid: 100% Identik dengan views/Dashboard2.php */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Tiket Terbuka"
          value={counts?.open}
          icon={Ticket}
          tone="brand"
          hint="Total pengaduan aktif"
          to="/workspace/complaints/open"
        />
        <StatCard
          label="Diterima"
          value={counts?.received}
          icon={Inbox}
          tone="sky"
          hint="Tiket masuk terbuka"
          to="/workspace/complaints/received-open"
        />
        <StatCard
          label="Dikirim"
          value={counts?.sent}
          icon={Send}
          tone="indigo"
          hint="Tiket keluar terbuka"
          to="/workspace/complaints/sent-open"
        />
        <StatCard
          label="Selesai"
          value={counts?.completed}
          icon={CheckCircle2}
          tone="green"
          hint="Status akhir selesai (109)"
          to="/workspace/complaints/completed"
        />
        <StatCard
          label="Follow-Up Overdue"
          value={counts?.overdue}
          icon={AlertTriangle}
          tone="rose"
          hint="Lewat tanggal rencana"
          to="/workspace/follow-ups"
        />
        <StatCard
          label="Mohon Ditutup"
          value={counts?.requestClose}
          icon={FileClock}
          tone="amber"
          hint="Request tutup tiket (1)"
          to="/workspace/complaints/open"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Tiket terbuka terbaru"
            subtitle="Tiket aktif yang terlihat oleh kantor Anda."
            actions={
              <Link to="/workspace/complaints/open" className="btn btn-secondary btn-sm">
                Lihat semua
              </Link>
            }
          />
          <div className="p-1 sm:p-2">
            <StateBox
              loading={loading}
              loadingLabel="Memuat tiket terbuka…"
              isEmpty={!loading && open.length === 0}
              empty={<div className="state-box border-0 shadow-none">Tidak ada tiket terbuka.</div>}
            >
              <ComplaintTable items={open} variant="open" title="terbuka" />
            </StateBox>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFollowUpTab('dueToday')}
                    className={cx(
                      'text-sm font-semibold transition',
                      followUpTab === 'dueToday'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200',
                    )}
                  >
                    Jatuh tempo ({dueToday.length})
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => setFollowUpTab('overdue')}
                    className={cx(
                      'text-sm font-semibold transition',
                      followUpTab === 'overdue'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200',
                    )}
                  >
                    Kadaluarsa ({counts?.overdue ?? 0})
                  </button>
                </div>
              }
              subtitle={
                followUpTab === 'dueToday'
                  ? 'Belum direalisasi hari ini.'
                  : 'Rencana tindak lanjut yang terlewat.'
              }
              actions={
                <Link
                  to={followUpTab === 'dueToday' ? '/workspace/follow-ups/due-today' : '/workspace/follow-ups'}
                  className="btn btn-secondary btn-sm"
                >
                  Lihat
                </Link>
              }
            />
            <div className="p-4">
              {followUpTab === 'dueToday' ? (
                <StateBox
                  loading={loading}
                  loadingLabel="Memuat follow-up…"
                  isEmpty={!loading && dueToday.length === 0}
                  empty={
                    <div className="state-box border-0 shadow-none">
                      <PackageCheck size={22} className="text-slate-400" />
                      Tidak ada follow-up jatuh tempo hari ini.
                    </div>
                  }
                >
                  <ul className="space-y-3">
                    {dueToday.map((entry) => (
                      <FollowUpListItem key={`${entry.complaint_id}-${entry.office_code}-${entry.status_code}`} entry={entry} />
                    ))}
                  </ul>
                </StateBox>
              ) : (
                <StateBox
                  loading={loading}
                  loadingLabel="Memuat follow-up kadaluarsa…"
                  isEmpty={!loading && overdueList.length === 0}
                  empty={
                    <div className="state-box border-0 shadow-none">
                      <CheckCircle2 size={22} className="text-emerald-500" />
                      Semua follow-up tepat waktu.
                    </div>
                  }
                >
                  <ul className="space-y-3">
                    {overdueList.map((entry) => (
                      <FollowUpListItem
                        key={`${entry.complaint_id}-${entry.office_code}-${entry.status_code}`}
                        entry={entry}
                        isOverdue
                      />
                    ))}
                  </ul>
                </StateBox>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Akses cepat" />
            <div className="grid grid-cols-2 gap-3 p-4">
              <QuickLink to="/workspace/complaints/received-open" icon={Inbox} label="Diterima" />
              <QuickLink to="/workspace/complaints/sent-open" icon={Send} label="Dikirim" />
              <QuickLink to="/workspace/complaints/completed" icon={CheckCircle2} label="Selesai" />
              <QuickLink to="/workspace/follow-ups" icon={CalendarCheck} label="Follow-up" />
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Complaint Modal */}
      <QuickComplaintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

function FollowUpListItem({ entry, isOverdue }) {
  return (
    <li className={cx(
      'flex items-start gap-3 rounded-xl border p-3 transition',
      isOverdue
        ? 'border-rose-100 bg-rose-50/30 dark:border-rose-900/30 dark:bg-rose-950/20'
        : 'border-slate-100 dark:border-slate-800'
    )}>
      <span className={cx(
        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
        isOverdue
          ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-400'
          : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
      )}>
        {isOverdue ? <Clock size={16} /> : <CalendarCheck size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          to={`/workspace/complaints/open/${entry.complaint_id}`}
          className={cx(
            'mono text-xs font-semibold hover:underline',
            isOverdue ? 'text-rose-600 hover:text-rose-700 dark:text-rose-400' : 'text-blue-600 hover:text-blue-700 dark:text-blue-400'
          )}
        >
          {entry.complaint_id}
        </Link>
        <p className="mt-1 line-clamp-1 text-sm text-slate-600 dark:text-slate-300">
          {entry.plan_notes || 'Tanpa catatan rencana.'}
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {entry.office_code} · {formatDateTime(entry.planned_at)}
        </p>
      </div>
      <StatusBadge code={entry.status_code} />
    </li>
  )
}

function QuickLink({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-blue-100 group-hover:text-blue-600 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-blue-900 dark:group-hover:text-blue-300">
        <Icon size={17} />
      </span>
      {label}
    </Link>
  )
}