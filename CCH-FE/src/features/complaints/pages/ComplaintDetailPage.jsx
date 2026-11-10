import { useContext, useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Trash2, CheckCircle2, X, Share2, Printer } from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { complaintApi } from '../api/complaintApi.js'
import { followUpsApi } from '../../followups/api/followUpsApi.js'
import { ComplaintInfoPanel } from '../components/ComplaintInfoPanel.jsx'
import { TimelinePanel } from '../components/TimelinePanel.jsx'
import { FollowUpPanel } from '../components/FollowUpPanel.jsx'
import { DocumentsPanel } from '../components/DocumentsPanel.jsx'
import { StatusActionsPanel } from '../components/StatusActionsPanel.jsx'
import { DetailError, DetailLoading } from '../components/DetailStates.jsx'
import { documentApi } from '../../documents/api/documentApi.js'
import { useWorkspaceApi } from '../useWorkspaceApi.js'
import { PageHeader } from '../../../shared/ui/PageHeader.jsx'
import { StatusBadge } from '../components/StatusBadge.jsx'
import { DeleteComplaintModal } from '../components/DeleteComplaintModal.jsx'

export function ComplaintDetailPage({ completed = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { token, user } = useContext(AuthContext)

  const [reloadKey, setReloadKey] = useState(0)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [successBanner, setSuccessBanner] = useState(location.state?.successMessage || '')

  const reload = () => setReloadKey((key) => key + 1)

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessBanner(location.state.successMessage)
    }
  }, [location.state])

  const detail = useWorkspaceApi(() => {
    if (!id || !token) return Promise.resolve(null)
    const getter = completed ? complaintApi.getCompleted : complaintApi.getOpen
    return getter(token, id)
  }, [id, token, reloadKey, completed])

  const history = useWorkspaceApi(() => {
    if (!id || !token) return Promise.resolve([])
    const historyGetter = completed ? complaintApi.listCompletedHistory : complaintApi.listOpenHistory
    return historyGetter(token, id, { limit: 100 })
  }, [id, token, reloadKey, completed])

  const followUps = useWorkspaceApi(() => {
    // Backend exposes follow-ups only for open tickets; skip to avoid a 404.
    if (!id || !token || completed) return Promise.resolve([])
    return followUpsApi.listForTicket(token, id)
  }, [id, token, reloadKey, completed])

  const documents = useWorkspaceApi(() => {
    if (!id || !token) return Promise.resolve([])
    return documentApi.listForTicket(token, id, { completed })
  }, [id, token, reloadKey, completed])

  const documentFiles = useWorkspaceApi(() => {
    if (!id || !token) return Promise.resolve([])
    return documentApi.listFilesForTicket(token, id, { completed })
  }, [id, token, reloadKey, completed])

  /**
   * Status transitions can close a ticket (109). The open detail endpoint
   * excludes closed tickets, so refetching it would 404. Navigate to the
   * completed detail route instead.
   */
  function handleTransitioned(nextStatusCode) {
    if (String(nextStatusCode) === '109' && !completed) {      navigate(`/workspace/complaints/completed/${id}`, {
        replace: true,
        state: { successMessage: 'Tiket telah diselesaikan (109) dan dipindahkan ke daftar selesai.' },
      })
      return
    }
    reload()
  }

  if (detail.loading) return <DetailLoading />
  if (detail.error || !detail.data) return <DetailError message={detail.error} />

  const data = detail.data

  const handleDeleteSuccess = () => {
    navigate(completed ? '/workspace/complaints/completed' : '/workspace/complaints/open', {
      replace: true,
    })
  }

  return (
    <div className="complaint-detail-page space-y-6">
      <PageHeader
        eyebrow="Call Center Workspace"
        backTo={completed ? '/workspace/complaints/completed' : '/workspace/complaints/open'}
        backLabel={completed ? 'Kembali ke tiket selesai' : 'Kembali ke tiket terbuka'}
        title={data.id}
        subtitle={data.summary || 'Detail tiket pengaduan'}
        actions={
          <div className="flex items-center gap-2.5">
            <StatusBadge code={data.status_code} label={data.status_description} />
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/80 text-rose-700 hover:bg-rose-100 hover:border-rose-300 text-xs font-semibold shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
              title="Batalkan atau Hapus Pengaduan"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus / Batalkan</span>
            </button>
          </div>
        }
      />

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs sm:text-sm text-emerald-900 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-emerald-950">Pemberitahuan Sukses</p>
              <p className="text-emerald-800 text-xs mt-0.5">{successBanner}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner('')}
            className="p-1 rounded-lg text-emerald-600 hover:text-emerald-900 hover:bg-emerald-100/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left Column: Complaint Information & History Timeline */}
        <div className="space-y-6">
          <ComplaintInfoPanel detail={data} onUpdated={reload} />
          <TimelinePanel
            items={history.data || []}
            loading={history.loading}
            error={history.error}
            reload={reload}
          />
        </div>

        {/* Right Sidebar: Status Transition Actions, Follow-Up, Documents */}
        <aside className="space-y-6">
          {!completed ? (
            <StatusActionsPanel
              complaintId={data.id}
              statusCode={data.status_code}
              complaint={data}
              onTransitioned={handleTransitioned}
            />
          ) : null}

          {/* Follow-up routes are open-ticket only in the backend contract. */}
          {completed ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
              Follow-up tidak tersedia untuk tiket selesai (109).
            </div>
          ) : (
            <FollowUpPanel
              complaintId={data.id}
              items={followUps.data || []}
              loading={followUps.loading}
              error={followUps.error}
              reload={reload}
            />
          )}
          <DocumentsPanel
            complaintId={data.id}
            items={documents.data || []}
            files={documentFiles.data || []}
            loading={documents.loading || documentFiles.loading}
            error={documents.error || documentFiles.error}
            historyItems={history.data || []}
            completed={completed}
            onReload={reload}
          />
        </aside>
      </div>

      <DeleteComplaintModal
        complaintId={data.id}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={handleDeleteSuccess}
        token={token}
        user={user}
      />
    </div>
  )
}
