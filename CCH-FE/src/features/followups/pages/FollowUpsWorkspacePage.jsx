import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CheckCircle2, ClipboardList, Loader2 } from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { followUpsApi } from '../api/followUpsApi.js'
import { PageHeader } from '../../../shared/ui/PageHeader.jsx'
import { Card, CardHeader } from '../../../shared/ui/Card.jsx'
import { StatusBadge } from '../../complaints/components/StatusBadge.jsx'
import { formatDateTime } from '../../complaints/format.js'
import { useWorkspaceApi } from '../../complaints/useWorkspaceApi.js'

function FollowUpList({ state, emptyLabel }) {
  if (state.loading) {
    return (
      <div className="state-box border-0 py-10 shadow-none">
        <Loader2 size={22} className="animate-spin-slow text-blue-500" />
        <span>Memuat…</span>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="alert alert-error m-4" role="alert">
        <span>{state.error}</span>
      </div>
    )
  }

  if (!state.data || state.data.length === 0) {
    return (
      <div className="state-box border-0 py-10 shadow-none">
        <ClipboardList size={24} className="text-slate-400" />
        <span>{emptyLabel}</span>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-slate-100">
      {state.data.map((entry) => (
        <li key={`${entry.complaint_id}-${entry.office_code}-${entry.status_code}`} className="flex items-start gap-3 p-4">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            {entry.realized_at ? <CheckCircle2 size={17} /> : <CalendarCheck size={17} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/workspace/complaints/open/${entry.complaint_id}`}
                className="mono text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                {entry.complaint_id}
              </Link>
              <StatusBadge code={entry.status_code} />
              <span className="mono text-xs text-slate-400">{entry.office_code}</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-600">{entry.plan_notes || 'Tidak ada catatan rencana.'}</p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>Rencana {formatDateTime(entry.planned_at)}</span>
              {entry.realized_at ? (
                <span className="font-medium text-emerald-600">Realisasi {formatDateTime(entry.realized_at)}</span>
              ) : (
                <span className="font-medium text-amber-600">Belum direalisasi</span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function FollowUpsWorkspacePage() {
  const { token } = useContext(AuthContext)
  const office = useWorkspaceApi(() => followUpsApi.listForOffice(token, { limit: 8 }), [token])
  const dueToday = useWorkspaceApi(() => followUpsApi.listDueToday(token, { limit: 8 }), [token])

  return (
    <div>
      <PageHeader
        eyebrow="Call Center Workspace"
        title="Follow-up"
        subtitle="Rencana dan realisasi tindak lanjut kantor Anda, termasuk yang jatuh tempo hari ini."
        actions={
          <Link to="/workspace/follow-ups/all" className="btn btn-secondary">
            Lihat semua
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Jatuh tempo hari ini"
            subtitle="Belum direalisasi."
            actions={
              <Link to="/workspace/follow-ups/due-today" className="btn btn-secondary btn-sm">
                Lihat
              </Link>
            }
          />
          <FollowUpList state={dueToday} emptyLabel="Tidak ada follow-up jatuh tempo hari ini." />
        </Card>
        <Card>
          <CardHeader
            title="Follow-up kantor Anda"
            subtitle="Rencana terbaru."
            actions={
              <Link to="/workspace/follow-ups/all" className="btn btn-secondary btn-sm">
                Lihat
              </Link>
            }
          />
          <FollowUpList state={office} emptyLabel="Tidak ada follow-up untuk kantor Anda." />
        </Card>
      </div>
    </div>
  )
}