import { useContext, useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  CheckSquare,
  Clock,
  HelpCircle,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { complaintApi } from '../api/complaintApi.js'
import { virtualCsApi } from '../../ai/api/virtualCsApi.js'
import { StatusBadge } from './StatusBadge.jsx'

import { Card, CardHeader } from '../../../shared/ui/Card.jsx'
import { Button } from '../../../shared/ui/Button.jsx'
import { statusMeta, waitingForCode } from '../format.js'

function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const STATUS_GUIDES = {
  '102': {
    title: 'Respon Penanganan',
    desc: 'Catat respon awal investigasi dari Kantor Tujuan atau unit pelaksana terkait posisi fisik kiriman.',
    icon: ArrowRightLeft,
    tone: 'sky',
  },
  '103': {
    title: 'Konfirmasi Lanjutan',
    desc: 'Tiket sedang dalam tahap investigasi intensif atau konfirmasi dengan kurir antaran / pihak ketiga.',
    icon: Clock,
    tone: 'amber',
  },
  '104': {
    title: 'Masalah Terselesaikan (Resolved)',
    desc: 'Kiriman telah berhasil diantar, diserahkan, atau kompensasi telah disetujui di lapangan.',
    icon: CheckSquare,
    tone: 'violet',
  },
  '109': {
    title: 'Tutup Tiket (Selesai Resmi)',
    desc: 'Pengaduan telah tuntas sepenuhnya. Tiket akan dikunci dan diarsipkan sebagai tiket selesai.',
    icon: ShieldCheck,
    tone: 'emerald',
  },
}

/**
 * StatusActionsPanel Component
 * Handles multi-role status transitions for Call Center, UPT, and Regional officers.
 */
export function StatusActionsPanel({ complaintId, statusCode, complaint, onTransitioned }) {
  const { token, user } = useContext(AuthContext)
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null)


  useEffect(() => {
    let cancelled = false
    complaintApi
      .listStatusOptions(token, complaintId)
      .then((rows) => {
        if (!cancelled) {
          setOptions(rows || [])
          setSelected(rows?.[0]?.code || '')
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || 'Gagal memuat opsi status.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, complaintId])

  const canTransition = waitingForCode(statusCode) && options.some((option) => option.code === selected)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canTransition || submitting) return

    if (!description.trim()) {
      setError('Catatan transisi wajib diisi untuk riwayat audit investigasi.')
      return
    }

    if (selected === '109') {
      const confirmClose = window.confirm(
        'Perhatian: Tiket yang ditutup (109 - SELESAI) tidak dapat diubah statusnya lagi. Apakah Anda yakin ingin menyelesaikan tiket ini?'
      )
      if (!confirmClose) return
    }

    setSubmitting(true)
    setError('')
    setFeedback('')

    try {
      await complaintApi.updateStatus(token, {
        id: complaintId,
        expectedStatusCode: statusCode,
        statusCode: selected,
        description: description.trim(),
        idempotencyKey: newIdempotencyKey(),
      })
      setFeedback(`Status tiket berhasil diperbarui menjadi ${selected} (${statusMeta(selected).label})!`)
      setDescription('')
      onTransitioned?.()
    } catch (transitionError) {
      setError(transitionError.message || 'Gagal memperbarui status aduan.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGenerateAiResponse() {
    if (!selected) return
    setAiLoading(true)
    setError('')
    try {
      const res = await virtualCsApi.copilotSuggestResponse({
        complaint_id: complaintId,
        shipment_number: complaint?.barcode || complaint?.nomor_resi,
        customer_name: complaint?.nama_pelanggan,
        summary: complaint?.ringkasan || complaint?.deskripsi,
        description: complaint?.deskripsi,
        current_status: statusCode,
        target_status: selected,
        office_name: user?.office || 'Kantor Pos Cabang',
      })
      if (res?.suggested_response) {
        setDescription(res.suggested_response)
        setAiSuggestion(res)
      }
    } catch (aiErr) {
      setError(`Gagal memuat rekomendasi draf CS Virtual: ${aiErr.message}`)
    } finally {
      setAiLoading(false)
    }
  }

  const selectedGuide = STATUS_GUIDES[selected]


  return (
    <Card>
      <CardHeader
        title="Perbarui Status Aduan"
        subtitle="Matriks mutasi status multi-peran (Call Center, UPT & Regional)."
        actions={<StatusBadge code={statusCode} label={statusMeta(statusCode).label} />}
      />

      <div className="p-4 space-y-3">
        {/* Feedback Message */}
        {feedback ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <span>{feedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback('')}
              className="text-emerald-700 hover:text-emerald-900"
            >
              <X size={14} />
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="state-box border-0 py-8 shadow-none">
            <Loader2 size={22} className="animate-spin text-blue-500" />
            <span className="text-xs">Memuat opsi status multi-peran…</span>
          </div>
        ) : !waitingForCode(statusCode) ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            <ShieldCheck size={24} className="mx-auto mb-1.5 text-emerald-500" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Tiket ini telah ditutup resmi (Status {statusCode} - SELESAI).
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Siklus hidup penanganan tiket telah selesai dan tidak dapat diubah kembali.
            </p>
          </div>
        ) : options.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
            <HelpCircle size={22} className="mx-auto mb-1 text-slate-300" />
            <p className="font-medium text-slate-600 dark:text-slate-300">
              Tidak ada opsi transisi status yang tersedia.
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Kantor Anda ({user?.office || '—'}) mungkin tidak terdaftar sebagai kantor asal, tujuan, atau tembusan tiket ini.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pilih Status Tujuan:
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {options.map((option) => {
                  const guide = STATUS_GUIDES[option.code]
                  const Icon = guide?.icon || Clock
                  const isChecked = selected === option.code

                  return (
                    <label
                      key={option.code}
                      className={`relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        isChecked
                          ? 'border-blue-500 bg-blue-50/70 shadow-xs dark:border-blue-500 dark:bg-blue-950/30'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`status-transition-${complaintId}`}
                        value={option.code}
                        checked={isChecked}
                        onChange={(event) => setSelected(event.target.value)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <Icon size={14} className={isChecked ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {option.code} - {option.description}
                          </span>
                        </div>
                        {guide ? (
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {guide.desc}
                          </p>
                        ) : null}
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Selected Status Banner / Warning */}
            {selected === '109' ? (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                <span>
                  <strong>Perhatian:</strong> Menutup tiket (109 - SELESAI) bersifat permanen. Pastikan pelanggan telah terkonfirmasi.
                </span>
              </div>
            ) : selectedGuide ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-2.5 text-[11px] text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                <span className="font-semibold">{selectedGuide.title}:</span> {selectedGuide.desc}
              </div>
            ) : null}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="status-note">
                  Catatan Transisi / Penanganan <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={handleGenerateAiResponse}
                    className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 py-1 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300 transition cursor-pointer"
                    title="Buat draf rekomendasi balasan resmi dengan CS Virtual AI"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-purple-600" />
                    )}
                    <span>🤖 Draf CS Virtual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const templates = {
                        '102': 'Petugas kantor pemeriksa telah menerima disposisi tiket dan memulai investigasi fisik kiriman di manifes/antaran.',
                        '103': 'Sedang dilakukan konfirmasi lanjutan kepada kurir pengantar dan pihak terkait mengenai posisi fisik paket.',
                        '104': 'Masalah kiriman telah terselesaikan di lapangan dan diterima dengan baik oleh pelanggan.',
                        '109': 'Investigasi dan tindak lanjut selesai tuntas. Kasus pengaduan ditutup resmi.',
                      }
                      if (templates[selected]) {
                        setDescription(templates[selected])
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                  >
                    <span>Catatan Standar</span>
                  </button>
                </div>
              </div>
              <textarea
                id="status-note"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                maxLength={500}
                required
                placeholder="Contoh: Kiriman sedang dalam proses pengantaran kurir ke alamat tujuan hari ini..."
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
              {aiSuggestion && (
                <div className="mt-2.5 rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-xs dark:border-purple-900/50 dark:bg-purple-950/30 text-slate-800 dark:text-slate-200 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-400">
                      <Sparkles size={14} /> Panduan Investigasi CS Virtual AI
                    </span>
                    <span className="rounded bg-purple-200/70 px-1.5 py-0.5 font-mono text-[10px] font-bold text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                      {aiSuggestion.urgency_assessment}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/30">
                    <strong className="text-purple-800 dark:text-purple-300 block mb-0.5">Langkah Lapangan:</strong>
                    {aiSuggestion.internal_notes}
                  </div>
                  {aiSuggestion.de_escalation_tip && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                      💡 <strong>Tips De-eskalasi:</strong> {aiSuggestion.de_escalation_tip}
                    </div>
                  )}
                </div>
              )}

            </div>

            {error ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle size={16} className="shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={!canTransition || submitting}
              className={`w-full ${selected === '109' ? '!bg-emerald-600 hover:!bg-emerald-700' : ''}`}
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="mr-1.5 animate-spin" />
                  Menyimpan Perubahan…
                </>
              ) : selected === '109' ? (
                <>
                  <ShieldCheck size={15} className="mr-1.5" />
                  Tutup & Selesaikan Aduan
                </>
              ) : (
                <>
                  <Send size={15} className="mr-1.5" />
                  Perbarui Status Tiket
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </Card>
  )
}