import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import { deleteComplaint } from '../api/complaintsApi.js'

export function DeleteComplaintModal({
  complaintId,
  isOpen,
  onClose,
  onSuccess,
  token,
  user,
}) {
  const [reason, setReason] = useState('Salah input data pengaduan / tiket duplikat')
  const [isForce, setIsForce] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !complaintId) return null

  const isAdmin = user?.user_level_id === '-1' || user?.role === 'Administrator'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      setError('Alasan pembatalan/penghapusan tiket wajib diisi.')
      return
    }

    setLoading(true)
    try {
      const res = await deleteComplaint(complaintId, token, {
        force: isForce,
        reason: trimmedReason,
      })
      onSuccess?.(res?.message || `Tiket ${complaintId} berhasil diproses.`)
      onClose()
    } catch (err) {
      setError(err?.message || 'Gagal menghapus atau membatalkan pengaduan.')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative my-8 w-full max-w-md rounded-2xl border border-red-500/20 bg-white dark:bg-slate-900 p-6 shadow-2xl text-slate-800 dark:text-slate-100 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Hapus / Batalkan Aduan</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{complaintId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-xl border border-amber-500/30 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="leading-relaxed">
              Pembatalan aduan akan menutup tiket dengan catatan pembatalan resmi pada riwayat audit{' '}
              <span className="font-mono text-slate-900 dark:text-white font-semibold">cchentrimas</span>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Alasan Pembatalan / Penghapusan <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Contoh: Salah input nomor resi / Tiket pengaduan ganda"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/80 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-red-500 focus:outline-none resize-none"
            />
          </div>

          {isAdmin && (
            <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/40 p-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isForce}
                  onChange={(e) => setIsForce(e.target.checked)}
                  className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-slate-700 text-red-600 focus:ring-0"
                />
                <div>
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-300 block">
                    Hapus Permanen dari Database (Hard Delete)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Khusus Superadmin: membersihkan baris tiket beserta referensinya secara total.
                  </span>
                </div>
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-300 dark:border-white/10 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-50 shadow-sm"
            >
              {loading
                ? 'Memproses...'
                : isForce
                ? 'Hapus Permanen'
                : 'Batalkan Tiket Ini'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
