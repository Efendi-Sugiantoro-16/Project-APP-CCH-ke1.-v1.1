import { useContext, useEffect, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { followUpsApi } from '../../followups/api/followUpsApi.js'
import { Card, CardHeader } from '../../../shared/ui/Card.jsx'
import { Button } from '../../../shared/ui/Button.jsx'
import { formatDateTime } from '../format.js'

const DEFAULT_FOLLOWUP_STATUSES = [
  { code: '101', description: 'Follow-Up ke-1' },
  { code: '102', description: 'Follow-Up ke-2' },
  { code: '103', description: 'Follow-Up ke-3' },
  { code: '104', description: 'Follow-Up ke-4' },
  { code: '105', description: 'Follow-Up ke-5' },
]

function toLocalDatetimeString(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date(Date.now() + 86400000) // Default: tomorrow
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Modal Tambah Rencana Follow-up */
function CreatePlanModal({ isOpen, onClose, complaintId, token, existingCodes = [], onSuccess }) {
  const [statuses, setStatuses] = useState(DEFAULT_FOLLOWUP_STATUSES)
  const [selectedStatus, setSelectedStatus] = useState('101')
  const [plannedAt, setPlannedAt] = useState(() => toLocalDatetimeString())
  const [planNotes, setPlanNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    if (token) {
      followUpsApi
        .listStatuses(token)
        .then((data) => {
          if (active && data && data.length > 0) {
            setStatuses(data)
            // Pick first code not already in existingCodes
            const available = data.find((s) => !existingCodes.includes(s.code))
            if (available) setSelectedStatus(available.code)
          }
        })
        .catch(() => {
          // Fallback to default list
        })
    }
    return () => {
      active = false
    }
  }, [token, existingCodes])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedStatus) {
      setError('Pilih tahap follow-up terlebih dahulu.')
      return
    }
    if (!plannedAt) {
      setError('Tentukan jadwal rencana follow-up.')
      return
    }
    if (!planNotes.trim()) {
      setError('Catatan rencana tindak lanjut wajib diisi.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const isoPlanned = new Date(plannedAt).toISOString()
      await followUpsApi.createPlan(token, complaintId, {
        statusCode: selectedStatus,
        plannedAt: isoPlanned,
        planNotes: planNotes.trim(),
      })
      onSuccess('Rencana tindak lanjut berhasil dibuat!')
      onClose()
    } catch (err) {
      setError(err.message || 'Gagal membuat rencana follow-up.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60">
              <CalendarClock size={18} />
            </span>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              Tambah Rencana Follow-up
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tahap Follow-up
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {statuses.map((s) => {
                const isTaken = existingCodes.includes(s.code)
                return (
                  <option key={s.code} value={s.code} disabled={isTaken}>
                    {s.code} - {s.description || `Follow-Up ${s.code}`} {isTaken ? '(Sudah Ada)' : ''}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Jadwal Rencana Penanganan
            </label>
            <input
              type="datetime-local"
              value={plannedAt}
              onChange={(e) => setPlannedAt(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Catatan Rencana Tindak Lanjut
            </label>
            <textarea
              rows={3}
              value={planNotes}
              onChange={(e) => setPlanNotes(e.target.value)}
              placeholder="Contoh: Menghubungi pihak kantor antaran untuk konfirmasi fisik posisi kiriman..."
              required
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-normal text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                  Menyimpan…
                </>
              ) : (
                'Simpan Rencana'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** Modal Ubah Jadwal & Catatan Rencana Follow-up */
function EditPlanModal({ plan, onClose, complaintId, token, onSuccess }) {
  const [plannedAt, setPlannedAt] = useState(() => toLocalDatetimeString(plan?.planned_at))
  const [planNotes, setPlanNotes] = useState(plan?.plan_notes || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!plan) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!plannedAt) {
      setError('Tentukan jadwal rencana follow-up.')
      return
    }
    if (!planNotes.trim()) {
      setError('Catatan rencana tindak lanjut wajib diisi.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const isoPlanned = new Date(plannedAt).toISOString()
      await followUpsApi.editPlan(token, complaintId, plan.status_code, {
        plannedAt: isoPlanned,
        planNotes: planNotes.trim(),
      })
      onSuccess(`Rencana follow-up ${plan.status_code} berhasil diperbarui!`)
      onClose()
    } catch (err) {
      setError(err.message || 'Gagal mengubah rencana follow-up.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60">
              <Edit3 size={18} />
            </span>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                Ubah Rencana Follow-up
              </h3>
              <p className="text-xs text-slate-400">Kode Status: {plan.status_code}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Jadwal Rencana Penanganan
            </label>
            <input
              type="datetime-local"
              value={plannedAt}
              onChange={(e) => setPlannedAt(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Catatan Rencana Tindak Lanjut
            </label>
            <textarea
              rows={3}
              value={planNotes}
              onChange={(e) => setPlanNotes(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-normal text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                  Memperbarui…
                </>
              ) : (
                'Perbarui Rencana'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/** Modal Catat Realisasi Follow-up (Outcome) */
function RealizeModal({ plan, onClose, complaintId, token, onSuccess }) {
  const [outcome, setOutcome] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!plan) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!outcome.trim()) {
      setError('Catatan hasil realisasi (outcome) wajib diisi.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await followUpsApi.realize(token, complaintId, plan.status_code, {
        outcome: outcome.trim(),
      })
      onSuccess(`Realisasi follow-up ${plan.status_code} berhasil dicatat!`)
      onClose()
    } catch (err) {
      setError(err.message || 'Gagal mencatat realisasi follow-up.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60">
              <CheckCircle2 size={18} />
            </span>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                Catat Realisasi Tindak Lanjut
              </h3>
              <p className="text-xs text-slate-400">Kode Status: {plan.status_code}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info Rencana Semula */}
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
          <p className="font-semibold text-slate-700 dark:text-slate-200">Rencana Semula:</p>
          <p className="mt-0.5 text-slate-500 dark:text-slate-400">
            {plan.plan_notes || 'Tidak ada catatan rencana.'}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Jadwal: {plan.planned_at ? formatDateTime(plan.planned_at) : '—'}
          </p>
        </div>

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Hasil Penanganan / Realisasi (Outcome)
            </label>
            <textarea
              rows={4}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Contoh: Kiriman berhasil diantar kurir ke alamat penerima pada pukul 14.30 WIB dan diterima oleh Bpk. Budi..."
              required
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-normal text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
              className="!bg-emerald-600 hover:!bg-emerald-700"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                  Mencatat Realisasi…
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} className="mr-1.5" />
                  Selesaikan Realisasi
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Interactive FollowUpPanel Component
 * Supports planning, editing, realizing, and cancelling ticket investigation milestones.
 */
export function FollowUpPanel({ complaintId, items = [], loading = false, error = null, reload }) {
  const { token } = useContext(AuthContext)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [realizingPlan, setRealizingPlan] = useState(null)
  const [cancellingCode, setCancellingCode] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const existingCodes = items.map((i) => i.status_code)

  const handleCancelPlan = async (statusCode) => {
    if (!window.confirm(`Apakah Anda yakin ingin membatalkan rencana follow-up ${statusCode}?`)) {
      return
    }

    try {
      setCancellingCode(statusCode)
      setFeedback(null)
      await followUpsApi.cancelPlan(token, complaintId, statusCode)
      setFeedback(`Rencana follow-up ${statusCode} berhasil dibatalkan.`)
      if (reload) reload()
    } catch (err) {
      alert(err.message || 'Gagal membatalkan rencana follow-up.')
    } finally {
      setCancellingCode(null)
    }
  }

  const handleActionSuccess = (msg) => {
    setFeedback(msg)
    if (reload) reload()
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Tindak Lanjut (Follow-up)"
          subtitle="Rencana dan realisasi investigasi tiket."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setFeedback(null)
                  setIsCreateOpen(true)
                }}
              >
                <Plus size={14} className="mr-1" />
                Rencana Baru
              </Button>
              <Button variant="secondary" size="sm" onClick={reload} title="Muat Ulang">
                <RefreshCw size={14} />
              </Button>
            </div>
          }
        />

        <div className="p-4 space-y-3">
          {/* Feedback Banner */}
          {feedback ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span>{feedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-emerald-700 hover:text-emerald-900"
              >
                <X size={14} />
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="state-box border-0 py-8 shadow-none">
              <Loader2 size={22} className="animate-spin text-blue-500" />
              <span className="text-xs">Memuat rencana follow-up…</span>
            </div>
          ) : error ? (
            <div className="alert alert-error" role="alert">
              <span className="text-xs">{error}</span>
            </div>
          ) : !items || items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
              <CalendarClock size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-medium text-slate-600 dark:text-slate-300">
                Belum ada rencana tindak lanjut.
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Buat rencana follow-up untuk mengkoordinasikan investigasi antar kantor pos.
              </p>
              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={() => setIsCreateOpen(true)}>
                  <Plus size={14} className="mr-1" />
                  Tambah Rencana Sekarang
                </Button>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((entry) => {
                const isRealized = Boolean(entry.realized_at)
                const isCancelling = cancellingCode === entry.status_code

                return (
                  <li
                    key={`${entry.complaint_id}-${entry.office_code}-${entry.status_code}`}
                    className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs transition hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            isRealized
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60'
                              : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60'
                          }`}
                        >
                          {isRealized ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              FU-{entry.status_code}
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                isRealized
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                              }`}
                            >
                              {isRealized ? 'Selesai Direalisasi' : 'Menunggu Realisasi'}
                            </span>
                            <span className="mono text-xs text-slate-400">
                              Kantor {entry.office_code}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Item Actions */}
                      {!isRealized ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setRealizingPlan(entry)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                            title="Catat Realisasi"
                          >
                            <CheckCircle2 size={13} />
                            Realisasi
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPlan(entry)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                            title="Ubah Rencana"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelPlan(entry.status_code)}
                            disabled={isCancelling}
                            className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/50"
                            title="Batalkan Rencana"
                          >
                            {isCancelling ? (
                              <Loader2 size={15} className="animate-spin text-red-500" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {/* Plan Body */}
                    <div className="pl-10 text-xs">
                      <p className="text-slate-700 dark:text-slate-300">
                        {entry.plan_notes || 'Tidak ada catatan rencana.'}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Calendar size={12} />
                        <span>Jadwal Rencana: {formatDateTime(entry.planned_at)}</span>
                      </div>

                      {/* Realized Outcome Box */}
                      {isRealized ? (
                        <div className="mt-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-2.5 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/30">
                          <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Hasil Realisasi ({formatDateTime(entry.realized_at)}):</span>
                          </div>
                          <p className="mt-1 text-slate-700 dark:text-slate-300">
                            {entry.outcome || 'Tidak ada catatan hasil penanganan.'}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Card>

      {/* Modals */}
      <CreatePlanModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        complaintId={complaintId}
        token={token}
        existingCodes={existingCodes}
        onSuccess={handleActionSuccess}
      />

      <EditPlanModal
        plan={editingPlan}
        onClose={() => setEditingPlan(null)}
        complaintId={complaintId}
        token={token}
        onSuccess={handleActionSuccess}
      />

      <RealizeModal
        plan={realizingPlan}
        onClose={() => setRealizingPlan(null)}
        complaintId={complaintId}
        token={token}
        onSuccess={handleActionSuccess}
      />
    </>
  )
}