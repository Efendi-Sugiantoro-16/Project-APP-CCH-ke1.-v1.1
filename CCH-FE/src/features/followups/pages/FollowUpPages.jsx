import { useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ClipboardList, Loader2 } from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { followUpsApi } from '../api/followUpsApi.js'
import { PageHeader } from '../../../shared/ui/PageHeader.jsx'
import { Card } from '../../../shared/ui/Card.jsx'
import { Pagination } from '../../../shared/ui/Pagination.jsx'
import { StatusBadge } from '../../complaints/components/StatusBadge.jsx'
import { formatDateTime } from '../../complaints/format.js'
import { useWorkspaceApi } from '../../complaints/useWorkspaceApi.js'

const PAGE_SIZE = 25

function FollowUpTable({ items }) {
  if (!items || items.length === 0) return null

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID tiket</th>
            <th>Kantor</th>
            <th className="text-center">Status</th>
            <th>Rencana</th>
            <th>Realisasi</th>
            <th>Catatan</th>
          </tr>
        </thead>
        <tbody>
          {items.map((entry) => (
            <tr key={`${entry.complaint_id}-${entry.office_code}-${entry.status_code}`}>
              <td>
                <Link
                  to={`/workspace/complaints/open/${entry.complaint_id}`}
                  className="mono text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  {entry.complaint_id}
                </Link>
              </td>
              <td>
                <span className="mono text-xs text-slate-600">{entry.office_code}</span>
              </td>
              <td className="text-center">
                <div className="flex justify-center">
                  <StatusBadge code={entry.status_code} />
                </div>
              </td>
              <td>
                <span className="whitespace-nowrap text-xs text-slate-500">
                  {formatDateTime(entry.planned_at)}
                </span>
              </td>
              <td>
                {entry.realized_at ? (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-emerald-600">
                    <CheckCircle2 size={13} /> {formatDateTime(entry.realized_at)}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-amber-600">Belum</span>
                )}
              </td>
              <td className="max-w-xs">
                <span className="line-clamp-2 text-slate-600">{entry.plan_notes || '—'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FollowUpListScreen({ title, subtitle, emptyTitle, loadPage }) {
  const { token } = useContext(AuthContext)
  const [pageSize, setPageSize] = useState(25)
  const [offset, setOffset] = useState(0)
  const state = useWorkspaceApi(() => loadPage(token, { limit: pageSize, offset }), [token, offset, pageSize, loadPage])
  const items = state.data || []

  return (
    <div>
      <PageHeader eyebrow="Call Center Workspace" title={title} subtitle={subtitle} />
      <Card>
        {state.loading ? (
          <div className="state-box border-0 shadow-none">
            <Loader2 size={24} className="animate-spin-slow text-blue-500" />
            <span>Memuat…</span>
          </div>
        ) : state.error ? (
          <div className="alert alert-error m-4" role="alert">
            <span>{state.error}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="state-box border-0 shadow-none">
            <ClipboardList size={26} className="text-slate-400" />
            <strong className="text-slate-700">{emptyTitle}</strong>
          </div>
        ) : (
          <>
            <FollowUpTable items={items} />
            <Pagination
              offset={offset}
              count={items.length}
              perPage={pageSize}
              loading={state.loading}
              onPage={setOffset}
              pageSizeOptions={[10, 25, 50, 100]}
              onPerPageChange={(newSize) => {
                setPageSize(newSize)
                setOffset(0)
              }}
              label="rencana follow-up"
            />
          </>
        )}
      </Card>
    </div>
  )
}

export function OfficeFollowUpsPage() {
  return (
    <FollowUpListScreen
      title="Follow-up kantor"
      subtitle="Rencana tindak lanjut milik kantor Anda yang belum atau telah direalisasikan."
      emptyTitle="Tidak ada follow-up untuk kantor Anda."
      loadPage={(token, params) => followUpsApi.listForOffice(token, params)}
    />
  )
}

export function DueTodayFollowUpsPage() {
  return (
    <FollowUpListScreen
      title="Jatuh tempo hari ini"
      subtitle="Follow-up terjadwal hari ini yang belum direalisasikan."
      emptyTitle="Tidak ada follow-up jatuh tempo hari ini."
      loadPage={(token, params) => followUpsApi.listDueToday(token, params)}
    />
  )
}