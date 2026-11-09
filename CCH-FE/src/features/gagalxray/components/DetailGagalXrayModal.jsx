import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Barcode,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Package,
  Plane,
  Scale,
  ShieldAlert,
  Ticket,
  Truck,
  User,
  X,
} from 'lucide-react'


export function DetailGagalXrayModal({ item, isOpen, onClose }) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  if (!isOpen || !item) return null

  function copyResi() {
    if (item.id_kiriman) {
      navigator.clipboard.writeText(item.id_kiriman)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleCreateComplaintTicket() {
    onClose()
    navigate('/workspace/complaints/create', {
      state: {
        prefill: {
          shipmentNumber: item.id_kiriman,
          originOffice: item.kantor_asal,
          targetOffice: item.kantor_tujuan,
          shipmentOriginOffice: item.kantor_asal,
          shipmentTargetOffice: item.kantor_tujuan,
          summary: `Kiriman gagal X-Ray di Bandara ${item.kantor_penerbangan || ''}: ${item.isi_kiriman || 'Dangerous Goods'}`,
          description: `Kiriman dengan nomor resi ${item.id_kiriman} tertahan pemeriksaan keamanan X-Ray di Bandara ${item.nama_kantor_penerbangan || item.kantor_penerbangan || 'Bandara'} karena terdeteksi muatan: ${item.isi_kiriman || 'Dangerous Goods'}.\n\nDetail Pemeriksaan:\n- Rute Asal: ${item.kantor_asal} (${item.nama_kantor_asal || ''})\n- Rute Tujuan: ${item.kantor_tujuan} (${item.nama_kantor_tujuan || ''})\n- Berat Kiriman: ${item.berat || '-'} kg\n- Kantong Lama: ${item.id_kantong_lama}\n- Kantong Baru Penerusan: ${item.id_kantong_baru || 'Dalam proses'}\n- Tindak Lanjut: ${item.keterangan_text || item.keterangan || '-'}\n- Tanggal Pemeriksaan: ${item.tanggal || '-'}`,
          complaintTypeCode: '10',
          shippingServiceCode: '000',
          complaintSourceCode: '2',
        },
      },
    })
  }


  function getKeteranganBadge(keterangan) {
    switch (keterangan) {
      case '1':
        return {
          label: 'Diteruskan via Darat/Laut',
          icon: Truck,
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        }
      case '2':
        return {
          label: 'Retour (Dikembalikan)',
          icon: AlertTriangle,
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        }
      case '3':
        return {
          label: 'Disita Pihak Berwenang',
          icon: ShieldAlert,
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        }
      case '4':
        return {
          label: 'Penerusan dengan Freighter',
          icon: Plane,
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        }
      default:
        return {
          label: item.keterangan_text || item.keterangan || '-',
          icon: Package,
          bg: 'bg-slate-700 text-slate-300 border-slate-600',
        }
    }
  }

  const badge = getKeteranganBadge(item.keterangan)
  const BadgeIcon = badge.icon

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative my-8 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-2xl text-slate-800 dark:text-slate-100 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
              <Barcode className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-slate-900 dark:text-white tracking-wider">
                  {item.id_kiriman}
                </span>
                <button
                  type="button"
                  onClick={copyResi}
                  title="Salin Nomor Resi"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white transition"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Lembar Pemeriksaan X-Ray Bandara</p>
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

        {/* Status Banner */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-800/60 p-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Status Tindak Lanjut:</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${badge.bg}`}
            >
              <BadgeIcon className="h-3.5 w-3.5" />
              {badge.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Tanggal Periksa: <span className="font-semibold text-slate-800 dark:text-white">{item.tanggal || '-'}</span>
          </div>
        </div>

        {/* Routing Route Flow */}
        <div className="mt-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Rute Pengiriman & Titik Pemeriksaan Bandara
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            {/* Origin */}
            <div className="rounded-lg bg-white dark:bg-slate-800/80 p-3 border border-slate-200 dark:border-white/5 shadow-xs">
              <span className="text-[10px] text-slate-400 dark:text-slate-400 block uppercase font-medium">Kantor Asal</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">{item.kantor_asal}</span>
              <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5 truncate">{item.nama_kantor_asal || 'Kantor Pos Asal'}</p>
            </div>

            {/* Airport */}
            <div className="rounded-lg bg-white dark:bg-slate-800/80 p-3 border border-amber-500/30 dark:border-amber-500/20 shadow-xs relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold">Bandara X-Ray</span>
                <Plane className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
              </div>
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{item.kantor_penerbangan || '-'}</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate">{item.nama_kantor_penerbangan || 'Bandara Pemeriksaan'}</p>
            </div>

            {/* Destination */}
            <div className="rounded-lg bg-white dark:bg-slate-800/80 p-3 border border-slate-200 dark:border-white/5 shadow-xs">
              <span className="text-[10px] text-slate-400 dark:text-slate-400 block uppercase font-medium">Kantor Tujuan</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{item.kantor_tujuan}</span>
              <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5 truncate">{item.nama_kantor_tujuan || 'Kantor Pos Tujuan'}</p>
            </div>
          </div>
        </div>

        {/* Cargo & Bag Details */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Informasi Muatan / Kargo
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Isi Kiriman Terdeteksi:</span>
              <span className="text-sm font-semibold text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded border border-rose-200 dark:border-transparent inline-block mt-1">
                {item.isi_kiriman || 'TIDAK TERIDENTIFIKASI'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Berat Kiriman:</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">{item.berat ? `${item.berat} kg` : '-'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Nomor Berita Acara (BAP):</span>
              <span className="text-xs text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mt-1 font-mono">
                <FileText className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                {item.file_berita_acara || 'Tidak ada lampiran BAP'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pergantian Kantong Pos
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Kantong Lama (Asal):</span>
              <span className="font-mono text-sm text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded inline-block mt-1">
                {item.id_kantong_lama || '-'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Kantong Baru (Penerusan):</span>
              <div className="flex items-center gap-1.5 mt-1">
                <ArrowRight className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                <span className="font-mono text-sm font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2 py-0.5 rounded">
                  {item.id_kantong_baru || 'Belum Ditentukan'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Trail */}
        <div className="mt-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/30 p-3.5 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            Ditambah Oleh: <span className="text-slate-700 dark:text-slate-200 font-medium">{item.ditambah_oleh || '-'}</span>
            {item.tanggal_tambah && (
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 ml-1">
                <Clock className="h-3 w-3" />
                {new Date(item.tanggal_tambah).toLocaleString('id-ID')}
              </span>
            )}
          </div>
          {item.diubah_oleh && (
            <div className="flex items-center gap-1.5">
              Diubah Oleh: <span className="text-slate-700 dark:text-slate-200 font-medium">{item.diubah_oleh}</span>
              {item.tanggal_ubah && (
                <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 ml-1">
                  <Clock className="h-3 w-3" />
                  {new Date(item.tanggal_ubah).toLocaleString('id-ID')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
          <button
            type="button"
            onClick={copyResi}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Resi Berhasil Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-slate-400" />
                <span>Salin Nomor Resi</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 dark:border-white/10 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleCreateComplaintTicket}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <Ticket className="h-4 w-4" />
              + Terbitkan Tiket CCH
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body,
  )
}
