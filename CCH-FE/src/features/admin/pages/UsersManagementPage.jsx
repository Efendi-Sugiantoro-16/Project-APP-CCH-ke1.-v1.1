import { useContext, useEffect, useState } from 'react'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  KeyRound,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { usersApi } from '../api/usersApi.js'
import { PageHeader } from '../../../shared/ui/PageHeader.jsx'
import { Card } from '../../../shared/ui/Card.jsx'
import { Pagination } from '../../../shared/ui/Pagination.jsx'
import { Badge } from '../../../shared/ui/Badge.jsx'
import { Button } from '../../../shared/ui/Button.jsx'
import { StatCard } from '../../../shared/ui/StatCard.jsx'
import { CreateUserModal } from '../components/CreateUserModal.jsx'
import { EditUserModal } from '../components/EditUserModal.jsx'
import { ResetPasswordModal } from '../components/ResetPasswordModal.jsx'

export function UsersManagementPage() {
  const { token } = useContext(AuthContext)

  // Data state
  const [usersList, setUsersList] = useState([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [levels, setLevels] = useState([])
  const [offices, setOffices] = useState([])

  // Query state
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('') // 'active', 'inactive', 'locked'
  const [limit, setLimit] = useState(25)
  const [offset, setOffset] = useState(0)

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState('')

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [resettingUser, setResettingUser] = useState(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setOffset(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  // Load levels and offices catalog once
  useEffect(() => {
    if (!token) return
    let active = true

    async function loadCatalogs() {
      try {
        const [lvls, offs] = await Promise.all([
          usersApi.getUserLevels(token).catch(() => []),
          usersApi.listOffices(token).catch(() => []),
        ])
        if (active) {
          setLevels(lvls)
          setOffices(offs)
        }
      } catch (err) {
        console.error('Failed to load catalogs:', err)
      }
    }
    loadCatalogs()

    return () => {
      active = false
    }
  }, [token])

  const [reloadKey, setReloadKey] = useState(0)

  // Fetch users list
  useEffect(() => {
    if (!token) return
    let active = true

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const res = await usersApi.listUsers(token, {
          q: debouncedSearch,
          level: selectedLevel,
          limit,
          offset,
        })

        if (active) {
          let data = res?.data || []
          if (selectedStatus === 'active') {
            data = data.filter((u) => u.activated === 'Y')
          } else if (selectedStatus === 'inactive') {
            data = data.filter((u) => u.activated === 'N')
          } else if (selectedStatus === 'locked') {
            data = data.filter((u) => u.locked === 'Y')
          }

          setUsersList(data)
          setTotalUsers(res?.total || 0)
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Gagal memuat daftar pengguna.')
          setUsersList([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [token, debouncedSearch, selectedLevel, selectedStatus, limit, offset, reloadKey])

  const fetchUsers = () => setReloadKey((k) => k + 1)

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4000)
  }

  // Calculate statistics
  const activeCount = usersList.filter((u) => u.activated === 'Y').length
  const lockedCount = usersList.filter((u) => u.locked === 'Y').length

  const getRoleTone = (levelId) => {
    switch (String(levelId)) {
      case '-1':
        return 'violet' // SysAdmin
      case '29':
        return 'amber' // Admin Pusat
      case '19':
      case '10':
        return 'indigo' // Regional
      case '3':
        return 'brand' // Call Center
      case '1':
      case '2':
      case '9':
        return 'sky' // UPT
      default:
        return 'neutral'
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d)
    } catch {
      return dateStr
    }
  }

  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(totalUsers / limit) || 1

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-24 right-8 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-xl animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          eyebrow="Administrator"
          title="Manajemen Pengguna"
          subtitle="Kelola akun petugas CCH POSIND, otoritas level akses, status akun, dan kata sandi."
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="btn btn-secondary flex items-center gap-2 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 shadow-sm"
            title="Muat Ulang Data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
          <Button
            type="button"
            tone="primary"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <UserPlus size={16} />
            <span>Tambah Pengguna</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Terdaftar"
          value={totalUsers}
          icon={Users}
          tone="brand"
          hint="Petugas di database"
        />
        <StatCard
          label="Petugas Aktif"
          value={activeCount}
          icon={UserCheck}
          tone="green"
          hint="Status aktivasi 'Y'"
        />
        <StatCard
          label="Akun Terkunci"
          value={lockedCount}
          icon={ShieldAlert}
          tone="amber"
          hint="Status locked 'Y'"
        />
        <StatCard
          label="Total Role / Level"
          value={levels.length || 8}
          icon={Shield}
          tone="sky"
          hint="Katalog otoritas CCH"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari username, nama lengkap, atau email petugas…"
              className="input w-full pl-10 pr-9 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by Role */}
            <div className="w-full sm:w-auto">
              <select
                value={selectedLevel}
                onChange={(e) => {
                  setSelectedLevel(e.target.value)
                  setOffset(0)
                }}
                className="input bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 text-xs sm:text-sm font-medium w-full"
              >
                <option value="">Semua Role / Level</option>
                {levels.map((lvl) => (
                  <option key={lvl.id} value={String(lvl.id)}>
                    {lvl.name} (Lvl {lvl.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div className="w-full sm:w-auto">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value)
                  setOffset(0)
                }}
                className="input bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 text-xs sm:text-sm font-medium w-full"
              >
                <option value="">Semua Status</option>
                <option value="active">Aktif Saja</option>
                <option value="inactive">Non-aktif Saja</option>
                <option value="locked">Terkunci Saja</option>
              </select>
            </div>

            {/* Limit Selector */}
            <div className="w-full sm:w-auto">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setOffset(0)
                }}
                className="input bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 text-xs sm:text-sm font-medium w-full"
              >
                <option value={10}>10 / halaman</option>
                <option value={25}>25 / halaman</option>
                <option value={50}>50 / halaman</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
        {error && (
          <div className="p-4 border-b border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4 sm:px-6">Petugas</th>
                <th className="py-3.5 px-4">Kontak</th>
                <th className="py-3.5 px-4">Role & Kantor</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Terdaftar</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2 font-medium">
                      <RefreshCw size={18} className="animate-spin text-blue-500" />
                      Memuat daftar pengguna…
                    </div>
                  </td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="text-slate-600 font-semibold text-base">Tidak ada pengguna ditemukan</p>
                      <p className="text-xs text-slate-400">
                        Coba sesuaikan kata kunci pencarian atau filter role/status Anda.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                usersList.map((u) => {
                  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ')
                  const initials = (u.username || 'U').slice(0, 2).toUpperCase()

                  return (
                    <tr
                      key={u.username}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Petugas Column */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 text-blue-700 dark:text-blue-300 font-bold border border-blue-200/50 dark:border-blue-700/50">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <p className="font-mono font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate">
                              {u.username}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {fullName || <span className="italic text-slate-400 dark:text-slate-500">- Belum ada nama -</span>}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Kontak Column */}
                      <td className="py-4 px-4">
                        <div className="space-y-1 text-xs">
                          {u.email ? (
                            <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <Mail size={13} className="text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{u.email}</span>
                            </p>
                          ) : null}
                          {u.phone ? (
                            <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <Phone size={13} className="text-slate-400 shrink-0" />
                              <span>{u.phone}</span>
                            </p>
                          ) : null}
                          {!u.email && !u.phone && <span className="text-slate-400 italic">-</span>}
                        </div>
                      </td>

                      {/* Role & Kantor Column */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
                          <div>
                            <Badge tone={getRoleTone(u.user_level_id)}>
                              {u.user_level_name || `Level ${u.user_level_id}`}
                            </Badge>
                          </div>
                          {u.office_code ? (
                            <p className="flex items-center gap-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                              <Building2 size={12} className="text-slate-400" />
                              <span>{u.office_code}</span>
                            </p>
                          ) : null}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          {u.activated === 'Y' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Non-aktif
                            </span>
                          )}

                          {u.locked === 'Y' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/40 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                              <Lock size={10} /> Terkunci
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Terdaftar Column */}
                      <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <p>{formatDate(u.date_added)}</p>
                        {u.last_login && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                            Login: {formatDate(u.last_login)}
                          </p>
                        )}
                      </td>

                      {/* Aksi Column */}
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                            title="Ubah Data Pengguna"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setResettingUser(u)}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition border border-transparent hover:border-red-200 dark:hover:border-red-800"
                            title="Reset Kata Sandi"
                          >
                            <KeyRound size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          offset={offset}
          count={usersList.length}
          total={totalUsers}
          perPage={limit}
          loading={loading}
          onPage={setOffset}
          pageSizeOptions={[10, 25, 50, 100]}
          onPerPageChange={(newLimit) => {
            setLimit(newLimit)
            setOffset(0)
          }}
          label="pengguna"
        />
      </Card>

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          fetchUsers()
          showToast('Pengguna baru berhasil ditambahkan!')
        }}
        levels={levels}
        offices={offices}
      />

      <EditUserModal
        user={editingUser}
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onUpdated={() => {
          fetchUsers()
          showToast('Data pengguna berhasil diperbarui!')
        }}
        levels={levels}
        offices={offices}
      />

      <ResetPasswordModal
        user={resettingUser}
        isOpen={Boolean(resettingUser)}
        onClose={() => setResettingUser(null)}
        onReset={() => {
          showToast('Kata sandi pengguna berhasil direset!')
        }}
      />
    </div>
  )
}
