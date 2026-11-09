import { useContext, useEffect, useState } from 'react'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Save,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react'
import { AuthContext } from '../auth/auth-context.js'
import { usersApi } from '../admin/api/usersApi.js'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { Card } from '../../shared/ui/Card.jsx'
import { Button } from '../../shared/ui/Button.jsx'
import { Badge } from '../../shared/ui/Badge.jsx'

export function UserProfilePage() {
  const { token, user: authUser } = useContext(AuthContext)

  // Profile data
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [toastType, setToastType] = useState('success') // 'success' | 'error'

  // Personal Info Form
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // Password Change Form
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Load Profile
  useEffect(() => {
    if (!token) return
    let active = true

    async function fetchProfile() {
      setLoading(true)
      setError('')
      try {
        const data = await usersApi.getProfile(token)
        if (active && data) {
          setProfile(data)
          setFormData({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            email: data.email || '',
            phone: data.phone || '',
          })
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Gagal memuat profil pengguna')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchProfile()
    return () => {
      active = false
    }
  }, [token])

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg)
    setToastType(type)
    setTimeout(() => setToastMsg(''), 4000)
  }

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setError('')
    try {
      const updated = await usersApi.updateProfile(token, formData)
      setProfile(updated)
      showToast('Profil berhasil diperbarui!')
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan profil', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  // Handle Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordError('')

    if (passwordData.new_password.length < 6) {
      setPasswordError('Kata sandi baru minimal 6 karakter.')
      return
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('Konfirmasi kata sandi baru tidak cocok.')
      return
    }

    setSavingPassword(true)
    try {
      await usersApi.changePassword(token, passwordData.old_password, passwordData.new_password)
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' })
      showToast('Kata sandi berhasil diubah!')
    } catch (err) {
      setPasswordError(err.message || 'Gagal mengubah kata sandi.')
    } finally {
      setSavingPassword(false)
    }
  }

  const initials = profile?.username
    ? profile.username.slice(0, 2).toUpperCase()
    : authUser?.username?.slice(0, 2).toUpperCase() || 'US'

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Manajemen Akun"
        title="Profil Pengguna"
        subtitle="Kelola informasi profil pribadi dan kredensial keamanan akun Anda di POS CCH."
      />

      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-sm font-medium transition-all ${
            toastType === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {toastType === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <Card className="p-8 text-center text-slate-500">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="mt-3 text-sm">Memuat profil pengguna…</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Profile Card & Role Badges */}
          <div className="space-y-6 lg:col-span-1">
            <Card className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-3xl font-extrabold text-white shadow-xl shadow-blue-500/20">
                    {initials}
                  </div>
                  <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {profile?.first_name || profile?.last_name
                    ? `${profile.first_name} ${profile.last_name}`.trim()
                    : profile?.username}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">@{profile?.username}</p>

                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  <Badge variant="blue" className="gap-1">
                    <ShieldCheck size={12} />
                    {profile?.user_level_name || `Level ${profile?.user_level_id}`}
                  </Badge>
                  <Badge variant="purple" className="gap-1">
                    <Building2 size={12} />
                    {profile?.office_code || 'Pusat'}
                  </Badge>
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-400" /> Terakhir Masuk
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {profile?.last_login
                      ? new Date(profile.last_login).toLocaleString('id-ID')
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Shield size={14} className="text-slate-400" /> Atasan / Report To
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {profile?.report_to || 'Kantor Pusat'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-slate-400" /> Status Akun
                  </span>
                  <Badge variant={profile?.activated === 'Y' ? 'green' : 'amber'}>
                    {profile?.activated === 'Y' ? 'Aktif' : 'Non-Aktif'}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Info Security Tips */}
            <Card className="border-blue-100 bg-blue-50/50 p-5 dark:border-blue-900/30 dark:bg-blue-950/20">
              <div className="flex items-start gap-3">
                <ShieldCheck size={20} className="mt-0.5 text-blue-600 dark:text-blue-400" />
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <strong className="block text-slate-800 dark:text-slate-200 mb-1">Keamanan Akun POSIND</strong>
                  Gunakan kata sandi yang kuat dengan kombinasi huruf, angka, dan simbol. Jangan berikan kredensial login kepada pihak lain.
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Edit Profile & Change Password Tabs / Panels */}
          <div className="space-y-6 lg:col-span-2">
            {/* Edit Personal Info */}
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Informasi Pribadi</h3>
                </div>
                <span className="text-xs text-slate-400">cch_profil_pengguna</span>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nama Depan
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="Nama depan"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nama Belakang
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Nama belakang"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Email Resmi
                    </label>
                    <div className="relative">
                      <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        className="input w-full pl-9"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="contoh@posindonesia.co.id"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nomor Telepon / WhatsApp
                    </label>
                    <div className="relative">
                      <Phone size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        className="input w-full pl-9"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="08123456789"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="primary" disabled={savingProfile} className="gap-2">
                    <Save size={16} />
                    {savingProfile ? 'Menyimpan…' : 'Simpan Perubahan'}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Change Password Card */}
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <KeyRound size={18} className="text-amber-600 dark:text-amber-400" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Ganti Kata Sandi</h3>
                </div>
                <span className="text-xs text-slate-400">Keamanan Sesi</span>
              </div>

              {passwordError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertCircle size={15} />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kata Sandi Saat Ini
                  </label>
                  <div className="relative">
                    <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      className="input w-full pl-9"
                      value={passwordData.old_password}
                      onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                      placeholder="Masukkan kata sandi lama Anda"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Kata Sandi Baru
                    </label>
                    <div className="relative">
                      <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        className="input w-full pl-9"
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        placeholder="Minimal 6 karakter"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Konfirmasi Kata Sandi Baru
                    </label>
                    <div className="relative">
                      <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        className="input w-full pl-9"
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                        placeholder="Ulangi kata sandi baru"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="secondary" disabled={savingPassword} className="gap-2">
                    <KeyRound size={16} />
                    {savingPassword ? 'Mengubah…' : 'Perbarui Kata Sandi'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserProfilePage
