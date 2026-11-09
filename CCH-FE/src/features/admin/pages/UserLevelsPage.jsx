import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../../auth/auth-context.js'
import { PageHeader } from '../../../shared/ui/PageHeader.jsx'
import { Card } from '../../../shared/ui/Card.jsx'
import { adminApi } from '../api/adminApi.js'
import {
  Shield,
  ShieldAlert,
  Search,
  Check,
  X,
  Building2,
  Headphones,
  Crown,
  Briefcase,
  Layers,
  BarChart3,
  Loader2,
  AlertCircle,
  HelpCircle,
  Edit3,
  Save,
  RotateCcw,
  Lock,
  CheckCircle2,
} from 'lucide-react'

// Metadata deskripsi dan warna badge untuk masing-masing User Level CCH
const ROLE_METADATA = {
  '-2': { role: 'Anonymous', tag: 'Tamu / Publik', icon: HelpCircle, desc: 'Akses tanpa login; khusus untuk chatbot intake publik.', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  '-1': { role: 'Administrator', tag: 'Super User', icon: Crown, desc: 'Akses teknis dan kontrol penuh ke seluruh tabel dan fitur sistem.', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  '0': { role: 'Default', tag: 'Akses Dasar', icon: Shield, desc: 'Profil standar sistem bawaan sebelum ditentukan unit tugas spesifik.', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  '1': { role: 'UPT', tag: 'Kantor Cabang', icon: Building2, desc: 'Petugas operasional Kantor Cabang (Kprk/Kpc) penerima & penindak aduan.', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  '2': { role: 'UPT dan Bandara', tag: 'Logistik Bandara', icon: Building2, desc: 'Petugas penanganan kargo udara, bandara, dan sentral pengolahan pos.', color: 'bg-teal-100 text-teal-700 border-teal-300' },
  '3': { role: 'Call Center', tag: 'Frontline Agent', icon: Headphones, desc: 'Petugas Call Center 1500161: Entri tiket, follow-up, & mutasi status.', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  '9': { role: 'Admin UPT', tag: 'Supervisor UPT', icon: Briefcase, desc: 'Supervisor atau Kepala Kantor UPT pengawas tindak lanjut tiket lokal.', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  '10': { role: 'Regional', tag: 'Kantor Regional', icon: Layers, desc: 'Staf pengawas operasional kantor wilayah regional POSIND.', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  '19': { role: 'Admin Regional', tag: 'Supervisor Reg', icon: ShieldAlert, desc: 'Supervisor pengelola akun dan eskalasi aduan se-regional.', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  '20': { role: 'Kantor Pusat', tag: 'Headquarters', icon: Building2, desc: 'Staf direktorat operasi dan layanan pelanggan kantor pusat.', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  '29': { role: 'Admin Pusat', tag: 'Admin Nasional', icon: Crown, desc: 'Administrator nasional pengelola master data dan konfigurasi CCH.', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  '30': { role: 'Direksi', tag: 'Executive Board', icon: BarChart3, desc: 'Pimpinan tinggi: Pemantauan KPI nasional & laporan analitik eksekutif.', color: 'bg-violet-100 text-violet-700 border-violet-300' },
}

// Metadata nama entitas manusiawi & pengelompokan kategori
const ENTITY_METADATA = {
  cchentri: { label: 'Pengaduan Pelanggan (Tiket Utama)', category: 'complaints' },
  cchentricus: { label: 'Data Pelanggan Terkait Tiket', category: 'complaints' },
  cchentridet: { label: 'Rincian & Tindak Lanjut Penanganan', category: 'complaints' },
  cchentridok: { label: 'Dokumen & Lampiran Bukti', category: 'complaints' },
  cchentrimas: { label: 'Riwayat Audit & Status Tiket', category: 'complaints' },
  cch_users: { label: 'Data Pengguna Sistem', category: 'admin' },
  cch_userlevels: { label: 'Katalog Level / Role Pengguna', category: 'admin' },
  cch_userlevelpermissions: { label: 'Matriks Hak Akses Tabel', category: 'admin' },
  cch_jenis_pengaduan: { label: 'Master Kategori Pengaduan', category: 'masters' },
  cch_jenis_layanan: { label: 'Master Layanan Kiriman Pos', category: 'masters' },
  cch_jenis_penanganan: { label: 'Master Status Penanganan', category: 'masters' },
  cch_jenis_dokumen: { label: 'Master Jenis Dokumen Bukti', category: 'masters' },
  cch_kantor: { label: 'Master Kantor Cabang (UPT)', category: 'masters' },
  cch_regional: { label: 'Master Regional POSIND', category: 'masters' },
  cch_cs_officer: { label: 'Master Petugas CS Officer', category: 'masters' },
  cch_announcement: { label: 'Pengumuman Sistem', category: 'admin' },
  cch_settings: { label: 'Konfigurasi Aplikasi', category: 'admin' },
  cch_kalender_libur: { label: 'Kalender Hari Libur Nasional', category: 'masters' },
  cch_languages: { label: 'Master Bahasa Antarmuka', category: 'masters' },
  cch_timezone: { label: 'Master Zona Waktu (WIB/WITA/WIT)', category: 'masters' },
  cch_help: { label: 'Artikel Bantuan Operasional', category: 'masters' },
}

const CATEGORIES = [
  { id: 'all', label: 'Semua Entitas' },
  { id: 'complaints', label: 'Tiket & Operasional' },
  { id: 'masters', label: 'Master Data' },
  { id: 'admin', label: 'Admin & Akses' },
  { id: 'reports', label: 'Laporan & Rekap' },
]

export function UserLevelsPage() {
  const { token } = useContext(AuthContext)
  const [levels, setLevels] = useState([])
  const [loadingLevels, setLoadingLevels] = useState(true)
  const [selectedLevelId, setSelectedLevelId] = useState(null)
  
  const [permissions, setPermissions] = useState([])
  const [loadingPerms, setLoadingPerms] = useState(false)
  const [errorPerms, setErrorPerms] = useState('')

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false)
  const [draftPermissions, setDraftPermissions] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState('')
  const [saveError, setSaveError] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  // Load user levels on mount
  useEffect(() => {
    let active = true
    async function loadRoles() {
      try {
        setLoadingLevels(true)
        const res = await adminApi.listUserLevels(token, { limit: 50 })
        if (!active) return
        const list = res || []
        setLevels(list)
        if (list.length > 0 && selectedLevelId === null) {
          // Default select Call Center (3) or first available
          const defaultRole = list.find((r) => r.user_level_id === 3) || list[0]
          setSelectedLevelId(defaultRole.user_level_id)
        }
      } catch (err) {
        console.error('Failed to load user levels:', err)
      } finally {
        if (active) setLoadingLevels(false)
      }
    }
    if (token) loadRoles()
    return () => { active = false }
  }, [token, selectedLevelId])

  // Load permissions when selected level changes
  useEffect(() => {
    if (selectedLevelId === null || !token) return
    let active = true

    async function loadPermissions() {
      try {
        setLoadingPerms(true)
        setErrorPerms('')
        setIsEditing(false)
        setDraftPermissions({})
        setSaveSuccess('')
        setSaveError('')
        const data = await adminApi.getUserLevelPermissions(token, selectedLevelId)
        if (!active) return
        setPermissions(data || [])
      } catch (err) {
        if (!active) return
        console.error('Failed to load permissions:', err)
        setErrorPerms('Gagal memuat matriks hak akses untuk role ini.')
      } finally {
        if (active) setLoadingPerms(false)
      }
    }

    loadPermissions()
    return () => { active = false }
  }, [token, selectedLevelId])

  const selectedLevel = levels.find((l) => l.user_level_id === selectedLevelId)
  const roleMeta = selectedLevelId !== null ? ROLE_METADATA[String(selectedLevelId)] : null
  const isSuperAdmin = selectedLevelId === -1

  // Switch to Edit Mode
  const handleStartEditing = () => {
    if (isSuperAdmin) return
    const draft = {}
    permissions.forEach((p) => {
      draft[p.table_name] = { ...p }
    })
    setDraftPermissions(draft)
    setIsEditing(true)
    setSaveSuccess('')
    setSaveError('')
  }

  // Cancel Edit Mode
  const handleCancelEditing = () => {
    setIsEditing(false)
    setDraftPermissions({})
    setSaveError('')
  }

  // Toggle individual permission checkbox
  const handleToggle = (tableName, field) => {
    setDraftPermissions((prev) => {
      const current = prev[tableName] || {}
      const updated = { ...current, [field]: !current[field] }
      let mask = 0
      if (updated.allow_add) mask |= 1
      if (updated.allow_delete) mask |= 2
      if (updated.allow_edit) mask |= 4
      if (updated.allow_list || updated.allow_view) mask |= 8
      if (updated.allow_view) mask |= 32
      if (updated.allow_search) mask |= 64
      if (updated.allow_import) mask |= 128
      if (updated.allow_lookup) mask |= 256
      if (updated.allow_export) mask |= 1024
      if (updated.allow_print) mask |= 2048
      updated.permission = mask
      return { ...prev, [tableName]: updated }
    })
  }

  // Bulk actions for visible / category tables
  const handleBulkSetCurrentCategory = (mode) => {
    setDraftPermissions((prev) => {
      const updated = { ...prev }
      filteredPermissions.forEach((item) => {
        const tbl = item.table_name
        if (mode === 'full') {
          updated[tbl] = {
            ...updated[tbl],
            allow_add: true,
            allow_edit: true,
            allow_delete: true,
            allow_view: true,
            allow_list: true,
            allow_search: true,
            allow_export: true,
            permission: 1 | 2 | 4 | 8 | 32 | 64 | 1024,
          }
        } else if (mode === 'readonly') {
          updated[tbl] = {
            ...updated[tbl],
            allow_add: false,
            allow_edit: false,
            allow_delete: false,
            allow_view: true,
            allow_list: true,
            allow_search: true,
            allow_export: false,
            permission: 8 | 32 | 64,
          }
        } else if (mode === 'none') {
          updated[tbl] = {
            ...updated[tbl],
            allow_add: false,
            allow_edit: false,
            allow_delete: false,
            allow_view: false,
            allow_list: false,
            allow_search: false,
            allow_export: false,
            permission: 0,
          }
        }
      })
      return updated
    })
  }

  // Save changes to backend
  const handleSavePermissions = async () => {
    if (selectedLevelId === null || isSuperAdmin) return
    try {
      setSaving(true)
      setSaveError('')
      setSaveSuccess('')
      const payloadItems = Object.values(draftPermissions)
      const updated = await adminApi.updateUserLevelPermissions(token, selectedLevelId, payloadItems)
      setPermissions(updated || [])
      setIsEditing(false)
      setDraftPermissions({})
      setSaveSuccess(`Hak akses matriks untuk role "${selectedLevel?.user_level_name || selectedLevelId}" berhasil disimpan ke basis data!`)
      setTimeout(() => setSaveSuccess(''), 6000)
    } catch (err) {
      console.error('Failed to update permissions:', err)
      setSaveError(err.message || 'Gagal menyimpan perubahan matriks hak akses.')
    } finally {
      setSaving(false)
    }
  }

  // Active permission source (draft if editing, otherwise original permissions)
  const displayPermissions = !isEditing
    ? permissions
    : permissions.map((p) => draftPermissions[p.table_name] || p)

  // Filtered permissions list
  const filteredPermissions = displayPermissions.filter((item) => {
    const tbl = item.table_name || ''
    const meta = ENTITY_METADATA[tbl]
    const label = meta?.label || tbl
    const isReport = tbl.startsWith('cch_rekap') || tbl.startsWith('cch_rincian') || tbl.startsWith('cch_stats') || tbl.endsWith('.php')
    const category = isReport ? 'reports' : (meta?.category || 'admin')

    if (activeCategory !== 'all' && category !== activeCategory) {
      return false
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesTbl = tbl.toLowerCase().includes(q)
      const matchesLabel = label.toLowerCase().includes(q)
      if (!matchesTbl && !matchesLabel) return false
    }

    return true
  })

  // Summary counts
  let fullCount = 0
  let readOnlyCount = 0
  let restrictedCount = 0
  for (const p of displayPermissions) {
    if (p.allow_add && p.allow_edit && p.allow_delete) {
      fullCount++
    } else if (p.allow_view || p.allow_list) {
      readOnlyCount++
    } else {
      restrictedCount++
    }
  }
  const stats = { full: fullCount, readOnly: readOnlyCount, restricted: restrictedCount, total: displayPermissions.length }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administrator & Keamanan"
        title="Katalog Role & Permission Matrix"
        subtitle="Kelola katalog level pengguna, inspeksi, dan mutasi matriks hak akses bitwise tabel operasional CCH POSIND."
      />

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">{saveSuccess}</span>
          </div>
          <button
            onClick={() => setSaveSuccess('')}
            className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
            title="Tutup pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Save Error Alert */}
      {saveError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="text-sm font-medium">{saveError}</span>
          </div>
          <button
            onClick={() => setSaveError('')}
            className="p-1 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50"
            title="Tutup pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid: Left Role Selector (1/3) vs Right Permission Matrix (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Role Selector List */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Daftar Level Pengguna</h3>
              </div>
              <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full">
                {levels.length} Level
              </span>
            </div>

            {loadingLevels ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-xs">Memuat katalog level…</span>
              </div>
            ) : (
              <div className="mt-3 space-y-2 max-h-[640px] overflow-y-auto pr-1">
                {levels.map((level) => {
                  const meta = ROLE_METADATA[String(level.user_level_id)] || {
                    tag: 'Level Umum',
                    icon: Shield,
                    color: 'bg-slate-100 text-slate-700 border-slate-300',
                    desc: 'Level peran operasional CCH.',
                  }
                  const Icon = meta.icon
                  const isSelected = selectedLevelId === level.user_level_id

                  return (
                    <button
                      key={level.user_level_id}
                      onClick={() => {
                        if (isEditing) {
                          if (window.confirm('Perubahan yang belum disimpan akan hilang. Lanjutkan ganti role?')) {
                            setIsEditing(false)
                            setSelectedLevelId(level.user_level_id)
                          }
                        } else {
                          setSelectedLevelId(level.user_level_id)
                        }
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex items-start gap-3 min-h-[44px] ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 shadow-sm ring-1 ring-blue-500/20'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className={`p-2 rounded-md shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-semibold text-sm truncate ${isSelected ? 'text-blue-900 dark:text-blue-200' : 'text-slate-800 dark:text-slate-100'}`}>
                            {level.user_level_name}
                          </span>
                          <span className="text-[11px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                            ID: {level.user_level_id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          {meta.desc}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: Interactive Permission Matrix */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Active Role Overview Card */}
          {selectedLevel && (
            <Card className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white border-none shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                    {roleMeta?.icon ? <roleMeta.icon className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold tracking-tight text-white">
                        {selectedLevel.user_level_name}
                      </h2>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/40">
                        {roleMeta?.tag || 'Role CCH'}
                      </span>
                      {isSuperAdmin && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-purple-500/30 text-purple-200 border border-purple-400/40 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Terkunci Permanen
                        </span>
                      )}
                      {isEditing && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-500/30 text-amber-200 border border-amber-400/40 animate-pulse flex items-center gap-1">
                          <Edit3 className="w-3 h-3" /> Mode Pengeditan Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      {roleMeta?.desc || 'Hak akses granular dikonfigurasi melalui tabel matriks ACL sistem.'}
                    </p>
                  </div>
                </div>

                {/* Quick stats badge */}
                <div className="flex gap-2 text-center shrink-0">
                  <div className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
                    <span className="block text-xs text-slate-300">Total Entitas</span>
                    <span className="font-bold text-sm text-white">{stats.total}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30">
                    <span className="block text-xs text-emerald-300">Akses Penuh</span>
                    <span className="font-bold text-sm text-emerald-200">{stats.full}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-400/30">
                    <span className="block text-xs text-blue-300">Read-Only</span>
                    <span className="font-bold text-sm text-blue-200">{stats.readOnly}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Superadmin Lock Warning Banner */}
          {isSuperAdmin && (
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 flex items-start gap-3">
              <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-purple-950 dark:text-purple-100">
                  Proteksi Kernel: Hak Akses Super Administrator Dikunci
                </p>
                <p className="text-purple-700 dark:text-purple-300">
                  Peran Super Administrator memiliki hak akses penuh permanen (Bitmask 524287) yang diproteksi di tingkat kernel backend CCH untuk mencegah sistem terkunci (lockout). Matriks ini berstatus <em>Read-Only Permanen</em>.
                </p>
              </div>
            </div>
          )}

          {/* Matrix Actions & Search Bar */}
          <Card className="p-4 space-y-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              
              {/* Category Tabs */}
              <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all min-h-[32px] ${
                      activeCategory === cat.id
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Action Buttons: Edit / Save / Cancel */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {!isEditing ? (
                  <button
                    onClick={handleStartEditing}
                    disabled={isSuperAdmin || loadingPerms}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 transition-colors shadow-sm disabled:cursor-not-allowed min-h-[36px]"
                    title={isSuperAdmin ? 'Super Administrator terkunci dan tidak dapat diedit' : 'Mulai mengedit matriks izin role ini'}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Matriks Izin</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleCancelEditing}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 transition-colors min-h-[36px]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Batal</span>
                    </button>
                    <button
                      onClick={handleSavePermissions}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white transition-colors shadow-sm min-h-[36px]"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan…</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Simpan Perubahan Matriks</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Sub-toolbar: Search & Quick Edit Actions when isEditing */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Quick Actions (Only in Edit Mode) */}
              {isEditing ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Aksi Cepat ({filteredPermissions.length} entitas):
                  </span>
                  <button
                    onClick={() => handleBulkSetCurrentCategory('full')}
                    className="px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
                  >
                    Beri Semua Akses
                  </button>
                  <button
                    onClick={() => handleBulkSetCurrentCategory('readonly')}
                    className="px-2.5 py-1 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                  >
                    Hanya Baca (Read-Only)
                  </button>
                  <button
                    onClick={() => handleBulkSetCurrentCategory('none')}
                    className="px-2.5 py-1 rounded text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
                  >
                    Cabut Semua Akses
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredPermissions.length}</span> entitas dalam kategori ini.
                </div>
              )}

              {/* Search input */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari entitas atau tabel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>
            </div>

            {/* Matrix Data Table */}
            {loadingPerms ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium">Memuat rincian izin tabel…</span>
              </div>
            ) : errorPerms ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-rose-500">
                <AlertCircle className="w-8 h-8" />
                <span className="text-sm font-medium">{errorPerms}</span>
              </div>
            ) : filteredPermissions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                Tidak ada entitas yang cocok dengan pencarian / kategori ini.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg -webkit-overflow-scrolling-touch">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-3 min-w-[200px] sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-[1px_0_3px_rgba(0,0,0,0.05)]">
                        Nama Entitas / Domain
                      </th>
                      <th className="py-3 px-2 text-center min-w-[70px]">Tambah (Add)</th>
                      <th className="py-3 px-2 text-center min-w-[70px]">Ubah (Edit)</th>
                      <th className="py-3 px-2 text-center min-w-[70px]">Hapus (Del)</th>
                      <th className="py-3 px-2 text-center min-w-[70px]">Lihat (View)</th>
                      <th className="py-3 px-2 text-center min-w-[70px]">Cari (Search)</th>
                      <th className="py-3 px-2 text-center min-w-[70px]">Ekspor</th>
                      <th className="py-3 px-3 text-right min-w-[65px]">Mask</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPermissions.map((perm) => {
                      const meta = ENTITY_METADATA[perm.table_name]
                      const displayName = meta?.label || perm.table_name
                      const isClean = Boolean(meta)

                      return (
                        <tr key={perm.table_name} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[1px_0_3px_rgba(0,0,0,0.05)]">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {displayName}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                {perm.table_name}
                              </span>
                              {isClean && (
                                <span className="text-[9px] px-1 py-0.1 rounded font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                  Core CCH
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Add */}
                          <td className="py-2.5 px-2 text-center">
                            {isEditing ? (
                              <PermissionCheckbox
                                checked={Boolean(perm.allow_add)}
                                onChange={() => handleToggle(perm.table_name, 'allow_add')}
                                label="Tambah"
                              />
                            ) : (
                              <PermissionBadge active={perm.allow_add} label="Add" />
                            )}
                          </td>

                          {/* Edit */}
                          <td className="py-2.5 px-2 text-center">
                            {isEditing ? (
                              <PermissionCheckbox
                                checked={Boolean(perm.allow_edit)}
                                onChange={() => handleToggle(perm.table_name, 'allow_edit')}
                                label="Ubah"
                              />
                            ) : (
                              <PermissionBadge active={perm.allow_edit} label="Edit" />
                            )}
                          </td>

                          {/* Delete */}
                          <td className="py-2.5 px-2 text-center">
                            {isEditing ? (
                              <PermissionCheckbox
                                checked={Boolean(perm.allow_delete)}
                                onChange={() => handleToggle(perm.table_name, 'allow_delete')}
                                label="Hapus"
                                isDangerous
                              />
                            ) : (
                              <PermissionBadge active={perm.allow_delete} label="Delete" isDangerous />
                            )}
                          </td>

                          {/* View */}
                          <td className="py-2.5 px-2 text-center">
                            {isEditing ? (
                              <PermissionCheckbox
                                checked={Boolean(perm.allow_view || perm.allow_list)}
                                onChange={() => handleToggle(perm.table_name, 'allow_view')}
                                label="Lihat"
                              />
                            ) : (
                              <PermissionBadge active={perm.allow_view || perm.allow_list} label="View" />
                            )}
                          </td>

                          {/* Search */}
                          <td className="py-2.5 px-2 text-center">
                            {isEditing ? (
                              <PermissionCheckbox
                                checked={Boolean(perm.allow_search)}
                                onChange={() => handleToggle(perm.table_name, 'allow_search')}
                                label="Cari"
                              />
                            ) : (
                              <PermissionBadge active={perm.allow_search} label="Search" />
                            )}
                          </td>

                          {/* Export */}
                          <td className="py-2.5 px-2 text-center">
                            {isEditing ? (
                              <PermissionCheckbox
                                checked={Boolean(perm.allow_export)}
                                onChange={() => handleToggle(perm.table_name, 'allow_export')}
                                label="Ekspor"
                              />
                            ) : (
                              <PermissionBadge active={perm.allow_export} label="Export" />
                            )}
                          </td>

                          {/* Raw Bitwise Value */}
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                            {perm.permission}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Legend */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Izin Diberikan
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 inline-block"></span> Dibatasi
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Izin Hapus (Destruktif)
                </span>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Sistem Bitwise ACL POSIND: 1 (Add) • 2 (Delete) • 4 (Edit) • 8 (List) • 32 (View) • 64 (Search) • 1024 (Export)
              </span>
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}

function PermissionBadge({ active, isDangerous = false }) {
  if (active) {
    return (
      <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-semibold ${
          isDangerous
            ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
        }`}
      >
        <Check className="w-3.5 h-3.5" />
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-slate-300 dark:text-slate-600">
      <X className="w-3 h-3" />
    </span>
  )
}

function PermissionCheckbox({ checked, onChange, label, isDangerous = false }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-all border min-h-[30px] min-w-[30px] ${
        checked
          ? isDangerous
            ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-1 ring-rose-400'
            : 'bg-blue-600 text-white border-blue-600 shadow-sm ring-1 ring-blue-400'
          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
      }`}
      title={`${checked ? 'Cabut izin' : 'Beri izin'} ${label}`}
    >
      {checked ? <Check className="w-4 h-4 stroke-[2.5]" /> : null}
    </button>
  )
}