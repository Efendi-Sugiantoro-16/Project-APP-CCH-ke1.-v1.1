import { useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, Copy, Eye, EyeOff, KeyRound, Loader2, ShieldAlert, X } from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { usersApi } from '../api/usersApi.js'
import { Button } from '../../../shared/ui/Button.jsx'

function ResetPasswordForm({ user, onClose, onReset }) {
  const { token } = useContext(AuthContext)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*'
    let pwd = ''
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewPassword(pwd)
    setConfirmPassword(pwd)
    setShowPassword(true)
    setErrors({})
  }

  const copyToClipboard = () => {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const validate = () => {
    const errs = {}
    if (!newPassword) {
      errs.newPassword = 'Kata sandi baru wajib diisi.'
    } else if (newPassword.length < 6) {
      errs.newPassword = 'Kata sandi minimal 6 karakter.'
    }

    if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Konfirmasi kata sandi tidak cocok.'
    }
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    setSuccessMsg('')

    const valErrors = validate()
    if (Object.keys(valErrors).length > 0) {
      setErrors(valErrors)
      return
    }

    setSubmitting(true)
    try {
      await usersApi.resetPassword(token, user.username, newPassword)

      setSuccessMsg(`Kata sandi untuk pengguna "${user.username}" berhasil direset!`)
      setTimeout(() => {
        if (onReset) onReset()
        onClose()
      }, 1200)
    } catch (err) {
      setSubmitError(err.message || 'Gagal mereset kata sandi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 my-8 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <KeyRound size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Reset Kata Sandi</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Perbarui kata sandi akun petugas.</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {submitError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-50 dark:bg-red-950/40 p-3.5 text-sm text-red-700 dark:text-red-200">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500 dark:text-red-400" />
              <span>{submitError}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-sm text-emerald-700 dark:text-emerald-200">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* User Target Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Petugas</p>
              <p className="text-sm font-bold text-slate-800 dark:text-white font-mono mt-0.5">{user.username}</p>
              {(user.first_name || user.last_name) && (
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {user.first_name} {user.last_name}
                </p>
              )}
            </div>
            <span className="badge border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-semibold px-2 py-0.5">
              {user.user_level_name || `Role ${user.user_level_id}`}
            </span>
          </div>

          <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/10 p-3 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Kata sandi akan di-hash ulang menggunakan algoritma <strong>Bcrypt</strong>. Pastikan petugas mencatat kata sandi baru ini.
            </span>
          </div>

          {/* New Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Kata Sandi Baru <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  <KeyRound size={12} /> Buat Acak
                </button>
                {newPassword && (
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    <Copy size={12} /> {copied ? 'Tersalin!' : 'Salin'}
                  </button>
                )}
              </div>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }))
                }}
                placeholder="Minimal 6 karakter"
                className={`input w-full pr-10 ${errors.newPassword ? 'border-red-400 focus:border-red-500' : ''}`}
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && <p className="mt-1 text-xs text-red-500">{errors.newPassword}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Konfirmasi Kata Sandi Baru <span className="text-red-500">*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }))
              }}
              placeholder="Ulangi kata sandi baru"
              className={`input w-full ${errors.confirmPassword ? 'border-red-400 focus:border-red-500' : ''}`}
              disabled={submitting}
            />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
            <button
              type="button"
              className="btn btn-ghost text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={onClose}
              disabled={submitting}
            >
              Batal
            </button>
            <Button
              type="submit"
              tone="primary"
              disabled={submitting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Mereset…
                </>
              ) : (
                <>
                  <KeyRound size={16} />
                  Reset Kata Sandi
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ResetPasswordModal({ user, isOpen, onClose, onReset }) {
  if (!isOpen || !user) return null

  return createPortal(
    <ResetPasswordForm
      key={user.username}
      user={user}
      onClose={onClose}
      onReset={onReset}
    />,
    document.body
  )
}
