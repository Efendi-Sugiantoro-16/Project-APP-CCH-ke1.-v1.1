import { useContext, useState } from 'react'
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { KeyRound, LogIn, ShieldCheck, User, ArrowLeft } from 'lucide-react'
import { AuthContext } from '../auth-context.js'

export default function LoginPage() {
  const { login, isAuthenticated } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = location.state?.from || '/workspace'

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const trimmedUsername = username.trim()
    const trimmedPassword = password.trim()

    if (!trimmedUsername) {
      setError('Username wajib diisi')
      setLoading(false)
      return
    }

    if (!trimmedPassword) {
      setError('Password wajib diisi')
      setLoading(false)
      return
    }

    try {
      // Call production auth login endpoint
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: trimmedUsername,
          password: trimmedPassword,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage =
          typeof errorData.error === 'string'
            ? errorData.error
            : errorData.error?.message || errorData.message || `Login gagal (${response.status})`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (!data.token) {
        throw new Error('Token tidak diterima dari server')
      }

      // Store token & user using AuthContext
      login(data.token, data.user || null)
      
      // Navigate to workspace
      void navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Login gagal. Silakan coba lagi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Back to Home Link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Beranda</span>
        </Link>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 transition-colors">
          {/* Header with Official POS IND Logo */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-3 p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-md">
              <img
                src="/posind_logo_navy.png"
                alt="POS IND — PT Pos Indonesia (Persero)"
                className="h-16 w-auto object-contain dark:hidden"
              />
              <img
                src="/posind_logo_white.png"
                alt="POS IND — PT Pos Indonesia (Persero)"
                className="h-16 w-auto object-contain hidden dark:block"
              />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Login Staf</h1>
              <span className="rounded-lg bg-orange-100 dark:bg-orange-950/60 px-2 py-0.5 text-xs font-bold text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50">
                CCH
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Customer Complaint Handling — PT Pos Indonesia (Persero)</p>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-500 rounded-r-lg p-4 mb-6 flex gap-3">
            <ShieldCheck size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-200">
              <p className="font-semibold mb-1">Akses Staf Call Center</p>
              <p className="text-blue-700 dark:text-blue-300">Masukkan username dan password Anda untuk mengakses sistem CCH.</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <User size={14} />
                <span>Username</span>
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Masukkan username Anda"
                disabled={loading}
                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <KeyRound size={14} />
                <span>Password</span>
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:cursor-not-allowed"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 flex gap-3" role="alert">
                <span className="text-red-500 text-lg">⚠️</span>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              className="w-full px-6 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Login ke Workspace</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Preset Accounts */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Akun Resmi POSIND (Klik untuk Isi Cepat):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setUsername('Masino1973')
                  setPassword('admincchnewversion')
                  setError('')
                }}
                className="text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition group"
              >
                <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">Masino1973</div>
                <div className="text-[11px] text-slate-500">Administrator (Level -1)</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('cs.pilot.dev')
                  setPassword('Bambu!Komet73-LautNanas')
                  setError('')
                }}
                className="text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition group"
              >
                <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">cs.pilot.dev</div>
                <div className="text-[11px] text-slate-500">CS Pilot (Level 3)</div>
              </button>
            </div>
          </div>

          {/* Security Note */}
          <div className="mt-5 pt-4 border-t border-slate-200">
            <div className="flex items-start gap-2 text-xs text-slate-500">
              <ShieldCheck size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
              <p>
                Token disimpan secara aman di session browser dan otomatis dibersihkan saat logout.
              </p>
            </div>
          </div>

          {/* Dev Login Link */}
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-600">
              Mode Development?{' '}
              <Link to="/dev-login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition">
                Login tanpa password →
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom Help Link */}
        <div className="text-center">
          <p className="text-sm text-slate-600">
            Lupa password?{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition">
              Hubungi Administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
