import { useContext, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Edit3,
  FileText,
  Files,
  Globe,
  HelpCircle,
  Languages,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  UserCheck,
  X,
} from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { mastersApi } from '../api/mastersApi.js'
import { Card } from '../../../shared/ui/Card.jsx'
import { Badge } from '../../../shared/ui/Badge.jsx'
import { Button } from '../../../shared/ui/Button.jsx'
import { Pagination } from '../../../shared/ui/Pagination.jsx'

// Master metadata catalog & schemas
const MASTER_CONFIGS = [
  // --- Operasional Aduan ---
  {
    id: 'complaintTypes',
    label: 'Jenis Pengaduan',
    category: 'Operasional',
    icon: FileText,
    idField: 'code',
    searchFields: ['code', 'description'],
    api: mastersApi.complaintTypes,
    description: 'Kategori pokok jenis pengaduan nasabah CCH (43 item).',
    columns: [
      { key: 'code', label: 'Kode', badge: true },
      { key: 'description', label: 'Deskripsi Aduan' },
      { key: 'active', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'code', label: 'Kode Aduan (Angka)', type: 'number', required: true, createOnly: true },
      { name: 'description', label: 'Deskripsi Aduan', type: 'text', maxLength: 50 },
      { name: 'active', label: 'Status Aktif', type: 'checkbox', default: true },
    ],
  },
  {
    id: 'shippingServices',
    label: 'Jenis Layanan',
    category: 'Operasional',
    icon: Truck,
    idField: 'code',
    searchFields: ['code', 'description'],
    api: mastersApi.shippingServices,
    description: 'Produk kiriman Pos Indonesia beserta link lacak (Pos Kilat, EMS, dll).',
    columns: [
      { key: 'code', label: 'Kode Layanan', badge: true },
      { key: 'description', label: 'Nama Layanan' },
      { key: 'tracking_url', label: 'URL Pelacakan' },
      { key: 'active', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'code', label: 'Kode Layanan (Maks 10 Karakter)', type: 'text', required: true, createOnly: true },
      { name: 'description', label: 'Nama Layanan', type: 'text', required: true },
      { name: 'tracking_url', label: 'URL Pelacakan (Tracking URL)', type: 'text' },
      { name: 'active', label: 'Status Aktif', type: 'checkbox', default: true },
    ],
  },
  {
    id: 'handlingStatuses',
    label: 'Status Penanganan',
    category: 'Operasional',
    icon: Activity,
    idField: 'status_code',
    searchFields: ['status_code', 'description'],
    api: mastersApi.handlingStatuses,
    description: 'Tahapan penanganan tiket pengaduan (Diterima, Investigasi, dll).',
    columns: [
      { key: 'status_code', label: 'Kode', badge: true },
      { key: 'description', label: 'Keterangan Penanganan' },
      { key: 'active', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'status_code', label: 'Kode Penanganan', type: 'text', required: true, createOnly: true },
      { name: 'description', label: 'Keterangan Penanganan', type: 'text', required: true },
      { name: 'active', label: 'Status Aktif', type: 'checkbox', default: true },
    ],
  },
  {
    id: 'followUpStatuses',
    label: 'Status Follow-Up',
    category: 'Operasional',
    icon: Clock,
    idField: 'code',
    searchFields: ['code', 'description'],
    api: mastersApi.followUpStatuses,
    description: 'Status tindak lanjut SLA tiket internal dan antar kantor.',
    columns: [
      { key: 'code', label: 'Kode', badge: true },
      { key: 'description', label: 'Keterangan Tindak Lanjut' },
    ],
    fields: [
      { name: 'code', label: 'Kode Tindak Lanjut', type: 'text', required: true, createOnly: true },
      { name: 'description', label: 'Keterangan Tindak Lanjut', type: 'text', required: true },
    ],
  },
  {
    id: 'complaintSources',
    label: 'Sumber Aduan',
    category: 'Operasional',
    icon: Tag,
    idField: 'id',
    searchFields: ['id', 'name'],
    api: mastersApi.complaintSources,
    description: 'Kanal masuk pengaduan (Website, Telepon 1500161, Email, Medsos).',
    columns: [
      { key: 'id', label: 'ID', badge: true },
      { key: 'name', label: 'Nama Sumber Kanal' },
      { key: 'active', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'name', label: 'Nama Kanal / Sumber', type: 'text', required: true },
      { name: 'active', label: 'Status Aktif', type: 'checkbox', default: true },
    ],
  },
  {
    id: 'documentTypes',
    label: 'Jenis Dokumen',
    category: 'Operasional',
    icon: Files,
    idField: 'code',
    searchFields: ['code', 'description'],
    api: mastersApi.documentTypes,
    description: 'Lampiran pendukung aduan (KTP, Resi/CN23, Foto Bukti, Surat Tuntutan).',
    columns: [
      { key: 'code', label: 'Kode', badge: true },
      { key: 'description', label: 'Deskripsi Dokumen' },
      { key: 'active', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'code', label: 'Kode Dokumen', type: 'text', required: true, createOnly: true },
      { name: 'description', label: 'Deskripsi Dokumen', type: 'text', required: true },
      { name: 'active', label: 'Status Aktif', type: 'checkbox', default: true },
    ],
  },

  // --- Organisasi & Jadwal ---
  {
    id: 'offices',
    label: 'Master Kantor',
    category: 'Organisasi',
    icon: Building2,
    idField: 'code',
    searchFields: ['code', 'name', 'abbreviation', 'type', 'regional_code'],
    api: mastersApi.offices,
    description: 'Katalog kantor pos, Kprk, Divre, dan Kantor Pusat se-Indonesia (267 kantor).',
    columns: [
      { key: 'code', label: 'Kode Kantor', badge: true },
      { key: 'name', label: 'Nama Kantor' },
      { key: 'abbreviation', label: 'Singkatan' },
      { key: 'type', label: 'Tipe' },
      { key: 'regional_code', label: 'Regional' },
      { key: 'active', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'code', label: 'Kode Kantor (Maks 10)', type: 'text', required: true, createOnly: true },
      { name: 'name', label: 'Nama Kantor', type: 'text', required: true },
      { name: 'abbreviation', label: 'Singkatan Kantor', type: 'text' },
      { name: 'type', label: 'Tipe Kantor (KP, Divre, Kprk, dll)', type: 'text', required: true },
      { name: 'regional_code', label: 'Kode Regional Induk', type: 'text', required: true },
      { name: 'active', label: 'Kantor Aktif', type: 'checkbox', default: true },
      { name: 'as_destination', label: 'Bisa Jadi Tujuan Aduan', type: 'checkbox', default: true },
      { name: 'as_copy', label: 'Bisa Jadi Tembusan Aduan', type: 'checkbox', default: true },
    ],
  },
  {
    id: 'holidayCalendar',
    label: 'Kalender Libur',
    category: 'Organisasi',
    icon: Calendar,
    idField: 'date',
    searchFields: ['date', 'description'],
    api: mastersApi.holidayCalendar,
    description: 'Hari libur nasional untuk penghitungan durasi kerja SLA otomatis.',
    columns: [
      { key: 'date', label: 'Tanggal Libur', badge: true },
      { key: 'description', label: 'Keterangan Libur' },
      { key: 'created_by', label: 'Didaftarkan Oleh' },
    ],
    fields: [
      { name: 'date', label: 'Tanggal Libur (YYYY-MM-DD)', type: 'date', required: true, createOnly: true },
      { name: 'description', label: 'Keterangan Hari Libur', type: 'text', required: true, maxLength: 50 },
    ],
  },
  {
    id: 'timezones',
    label: 'Zona Waktu',
    category: 'Organisasi',
    icon: Globe,
    idField: 'id',
    searchFields: ['id', 'timezone'],
    api: mastersApi.timezones,
    description: 'Daftar zona waktu IANA untuk sistem penanggalan & logging.',
    columns: [
      { key: 'id', label: 'ID', badge: true },
      { key: 'timezone', label: 'Nama Zona Waktu' },
      { key: 'is_default', label: 'Default', type: 'default' },
    ],
    fields: [
      { name: 'timezone', label: 'Nama Zona Waktu (Contoh: Asia/Jakarta)', type: 'text', required: true },
      { name: 'is_default', label: 'Jadikan Default Sistem', type: 'checkbox', default: false },
    ],
  },
  {
    id: 'regionalOffices',
    label: 'Kantor Regional (KP/Divre)',
    category: 'Organisasi',
    icon: MapPin,
    idField: 'office_code',
    searchFields: ['office_code', 'office_name', 'abbreviation', 'regional_code'],
    api: mastersApi.regionalOffices,
    description: 'Kantor Regional (Divre/KP) pembina wilayah kerja Pos Indonesia (cch_regional).',
    columns: [
      { key: 'office_code', label: 'Kode', badge: true },
      { key: 'office_name', label: 'Nama Kantor Regional' },
      { key: 'abbreviation', label: 'Singkatan' },
      { key: 'type', label: 'Tipe' },
      { key: 'regional_code', label: 'Kode Regional' },
      { key: 'active', label: 'Status', type: 'status' },
    ],
    fields: [
      { name: 'office_name', label: 'Nama Kantor Regional', type: 'text', required: true },
      { name: 'abbreviation', label: 'Singkatan Kantor', type: 'text' },
      { name: 'type', label: 'Tipe Kantor (KP, Divre, dll)', type: 'text', required: true },
      { name: 'regional_code', label: 'Kode Regional', type: 'text', required: true },
      { name: 'active', label: 'Status Aktif', type: 'checkbox', default: true },
    ],
    canCreate: false,
    canDelete: false,
  },
  {
    id: 'csOfficers',
    label: 'Roster Petugas CS',
    category: 'Organisasi',
    icon: UserCheck,
    idField: 'username',
    searchFields: ['username', 'full_name', 'office', 'regional', 'email', 'phone', 'status'],
    api: mastersApi.csOfficers,
    description: 'Roster staf & petugas Customer Service seluruh Indonesia (cch_cs_officer).',
    columns: [
      { key: 'username', label: 'NIP / Username', badge: true },
      { key: 'full_name', label: 'Nama Lengkap Petugas' },
      { key: 'regional', label: 'Regional' },
      { key: 'office', label: 'Kantor Pos' },
      { key: 'status', label: 'Status Sesi' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'No. Telepon' },
    ],
    fields: [],
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },

  // --- Sistem & Konten ---
  {
    id: 'helpCategories',
    label: 'Kategori Bantuan',
    category: 'Sistem',
    icon: HelpCircle,
    idField: 'id',
    searchFields: ['id', 'language', 'description'],
    api: mastersApi.helpCategories,
    description: 'Kategori panduan pengguna dan bantuan online cch_help.',
    columns: [
      { key: 'id', label: 'ID', badge: true },
      { key: 'language', label: 'Bahasa' },
      { key: 'description', label: 'Keterangan Kategori' },
    ],
    fields: [
      { name: 'language', label: 'Kode Bahasa (id / en)', type: 'text', required: true },
      { name: 'description', label: 'Keterangan Kategori Bantuan', type: 'text', required: true },
    ],
  },
  {
    id: 'announcements',
    label: 'Pengumuman',
    category: 'Sistem',
    icon: Bell,
    idField: 'id',
    searchFields: ['id', 'topic', 'message', 'language'],
    api: mastersApi.announcements,
    description: 'Banner pengumuman dan siaran informasi internal CCH.',
    columns: [
      { key: 'id', label: 'ID', badge: true },
      { key: 'topic', label: 'Topik' },
      { key: 'language', label: 'Bahasa' },
      { key: 'is_active', label: 'Status', type: 'status' },
      { key: 'auto_publish', label: 'Auto Publish', type: 'boolean' },
    ],
    fields: [
      { name: 'topic', label: 'Topik Pengumuman', type: 'text', required: true },
      { name: 'message', label: 'Isi Pesan Pengumuman', type: 'textarea', required: true },
      { name: 'language', label: 'Kode Bahasa (id / en)', type: 'text', required: true },
      { name: 'is_active', label: 'Aktifkan Sekarang', type: 'checkbox', default: true },
      { name: 'auto_publish', label: 'Publikasi Otomatis (Auto Publish)', type: 'checkbox', default: false },
    ],
  },
  {
    id: 'appSettings',
    label: 'Pengaturan Sistem',
    category: 'Sistem',
    icon: Settings,
    idField: 'option_id',
    searchFields: ['option_id'],
    api: mastersApi.appSettings,
    description: 'Pengaturan global CCH: Maintenance mode, visibilitas pengumuman, dll.',
    columns: [
      { key: 'option_id', label: 'ID Opsi', badge: true },
      { key: 'is_default_option', label: 'Default', type: 'default' },
      { key: 'maintenance_mode', label: 'Maintenance Mode', type: 'boolean' },
      { key: 'show_announcement', label: 'Tampil Pengumuman', type: 'boolean' },
      { key: 'use_announcement_table', label: 'Gunakan Tabel', type: 'boolean' },
    ],
    fields: [
      { name: 'maintenance_mode', label: 'Mode Pemeliharaan (Maintenance Mode)', type: 'checkbox' },
      { name: 'show_announcement', label: 'Tampilkan Pengumuman di Beranda', type: 'checkbox' },
      { name: 'use_announcement_table', label: 'Ambil Pengumuman Dari Tabel', type: 'checkbox' },
      { name: 'auto_normal_after_maintenance', label: 'Otomatis Normal Setelah Maintenance Selesai', type: 'checkbox' },
    ],
    canCreate: false,
    canDelete: false,
  },
  {
    id: 'languages',
    label: 'Katalog Bahasa',
    category: 'Sistem',
    icon: Languages,
    idField: 'language_code',
    searchFields: ['language_code', 'language_name', 'site_title'],
    api: mastersApi.languages,
    description: 'Katalog lokalisasi bahasa, format angka, dan teks legal.',
    columns: [
      { key: 'language_code', label: 'Kode', badge: true },
      { key: 'language_name', label: 'Nama Bahasa' },
      { key: 'site_title', label: 'Judul Situs' },
      { key: 'is_default', label: 'Default', type: 'default' },
    ],
    fields: [
      { name: 'language_code', label: 'Kode Bahasa (2 huruf, misal: id)', type: 'text', required: true, createOnly: true, maxLength: 2 },
      { name: 'language_name', label: 'Nama Bahasa', type: 'text', required: true },
      { name: 'site_title', label: 'Judul Situs', type: 'text', required: true },
      { name: 'site_logo', label: 'Path Logo Situs', type: 'text' },
      { name: 'is_default', label: 'Jadikan Bahasa Default', type: 'checkbox', default: false },
      { name: 'terms_and_condition_text', label: 'Teks Syarat & Ketentuan', type: 'textarea' },
      { name: 'announcement_text', label: 'Teks Pengumuman', type: 'textarea' },
      { name: 'about_text', label: 'Teks Tentang CCH', type: 'textarea' },
    ],
  },
  {
    id: 'breadcrumbs',
    label: 'Breadcrumbs',
    category: 'Sistem',
    icon: Layers,
    idField: 'page_title',
    searchFields: ['page_title', 'page_url'],
    api: mastersApi.breadcrumbs,
    description: 'Pohon navigasi tautan breadcrumbs sistem CCH.',
    columns: [
      { key: 'page_title', label: 'Judul Halaman', badge: true },
      { key: 'page_url', label: 'URL Halaman' },
      { key: 'left', label: 'Posisi Left' },
      { key: 'right', label: 'Posisi Right' },
    ],
    fields: [
      { name: 'page_title', label: 'Judul Halaman (Unik)', type: 'text', required: true, createOnly: true },
      { name: 'page_url', label: 'URL Target', type: 'text', required: true },
    ],
    canEdit: false, // Nested-set in backend uses Move, so add/delete only
  },
]

export function MasterDataStudioPage() {
  const { token } = useContext(AuthContext)

  // Current active master
  const [activeMasterId, setActiveMasterId] = useState('complaintTypes')
  const activeMaster = useMemo(
    () => MASTER_CONFIGS.find((m) => m.id === activeMasterId) || MASTER_CONFIGS[0],
    [activeMasterId],
  )

  // Data & UI states
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [toastMsg, setToastMsg] = useState('')

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deletingItem, setDeletingItem] = useState(null)
  const [formData, setFormData] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Load master items whenever activeMasterId changes
  async function loadData() {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const data = await activeMaster.api.list(token)
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || `Gagal memuat data ${activeMaster.label}`)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setSearch('')
    setDebouncedSearch('')
    setPage(1)
    loadData()
  }, [activeMasterId, token])

  // Filter items client-side
  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return items
    const query = debouncedSearch.toLowerCase().trim()
    return items.filter((item) => {
      return activeMaster.searchFields.some((field) => {
        const val = item[field]
        if (val === undefined || val === null) return false
        return String(val).toLowerCase().includes(query)
      })
    })
  }, [items, debouncedSearch, activeMaster])

  // Pagination slice
  const totalItems = filteredItems.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, page, pageSize])

  // Toast auto-clear
  useEffect(() => {
    if (!toastMsg) return
    const timer = setTimeout(() => setToastMsg(''), 4000)
    return () => clearTimeout(timer)
  }, [toastMsg])

  // Open Create Modal
  function handleOpenCreate() {
    const initial = {}
    activeMaster.fields.forEach((f) => {
      initial[f.name] = f.default !== undefined ? f.default : f.type === 'checkbox' ? false : ''
    })
    setFormData(initial)
    setEditingItem(null)
    setFormError('')
    setIsFormModalOpen(true)
  }

  // Open Edit Modal
  function handleOpenEdit(item) {
    const initial = {}
    activeMaster.fields.forEach((f) => {
      const val = item[f.name]
      if (f.type === 'checkbox') {
        initial[f.name] = Boolean(val)
      } else {
        initial[f.name] = val !== undefined && val !== null ? val : ''
      }
    })
    setFormData(initial)
    setEditingItem(item)
    setFormError('')
    setIsFormModalOpen(true)
  }

  // Submit Form (Create or Update)
  async function handleFormSubmit(e) {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)

    try {
      // Clean and cast formData according to activeMaster fields
      const payload = {}
      for (const field of activeMaster.fields) {
        let val = formData[field.name]
        if (field.type === 'number') {
          val = Number(val)
          if (isNaN(val)) throw new Error(`${field.label} harus berupa angka`)
        } else if (field.type === 'checkbox') {
          val = Boolean(val)
        } else if (typeof val === 'string') {
          val = val.trim()
          if (field.required && !val) {
            throw new Error(`${field.label} wajib diisi`)
          }
        }
        payload[field.name] = val
      }

      if (editingItem) {
        // UPDATE
        const idVal = editingItem[activeMaster.idField]
        if (activeMaster.api.update) {
          await activeMaster.api.update(token, idVal, payload)
        }
        setToastMsg(`Berhasil memperbarui ${activeMaster.label}: ${idVal}`)
      } else {
        // CREATE
        await activeMaster.api.create(token, payload)
        const idVal = payload[activeMaster.idField] || ''
        setToastMsg(`Berhasil menambahkan data ke ${activeMaster.label} ${idVal}`)
      }

      setIsFormModalOpen(false)
      await loadData()
    } catch (err) {
      setFormError(err?.message || 'Gagal menyimpan perubahan')
    } finally {
      setSubmitting(false)
    }
  }

  // Confirm Delete
  async function handleDeleteConfirm() {
    if (!deletingItem) return
    setSubmitting(true)
    const idVal = deletingItem[activeMaster.idField]
    try {
      await activeMaster.api.delete(token, idVal)
      setToastMsg(`Data ${activeMaster.label} (${idVal}) berhasil dihapus / dinonaktifkan`)
      setDeletingItem(null)
      await loadData()
    } catch (err) {
      setToastMsg(`Gagal menghapus: ${err?.message || 'Terjadi kesalahan'}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Group master configs by category for the sidebar / pills
  const categories = useMemo(() => {
    const map = { Operasional: [], Organisasi: [], Sistem: [] }
    MASTER_CONFIGS.forEach((m) => {
      if (map[m.category]) {
        map[m.category].push(m)
      }
    })
    return map
  }, [])

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-slate-900 dark:bg-white px-5 py-3.5 text-white dark:text-slate-900 shadow-2xl transition-all animate-bounce">
          <Sparkles size={18} className="text-yellow-400 dark:text-yellow-600" />
          <p className="text-sm font-semibold">{toastMsg}</p>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20">
              <Database size={20} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Admin Master Data Studio
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola 14 katalog dan tabel referensi operasional CCH Pos Indonesia secara langsung.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-blue-500' : ''} />
            <span>Segarkan</span>
          </Button>

          {activeMaster.canCreate !== false && (
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
            >
              <Plus size={16} />
              <span>Tambah Data</span>
            </Button>
          )}
        </div>
      </div>

      {/* Multi-Tab Selector Pills */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pilih Tabel Master:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(categories).map(([catName, masters]) => (
            <div
              key={catName}
              className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 p-3 shadow-sm backdrop-blur-sm"
            >
              <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {catName}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {masters.map((m) => {
                  const Icon = m.icon
                  const isActive = m.id === activeMasterId
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveMasterId(m.id)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                          : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                      <span>{m.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Master Header & Description Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 border border-blue-100 dark:border-blue-900/40 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
            <activeMaster.icon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{activeMaster.label}</h2>
              <Badge variant="blue" className="text-xs">
                {items.length} Total Data
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{activeMaster.description}</p>
          </div>
        </div>

        {/* Search bar inside header */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder={`Cari dalam ${activeMaster.label}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400 flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table Card */}
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">No</th>
                {activeMaster.columns.map((col) => (
                  <th key={col.key} className="px-4 py-3.5">
                    {col.label}
                  </th>
                ))}
                {(activeMaster.canEdit !== false || activeMaster.canDelete !== false) && (
                  <th className="px-4 py-3.5 text-right w-28">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td
                    colSpan={activeMaster.columns.length + 2}
                    className="py-12 text-center text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw size={24} className="animate-spin text-blue-500" />
                      <p className="text-xs font-semibold">Memuat data dari server...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeMaster.columns.length + 2}
                    className="py-12 text-center text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Database size={28} className="text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        {debouncedSearch ? 'Tidak ada data yang sesuai pencarian' : 'Belum ada data tersedia'}
                      </p>
                      {debouncedSearch && (
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          className="text-xs text-blue-600 hover:underline cursor-pointer"
                        >
                          Bersihkan filter pencarian
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const rowNumber = (page - 1) * pageSize + idx + 1
                  return (
                    <tr
                      key={item[activeMaster.idField] || idx}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-center text-slate-400 font-medium">{rowNumber}</td>
                      {activeMaster.columns.map((col) => {
                        const val = item[col.key]

                        if (col.type === 'status') {
                          const isActive = Boolean(val)
                          return (
                            <td key={col.key} className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                  isActive
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isActive ? 'bg-emerald-500' : 'bg-slate-400'
                                  }`}
                                />
                                {isActive ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                          )
                        }

                        if (col.type === 'default') {
                          const isDef = val === true || val === 'Y'
                          return (
                            <td key={col.key} className="px-4 py-3">
                              {isDef ? (
                                <Badge variant="blue" className="text-[10px]">
                                  Default
                                </Badge>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>
                          )
                        }

                        if (col.type === 'boolean') {
                          return (
                            <td key={col.key} className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                  val
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                                    : 'text-slate-400'
                                }`}
                              >
                                {val ? 'Ya' : 'Tidak'}
                              </span>
                            </td>
                          )
                        }

                        if (col.badge) {
                          return (
                            <td key={col.key} className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                {String(val ?? '-')}
                              </span>
                            </td>
                          )
                        }

                        return (
                          <td key={col.key} className="px-4 py-3 max-w-xs truncate" title={String(val ?? '')}>
                            {val !== undefined && val !== null ? String(val) : '-'}
                          </td>
                        )
                      })}

                      {/* Action buttons */}
                      {(activeMaster.canEdit !== false || activeMaster.canDelete !== false) && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {activeMaster.canEdit !== false && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 transition cursor-pointer"
                                title="Edit Data"
                              >
                                <Edit3 size={15} />
                              </button>
                            )}

                            {activeMaster.canDelete !== false && (
                              <button
                                type="button"
                                onClick={() => setDeletingItem(item)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition cursor-pointer"
                                title="Hapus / Nonaktifkan"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          count={paginatedItems.length}
          total={totalItems}
          perPage={pageSize}
          loading={loading}
          onPage={setPage}
          pageSizeOptions={[10, 25, 50, 100]}
          onPerPageChange={(newSize) => {
            setPageSize(newSize)
            setPage(1)
          }}
          label="data master"
        />
      </Card>

      {/* CREATE / EDIT MODAL DIALOG */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  {editingItem ? <Edit3 size={20} /> : <Plus size={20} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingItem ? `Edit ${activeMaster.label}` : `Tambah ${activeMaster.label}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingItem
                      ? `Kunci: ${editingItem[activeMaster.idField]}`
                      : 'Isi formulir untuk menambahkan data baru.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
              {activeMaster.fields.map((field) => {
                const isFieldDisabled = editingItem && field.createOnly
                const value = formData[field.name]

                if (field.type === 'checkbox') {
                  return (
                    <label
                      key={field.name}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {field.label}
                      </span>
                    </label>
                  )
                }

                if (field.type === 'textarea') {
                  return (
                    <div key={field.name}>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <textarea
                        rows={3}
                        value={value || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Masukkan ${field.label}...`}
                      />
                    </div>
                  )
                }

                return (
                  <div key={field.name}>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                      {isFieldDisabled && <span className="text-slate-400 font-normal"> (Kunci primer tetap)</span>}
                    </label>
                    <input
                      type={field.type || 'text'}
                      disabled={isFieldDisabled}
                      maxLength={field.maxLength}
                      value={value ?? ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:cursor-not-allowed"
                      placeholder={`Masukkan ${field.label}...`}
                    />
                  </div>
                )
              })}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={submitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah Data'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / NONAKTIFKAN CONFIRMATION MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Konfirmasi Hapus / Nonaktifkan
                </h3>
                <p className="text-xs text-slate-500">Tindakan ini akan mempengaruhi data operasional.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              Apakah Anda yakin ingin menghapus / menonaktifkan data{' '}
              <strong className="text-slate-900 dark:text-white font-mono">
                {String(deletingItem[activeMaster.idField])}
              </strong>{' '}
              dari tabel <strong>{activeMaster.label}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeletingItem(null)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {submitting ? 'Memproses...' : 'Ya, Hapus Data'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
