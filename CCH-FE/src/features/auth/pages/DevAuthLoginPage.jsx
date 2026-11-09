import { useContext, useState } from 'react'
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { KeyRound, LogIn, ShieldCheck, User, Building2, ArrowLeft } from 'lucide-react'
import { AuthContext } from '../auth-context.js'

export default function DevAuthLoginPage() {
  const { login, isAuthenticated } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('081327949797')
  const [office, setOffice] = useState('40005CC')
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
    const trimmedOffice = office.trim()

    if (!trimmedUsername) {
      setError('Username wajib diisi.')
      setLoading(false)
      return
    }

    if (!trimmedOffice) {
      setError('Kode kantor wajib diisi.')
      setLoading(false)
      return
    }

    try {
      // Call DevAuth login endpoint
      const response = await fetch('/dev/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: trimmedUsername,
          office: trimmedOffice,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Login gagal')
      }

      const data = await response.json()
      
      if (!data.token) {
        throw new Error('Token tidak diterima dari server')
      }

      // Store token using AuthContext
      login(data.token)
      
      // Navigate to workspace
      void navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Login gagal. Silakan coba lagi.')
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
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-orange-600 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Beranda</span>
        </Link>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {/* Header with Icon */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dev Login</h1>
              <p className="text-sm text-slate-500">Development Mode</p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-orange-50 border-l-4 border-orange-500 rounded-r-lg p-4 mb-6 flex gap-3">
            <ShieldCheck size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-900">
              <p className="font-semibold mb-1">🔧 Development Mode</p>
              <p className="text-orange-700">Login tanpa password untuk testing. Gunakan username dan kode kantor yang valid dari database.</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <User size={14} />
                <span>Username</span>
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="081327949797 atau 40005PI02"
                disabled={loading}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Office Code Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Building2 size={14} />
                <span>Kode Kantor</span>
              </label>
              <input
                type="text"
                autoComplete="off"
                value={office}
                onChange={(event) => setOffice(event.target.value)}
                placeholder="40005CC"
                disabled={loading}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
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
              className="w-full px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
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
                  <KeyRound size={18} />
                  <span>Login ke Workspace</span>
                </>
              )}
            </button>
          </form>

          {/* Test Accounts */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs font-bold text-slate-700 mb-3">📝 Test Accounts (Real Users):</p>
            <div className="space-y-2">
              <div className="text-xs bg-orange-50 border border-orange-200 px-4 py-3 rounded-lg">
                <p className="font-semibold text-orange-900 mb-1">Username: <code className="text-orange-600 font-mono">081327949797</code></p>
                <p className="text-slate-600">Titin Maria Ulfah - Call Center</p>
              </div>
              <div className="text-xs bg-orange-50 border border-orange-200 px-4 py-3 rounded-lg">
                <p className="font-semibold text-orange-900 mb-1">Username: <code className="text-orange-600 font-mono">40005PI02</code></p>
                <p className="text-slate-600">Galih Aprianto - Call Center</p>
              </div>
              <div className="text-xs bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg">
                <p className="font-semibold text-blue-900">Office: <code className="text-blue-600 font-mono">40005CC</code></p>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="mt-5 pt-5 border-t border-slate-200">
            <div className="flex items-start gap-2 text-xs text-slate-500">
              <LogIn size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
              <p>
                Token JWT akan disimpan pada session browser dan valid selama 24 jam. 
                Token ini real dan terhubung ke database CCH.
              </p>
            </div>
          </div>

          {/* Production Login Link */}
          <div className="mt-5 text-center">
            <p className="text-sm text-slate-600">
              Mode Production?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition">
                Login dengan password →
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom Help Link */}
        <div className="text-center">
          <p className="text-sm text-slate-600">
            Butuh bantuan?{' '}
            <a href="#" className="text-orange-600 hover:text-orange-700 font-medium hover:underline transition">
              Hubungi Administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
