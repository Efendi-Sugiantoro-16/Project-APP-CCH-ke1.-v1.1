import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Mail, MapPin, Phone, User, UserPlus, X } from 'lucide-react'
import { customersApi } from '../api/customersApi.js'

/**
 * QuickAddCustomerModal implements cchentricus addopt (Quick Add Customer)
 */
export function QuickAddCustomerModal({ isOpen, onClose, onSuccess, token }) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const name = formData.full_name.trim()
    const phone = formData.phone.trim()
    const address = formData.address.trim()

    if (!name) {
      setError('Nama lengkap pelanggan wajib diisi.')
      return
    }
    if (!phone) {
      setError('Nomor telepon / HP wajib diisi.')
      return
    }
    if (!address) {
      setError('Alamat lengkap pelanggan wajib diisi.')
      return
    }

    setLoading(true)
    try {
      const res = await customersApi.create(token, {
        full_name: name,
        phone,
        email: formData.email.trim(),
        address,
      })
      const created = res?.data || res
      onSuccess?.(created)
      onClose()
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan profil pelanggan.')
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
        className="relative my-8 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-2xl text-slate-800 dark:text-slate-100 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tambah Pelanggan Baru (addopt)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Daftarkan profil pelanggan ke cchentricus secara instan</p>
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
          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap Pelanggan <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                required
                placeholder="Masukkan nama lengkap pelanggan"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/80 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nomor Telepon / HP <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="tel"
                  required
                  placeholder="08xxxxxxxxxx"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/80 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Alamat Email (Opsional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/80 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Alamat Lengkap <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <textarea
                rows={3}
                required
                placeholder="Masukkan alamat domisili atau pengiriman pelanggan"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/80 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
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
                  Simpan & Pilih Pelanggan
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
