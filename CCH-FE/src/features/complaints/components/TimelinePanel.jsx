import {
  Clock3,
  Loader2,
  Flag,
  ArrowRightLeft,
  Clock,
  CheckSquare,
  ShieldCheck,
  User,
  Building2,
  Sparkles,
} from 'lucide-react'
import { StatusBadge } from './StatusBadge.jsx'
import { Card, CardHeader } from '../../../shared/ui/Card.jsx'
import { Button } from '../../../shared/ui/Button.jsx'
import { formatDateTime, formatDuration } from '../format.js'

const STATUS_ICONS = {
  '101': { icon: Flag, bg: 'bg-blue-600 text-white ring-4 ring-blue-100' },
  '102': { icon: ArrowRightLeft, bg: 'bg-sky-600 text-white ring-4 ring-sky-100' },
  '103': { icon: Clock, bg: 'bg-amber-600 text-white ring-4 ring-amber-100' },
  '104': { icon: CheckSquare, bg: 'bg-violet-600 text-white ring-4 ring-violet-100' },
  '109': { icon: ShieldCheck, bg: 'bg-emerald-600 text-white ring-4 ring-emerald-100' },
}

function TimelineItem({ entry, isLatest }) {
  const conf = STATUS_ICONS[entry.status_code] || { icon: Clock, bg: 'bg-slate-600 text-white ring-4 ring-slate-100' }
  const Icon = conf.icon

  return (
    <li className="relative pb-6 pl-9 last:pb-2">
      {/* Connecting Vertical Bar */}
      <span
        className="absolute left-3.5 top-3.5 h-[calc(100%-0.5rem)] w-0.5 rounded-full bg-slate-200 last:h-4"
        aria-hidden="true"
      />

      {/* Status Pin Node */}
      <div
        className={`absolute left-0 top-1 w-7 h-7 rounded-full flex items-center justify-center shadow-xs transition-transform ${conf.bg}`}
      >
        <Icon size={13} className="stroke-[2.5]" />
      </div>

      {/* Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusBadge code={entry.status_code} label={entry.status_description} />
          {isLatest && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 font-mono">
              Status Terkini
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400 font-medium">{formatDateTime(entry.updated_at)}</span>
      </div>

      {/* Card Content Note */}
      <div className="mt-2.5 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
        <p className="break-words text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
          {entry.description || 'Tidak ada catatan penanganan.'}
        </p>

        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
              <User size={13} className="text-slate-400" />
              {entry.updated_by || '—'}
            </span>
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Building2 size={13} className="text-slate-400" />
              Kantor {entry.origin_office_code || '—'}
            </span>
          </div>

          {entry.duration_seconds !== null && entry.duration_seconds !== undefined && entry.duration_seconds > 0 ? (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              <Clock3 size={12} className="text-slate-400" />
              <span>+{formatDuration(entry.duration_seconds)}</span>
            </span>
          ) : null}
        </div>
      </div>
    </li>
  )
}

/** Status history timeline for a complaint ticket. */
export function TimelinePanel({ items, loading, error, reload }) {
  return (
    <Card className="rounded-2xl border border-slate-200/90 shadow-sm bg-white overflow-hidden">
      <CardHeader
        title="Timeline & Jejak Status Investigasi"
        subtitle="Riwayat kronologis mutasi status tiket pengaduan CCH."
        actions={
          <Button variant="secondary" size="sm" onClick={reload} className="cursor-pointer">
            Muat ulang
          </Button>
        }
      />
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="state-box border-0 py-8 shadow-none">
            <Loader2 size={22} className="animate-spin text-blue-500" />
            <span className="text-xs text-slate-500">Memuat riwayat investigasi…</span>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs" role="alert">
            <span>{error}</span>
          </div>
        ) : !items || items.length === 0 ? (
          <div className="state-box border-0 py-8 shadow-none text-xs text-slate-400">
            <span>Belum ada riwayat status.</span>
          </div>
        ) : (
          <ol className="mt-1">
            {items.map((entry, index) => (
              <TimelineItem
                key={`${entry.history_id || entry.updated_at}-${entry.status_code}-${index}`}
                entry={entry}
                isLatest={index === 0}
              />
            ))}
          </ol>
        )}
      </div>
    </Card>
  )
}
