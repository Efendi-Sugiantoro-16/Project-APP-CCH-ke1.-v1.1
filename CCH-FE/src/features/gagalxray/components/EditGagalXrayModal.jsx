import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Calendar,
  Check,
  Edit3,
  FileText,
  Lock,
  Plane,
  Scale,
  X,
} from 'lucide-react'
import { gagalXrayApi } from '../api/gagalXrayApi.js'

export function EditGagalXrayModal({ item, isOpen, onClose, onSuccess, token, offices = [] }) {
  const [formData, setFormData] = useState(() => ({
    id_kantong_baru: item?.id_kantong_baru || '',
    isi_kiriman: item?.isi_kiriman || '',
    berat: item?.berat || 0,
    keterangan: item?.keterangan || '1',
    tanggal: item?.tanggal ? item.tanggal.slice(0, 10) : '',
    kantor_penerbangan: item?.kantor_penerbangan || '19000',
    file_berita_acara: item?.file_berita_acara || '',
  }))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !item) return null

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!formData.tanggal) {
      setError('Tanggal pemeriksaan wajib diisi.')
      return
    }

    setLoading(true)
    try {
      await gagalXrayApi.update(
        token,
        item.kantor_asal,
        item.kantor_tujuan,
        item.id_kiriman,
        item.id_kantong_lama,
        {
          ...formData,
          berat: Number(formData.berat) || 0,
        },
      )
      onSuccess?.('Data Kiriman Gagal X-Ray berhasil diperbarui.')
      onClose()
    } catch (err) {
      setError(err?.message || 'Gagal memperbarui data kiriman.')
    } finally {
      setLoading(false)
    }
  }

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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ubah Data Gagal X-Ray</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Perbarui tindak lanjut atau data kantong penerusan</p>
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

        {/* Locked Key Barcode Summary */}
        <div className="mt-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400">ID Kiriman / Resi:</span>{' '}
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm ml-1">{item.id_kiriman}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-slate-200 dark:bg-slate-700/80 px-2 py-0.5 text-slate-700 dark:text-slate-200 font-mono">
              <Lock className="h-3 w-3 text-slate-400" />
              {item.kantor_asal} → {item.kantor_tujuan}
            </span>
            <span className="rounded bg-slate-200 dark:bg-slate-700/80 px-2 py-0.5 text-slate-700 dark:text-slate-300 font-mono">
              Kantong: {item.id_kantong_lama}
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Tanggal & Kantor Penerbangan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Pemeriksaan <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="date"
                  required
                  value={formData.tanggal}
                  onChange={(e) => handleChange('tanggal', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/80 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Kantor Penerbangan (Bandara)
              </label>
              <div className="relative">
                <Plane className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <select
                  value={formData.kantor_penerbangan}
                  onChange={(e) => handleChange('kantor_penerbangan', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/80 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="19000">19000 - IPC JAKARTA OE EKSPOR UDARA</option>
                  <option value="19400">19400 - TGR BANDARA SOEKARNO HATTA</option>
                  <option value="60000">60000 - SURABAYA JUANDA</option>
                  <option value="80900">80900 - IPC DENPASAR NGURAH RAI</option>
                  <option value="90000">90000 - MAKASSAR SULTAN HASANUDDIN</option>
                  <option value="20000">20000 - BANDUNG HUSEIN SASTRANEGARA</option>
                  {offices.map((off) => (
                    <option key={off.code || off.Kode_Kantor} value={off.code || off.Kode_Kantor}>
                      {off.code || off.Kode_Kantor} - {off.name || off.Nama_Kantor}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bags & Weight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                ID Kantong Baru (Penerusan)
              </label>
              <input
                type="text"
                value={formData.id_kantong_baru}
                onChange={(e) => handleChange('id_kantong_baru', e.target.value.toUpperCase())}
                placeholder="Contoh: GK00000640102"
                className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/80 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Berat Kiriman (kg)
              </label>
              <div className="relative">
                <Scale className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.berat}
                  onChange={(e) => handleChange('berat', parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/80 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Isi & Keterangan Tindak Lanjut */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Isi Kiriman (Barang Terdeteksi)
              </label>
              <input
                type="text"
                value={formData.isi_kiriman}
                onChange={(e) => handleChange('isi_kiriman', e.target.value.toUpperCase())}
                placeholder="Contoh: BATTERY / AEROSOL / POWERBANK / CAT"
                className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/80 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Keterangan / Tindak Lanjut <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.keterangan}
                onChange={(e) => handleChange('keterangan', e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/80 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="1">1 - Diteruskan via Darat/Laut</option>
                <option value="2">2 - Retour</option>
                <option value="3">3 - Disita oleh Pihak Berwenang</option>
                <option value="4">4 - Penerusan dengan Freighter</option>
              </select>
            </div>
          </div>

          {/* Berita Acara */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              File Berita Acara Pemeriksaan (BAP)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={formData.file_berita_acara}
                onChange={(e) => handleChange('file_berita_acara', e.target.value)}
                placeholder="Nomor dokumen / berkas BAP"
                className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/80 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer */}
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
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                'Menyimpan...'
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
