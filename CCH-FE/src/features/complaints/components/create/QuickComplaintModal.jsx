import { useState, useContext, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Barcode,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  FilePlus,
  FileText,
  Loader2,
  Package,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { AuthContext } from '../../../auth/auth-context.js'
import { virtualCsApi } from '../../../ai/api/virtualCsApi.js'

import {
  createComplaint,
  fetchComplaintTypes,
  fetchComplaintSources,
  fetchShippingServices,
  fetchOffices,
} from '../../api/complaintsApi.js'

// Kantor pos tujuan favorit/hub utama Pos Indonesia untuk quick-select
const POPULAR_OFFICES = [
  { code: '50000', label: 'SPP Surabaya (50000)' },
  { code: '40000', label: 'Kprk Bandung (40000)' },
  { code: '10000', label: 'Jakarta Pusat (10000)' },
  { code: '20000', label: 'Medan (20000)' },
  { code: '90000', label: 'Makassar (90000)' },
  { code: '40005CC', label: 'Call Center (40005CC)' },
]

// Preset contoh data untuk pengujian & simulasi kilat
const SAMPLE_PRESETS = [
  {
    name: 'Paket Terlambat (SLA) - Surabaya',
    customerName: 'Budi Santoso',
    customerPhone: '081234567890',
    customerEmail: 'budi.santoso@gmail.com',
    customerAddress: 'Jl. Merdeka No. 45, Surabaya',
    shipmentNumber: 'POS992381273ID',
    originOffice: '40005CC',
    targetOffice: '50000',
    summary: 'Paket Pos Sameday terlambat sampai, status tertahan di Surabaya',
    description:
      'Kiriman paket penting berisi dokumen tender belum diterima hingga hari ini, padahal estimasi kemarin sore. Mohon segera dicek status fisik di SPP Surabaya.',
    categoryCode: '10',
    sourceCode: '2',
    serviceCode: '000',
  },
  {
    name: 'Kiriman Rusak / Pecah - Bandung',
    customerName: 'Siti Rahmawati',
    customerPhone: '085712345678',
    customerEmail: 'siti.rahma@yahoo.com',
    customerAddress: 'Jl. Riau No. 12, Bandung',
    shipmentNumber: 'P2408290039578',
    originOffice: '50000',
    targetOffice: '40000',
    summary: 'Kardus pembungkus robek dan isi barang pecah saat serah terima',
    description:
      'Paket kiriman kosmetik diterima penerima dalam kondisi basah dan segel rusak. Penerima menolak menerima dan meminta klaim ganti rugi segera.',
    categoryCode: '11',
    sourceCode: '1',
    serviceCode: '210',
  },
]

/**
 * Quick Complaint Modal - Desain Sempurna, Presisi, 100% Sinkron dengan CCH-BE & Master Database
 * Dilengkapi dropdown kantor pos lengkap, quick-hub chips, live character counters, dan sticky header/footer.
 */
export function QuickComplaintModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { token, user } = useContext(AuthContext)

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    complaintTypeCode: '10',
    complaintSourceCode: '2',
    shipmentTypeCode: '000',
    shipmentNumber: '',
    shipmentOriginOffice: user?.office || '40005CC',
    shipmentTargetOffice: '50000',
    summary: '',
    description: '',
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showPresetMenu, setShowPresetMenu] = useState(false)
  const [aiClassifying, setAiClassifying] = useState(false)
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null)

  async function handleAiAutoClassify() {
    const rawText = (formData.description || formData.summary).trim()
    if (!rawText) {
      setSubmitError('Ketik atau tempel narasi keluhan pada kolom uraian terlebih dahulu untuk dianalisis oleh CS Virtual AI.')
      return
    }

    setAiClassifying(true)
    setSubmitError('')
    try {
      const res = await virtualCsApi.copilotClassify(rawText)
      setAiAnalysisResult(res)

      setFormData((prev) => ({
        ...prev,
        shipmentNumber: res.shipment_number || prev.shipmentNumber,
        summary: prev.summary || res.summary || '',
        customerName: prev.customerName || (res.customer_name ? res.customer_name : prev.customerName),
        customerPhone: prev.customerPhone || (res.customer_phone ? res.customer_phone : prev.customerPhone),
        shipmentTargetOffice: res.destination_office_hint?.slice(0, 5) || prev.shipmentTargetOffice,
        complaintTypeCode: res.complaint_type_code ? String(res.complaint_type_code) : prev.complaintTypeCode,
      }))
    } catch (err) {
      setSubmitError(`CS Virtual gagal menganalisis: ${err.message}`)
    } finally {
      setAiClassifying(false)
    }
  }


  // Master data state
  const [complaintTypes, setComplaintTypes] = useState([])
  const [complaintSources, setComplaintSources] = useState([])
  const [shippingServices, setShippingServices] = useState([])
  const [offices, setOffices] = useState([])
  const [isLoadingMasters, setIsLoadingMasters] = useState(true)

  // Default Kantor Asal ke kantor user login saat modal dibuka
  useEffect(() => {
    if (isOpen && user?.office) {
      setFormData((prev) => ({
        ...prev,
        shipmentOriginOffice: prev.shipmentOriginOffice || user.office,
      }))
    }
  }, [isOpen, user])

  // Tutup dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  // Load master data dengan ekstraksi universal array murni vs { data: [...] }
  useEffect(() => {
    if (!isOpen) return

    async function loadMasterData() {
      try {
        setIsLoadingMasters(true)
        const [typesData, sourcesData, servicesData, officesData] = await Promise.all([
          fetchComplaintTypes(token).catch(() => []),
          fetchComplaintSources(token).catch(() => []),
          fetchShippingServices(token).catch(() => []),
          fetchOffices(token).catch(() => []),
        ])

        const extractList = (res) => {
          if (Array.isArray(res)) return res
          if (Array.isArray(res?.data)) return res.data
          return []
        }

        const rawTypes = extractList(typesData)
        const rawSources = extractList(sourcesData)
        const rawServices = extractList(servicesData)
        const rawOffices = extractList(officesData)

        // Format jenis pengaduan (cch_jenis_pengaduan: Kode_Jenis, Deskripsi)
        const formattedTypes = rawTypes.map((item) => ({
          value: String(item.code ?? item.id ?? item.Kode_Jenis ?? ''),
          label: `${item.code ?? item.id ?? item.Kode_Jenis} - ${item.description || item.name || item.Deskripsi || ''}`,
        }))

        // Format sumber pengaduan (cch_sumber_pengaduan: ID, Sumber)
        const formattedSources = rawSources.map((item) => ({
          value: String(item.id ?? item.code ?? item.ID ?? ''),
          label: item.name || item.description || item.Sumber || String(item.id ?? item.code ?? ''),
        }))

        // Format jenis layanan kiriman (cch_jenis_layanan: Kode_Layanan, Deskripsi)
        const formattedServices = rawServices.map((item) => {
          const code = String(item.code ?? item.id ?? item.Kode_Layanan ?? '')
          const desc = item.description || item.name || item.Deskripsi || code
          return {
            value: code,
            label: `${code} - ${desc}`,
          }
        })

        // Format kantor pos (cch_kantor: Kode_Kantor, Nama_Kantor)
        const formattedOffices = rawOffices.map((item) => {
          const code = String(item.code ?? item.nopend ?? item.Kode_Kantor ?? '')
          const name = item.name || item.nama || item.Nama_Kantor || code
          return {
            code,
            name,
            label: `${code} - ${name}`,
          }
        })

        setComplaintTypes(formattedTypes)
        setComplaintSources(formattedSources)
        setShippingServices(formattedServices)
        setOffices(formattedOffices)

        // Set default values jika belum terpilih
        setFormData((prev) => ({
          ...prev,
          complaintTypeCode: prev.complaintTypeCode || (formattedTypes[0]?.value ?? '10'),
          complaintSourceCode: prev.complaintSourceCode || (formattedSources[0]?.value ?? '2'),
          shipmentTypeCode: prev.shipmentTypeCode || (formattedServices[0]?.value ?? '000'),
          shipmentOriginOffice: prev.shipmentOriginOffice || user?.office || '40005CC',
          shipmentTargetOffice: prev.shipmentTargetOffice || '50000',
        }))
      } catch (error) {
        console.error('Failed to load master data in QuickComplaintModal:', error)
      } finally {
        setIsLoadingMasters(false)
      }
    }

    loadMasterData()
  }, [token, isOpen, user])

  const handleChange = (e) => {
    const { name, value } = e.target
    // Otomatis ubah nomor resi ke huruf besar
    const cleanValue = name === 'shipmentNumber' ? value.toUpperCase() : value

    setFormData((prev) => ({ ...prev, [name]: cleanValue }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  // Isi data simulasi / contoh cepat (Ergonomis untuk testing)
  const applySamplePreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      customerName: preset.customerName,
      customerPhone: preset.customerPhone,
      customerEmail: preset.customerEmail,
      customerAddress: preset.customerAddress,
      shipmentNumber: preset.shipmentNumber,
      shipmentOriginOffice: preset.originOffice || prev.shipmentOriginOffice,
      shipmentTargetOffice: preset.targetOffice || prev.shipmentTargetOffice,
      summary: preset.summary,
      description: preset.description,
      complaintTypeCode: preset.categoryCode || prev.complaintTypeCode,
      complaintSourceCode: preset.sourceCode || prev.complaintSourceCode,
      shipmentTypeCode: preset.serviceCode || prev.shipmentTypeCode,
    }))
    setErrors({})
    setSubmitError('')
    setShowPresetMenu(false)
  }

  const handleResetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      complaintTypeCode: complaintTypes[0]?.value ?? '10',
      complaintSourceCode: complaintSources[0]?.value ?? '2',
      shipmentTypeCode: shippingServices[0]?.value ?? '000',
      shipmentNumber: '',
      shipmentOriginOffice: user?.office || '40005CC',
      shipmentTargetOffice: '50000',
      summary: '',
      description: '',
    })
    setErrors({})
    setSubmitError('')
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Nama pelanggan wajib diisi'
    }
    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = 'Nomor HP / telepon wajib diisi'
    }
    if (!formData.shipmentNumber.trim()) {
      newErrors.shipmentNumber = 'Nomor resi / barcode kiriman wajib diisi'
    }
    if (!formData.complaintTypeCode) {
      newErrors.complaintTypeCode = 'Pilih jenis pengaduan'
    }
    if (!formData.complaintSourceCode) {
      newErrors.complaintSourceCode = 'Pilih sumber saluran'
    }
    if (!formData.shipmentTypeCode) {
      newErrors.shipmentTypeCode = 'Pilih jenis layanan kiriman'
    }
    if (!formData.summary.trim() || formData.summary.trim().length < 10) {
      newErrors.summary = `Ringkasan minimal 10 karakter (${formData.summary.trim().length}/10)`
    }
    if (!formData.description.trim() || formData.description.trim().length < 20) {
      newErrors.description = `Uraian minimal 20 karakter (${formData.description.trim().length}/20)`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()

    if (!validateForm()) {
      setSubmitError('Mohon lengkapi semua isian wajib (*) dan penuhi panjang minimal sebelum menyimpan.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const originOffice = (formData.shipmentOriginOffice || user?.office || '40005').trim()
      const targetOffice = (formData.shipmentTargetOffice || '50000').trim()

      const payload = {
        customerName: formData.customerName.trim(),
        customerEmail: (formData.customerEmail || '').trim(),
        customerPhone: formData.customerPhone.trim(),
        customerAddress: (formData.customerAddress || '').trim(),
        complaintTypeCode: parseInt(formData.complaintTypeCode, 10),
        complaintSourceCode: parseInt(formData.complaintSourceCode, 10),
        shipmentTypeCode: formData.shipmentTypeCode,
        shipmentNumber: formData.shipmentNumber.trim().toUpperCase(),
        summary: formData.summary.trim(),
        description: formData.description.trim(),
        shipmentOriginOffice: originOffice,
        shipmentTargetOffice: targetOffice,
        originOffice: originOffice,
        targetOffice: targetOffice,
      }

      const result = await createComplaint(payload, token)

      if (result?.data?.complaintId) {
        onClose()
        navigate(`/workspace/complaints/open/${result.data.complaintId}`, {
          state: { successMessage: `Pengaduan resmi No. ${result.data.complaintId} berhasil diterbitkan!` },
        })
      } else {
        throw new Error(result?.message || 'Gagal menerbitkan tiket pengaduan')
      }
    } catch (error) {
      console.error('Submit error:', error)
      setSubmitError(error.message || 'Gagal membuat pengaduan. Silakan periksa kembali data Anda.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFullWizard = () => {
    onClose()
    navigate('/workspace/complaints/create')
  }

  if (!isOpen) return null

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const summaryLength = formData.summary.trim().length
  const descLength = formData.description.trim().length

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* 
        Container Utama: max-h-[92vh] flex-col dengan Sticky Header & Footer
        Memastikan Header dan Footer SELALU TERLIHAT di layar laptop/desktop mana pun!
      */}
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl text-slate-800 dark:text-slate-100 transition-colors overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ======================================================== */}
        {/* 1. STICKY HEADER - Selalu Terlihat di Atas                  */}
        {/* ======================================================== */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-slate-900/90 z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs">
              <FilePlus className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-wider uppercase">
                  Buat Pengaduan Baru
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 text-[11px] font-semibold">
                  Quick Entry
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pencatatan cepat tiket aduan pelanggan ke sistem CCH Pos Indonesia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol Fleksibel: Preset Data Cepat / Simulator */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPresetMenu(!showPresetMenu)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition cursor-pointer"
                title="Isi contoh data untuk pengujian cepat"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">Isi Contoh Data</span>
              </button>

              {showPresetMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 p-2 shadow-xl z-20 text-xs">
                  <div className="font-semibold text-slate-500 px-2 py-1 uppercase text-[10px] tracking-wider">
                    Pilih Skenario Contoh:
                  </div>
                  {SAMPLE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applySamplePreset(preset)}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition flex flex-col gap-0.5"
                    >
                      <span className="font-semibold text-slate-800 dark:text-white">{preset.name}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {preset.customerName} • {preset.shipmentNumber}
                      </span>
                    </button>
                  ))}
                  <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1.5 font-medium"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Kosongkan Formulir
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tombol Tutup Silang */}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
              title="Tutup (ESC)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. SCROLLABLE BODY - Hanya Bagian Ini yang Scroll       */}
        {/* ======================================================== */}
        <form onSubmit={handleSubmit} id="quick-complaint-form" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-800/60 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Status Awal:</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="h-3.5 w-3.5" />
                101 - ENTRI (TIKET DIBUKA)
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Tanggal Entri: <span className="font-semibold text-slate-800 dark:text-white">{todayFormatted}</span>
            </div>
          </div>

          {/* Error Alert jika ada kendala validasi / submit */}
          {submitError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1">
                <strong className="font-semibold">Perhatian:</strong> {submitError}
              </div>
            </div>
          )}

          {/* CARD 1: RUTE KANTOR POS DENGAN DROPDOWN LENGKAP & QUICK PILLS (SAMA PERSIS DENGAN EDIT MODAL) */}
          <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center justify-between">
              <span>Rute Pengiriman & Disposisi Kantor Pos</span>
              <span className="text-[11px] font-normal text-slate-400 normal-case hidden sm:inline">
                Pilih atau klik kantor pos pemroses tanpa harus mengetik manual
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              {/* Origin Office */}
              <div className="rounded-lg bg-white dark:bg-slate-800/80 p-3 border border-slate-200 dark:border-white/5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Kantor Asal Kiriman</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                    {formData.shipmentOriginOffice}
                  </span>
                </div>
                <div className="mt-1">
                  <select
                    name="shipmentOriginOffice"
                    value={formData.shipmentOriginOffice}
                    onChange={handleChange}
                    className="w-full rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  >
                    {offices.length > 0 ? (
                      offices.map((o) => (
                        <option key={`origin-${o.code}`} value={o.code}>
                          {o.label}
                        </option>
                      ))
                    ) : (
                      <option value={formData.shipmentOriginOffice}>{formData.shipmentOriginOffice}</option>
                    )}
                  </select>
                </div>

                {/* Quick Hub Chips for Origin */}
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block mb-1">Pilih Cepat Asal:</span>
                  <div className="flex flex-wrap gap-1">
                    {POPULAR_OFFICES.slice(0, 4).map((hub) => (
                      <button
                        key={`quick-origin-${hub.code}`}
                        type="button"
                        onClick={() => handleChange({ target: { name: 'shipmentOriginOffice', value: hub.code } })}
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium border transition cursor-pointer ${
                          formData.shipmentOriginOffice === hub.code
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-amber-400 hover:text-amber-600'
                        }`}
                      >
                        {hub.code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Destination Office */}
              <div className="rounded-lg bg-white dark:bg-slate-800/80 p-3 border border-blue-500/30 dark:border-blue-500/20 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-semibold">
                    Kantor Tujuan Kiriman / Investigasi *
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">
                    {formData.shipmentTargetOffice}
                  </span>
                </div>
                <div className="mt-1">
                  <select
                    name="shipmentTargetOffice"
                    value={formData.shipmentTargetOffice}
                    onChange={handleChange}
                    className="w-full rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  >
                    {offices.length > 0 ? (
                      offices.map((o) => (
                        <option key={`target-${o.code}`} value={o.code}>
                          {o.label}
                        </option>
                      ))
                    ) : (
                      <option value={formData.shipmentTargetOffice}>{formData.shipmentTargetOffice}</option>
                    )}
                  </select>
                </div>

                {/* Quick Hub Chips for Target */}
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block mb-1">Pilih Cepat Tujuan:</span>
                  <div className="flex flex-wrap gap-1">
                    {POPULAR_OFFICES.map((hub) => (
                      <button
                        key={`quick-target-${hub.code}`}
                        type="button"
                        onClick={() => handleChange({ target: { name: 'shipmentTargetOffice', value: hub.code } })}
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium border transition cursor-pointer ${
                          formData.shipmentTargetOffice === hub.code
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {hub.code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GRID 2 KOLOM: INFORMASI PELANGGAN & DETAIL KIRIMAN POS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kolom Kiri: Informasi Pelanggan */}
            <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-blue-500" />
                Informasi Pelanggan
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Nama Lengkap Pelanggan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder="Ketik nama lengkap pelanggan..."
                  maxLength={100}
                  className={`w-full rounded-lg bg-white dark:bg-slate-800/80 border px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${
                    errors.customerName ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 dark:border-white/10'
                  }`}
                />
                {errors.customerName && <p className="mt-1 text-[11px] text-rose-500">{errors.customerName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                    No. HP / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleChange}
                    placeholder="0812xxxxxxxx"
                    maxLength={18}
                    className={`w-full rounded-lg bg-white dark:bg-slate-800/80 border px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${
                      errors.customerPhone ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 dark:border-white/10'
                    }`}
                  />
                  {errors.customerPhone && <p className="mt-1 text-[11px] text-rose-500">{errors.customerPhone}</p>}
                </div>

                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                    Alamat Email (Opsional)
                  </label>
                  <input
                    type="email"
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleChange}
                    placeholder="nama@email.com"
                    maxLength={100}
                    className="w-full rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Alamat Lengkap Domisili
                </label>
                <textarea
                  name="customerAddress"
                  value={formData.customerAddress}
                  onChange={handleChange}
                  placeholder="Alamat domisili/korespondensi pelanggan..."
                  rows={2}
                  maxLength={250}
                  className="w-full rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition resize-none"
                />
              </div>
            </div>

            {/* Kolom Kanan: Klasifikasi & Detail Kiriman Pos (DROPDOWN LENGKAP 100% SINKRON!) */}
            <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-amber-500" />
                Klasifikasi & Detail Kiriman
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Nomor Kiriman / Resi <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Otomatis Huruf Besar</span>
                </div>
                <input
                  type="text"
                  name="shipmentNumber"
                  value={formData.shipmentNumber}
                  onChange={handleChange}
                  placeholder="Cth: POS992381273ID atau P24..."
                  maxLength={40}
                  className={`w-full rounded-lg bg-white dark:bg-slate-800/80 border px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${
                    errors.shipmentNumber ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 dark:border-white/10'
                  }`}
                />
                {errors.shipmentNumber && <p className="mt-1 text-[11px] text-rose-500">{errors.shipmentNumber}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                    Layanan Kiriman <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="shipmentTypeCode"
                    value={formData.shipmentTypeCode}
                    onChange={handleChange}
                    disabled={isLoadingMasters}
                    className="w-full rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  >
                    {shippingServices.length > 0 ? (
                      shippingServices.map((s) => (
                        <option key={`service-${s.value}`} value={s.value}>
                          {s.label}
                        </option>
                      ))
                    ) : (
                      <option value="000">000 - LAIN-LAIN</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                    Sumber Saluran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="complaintSourceCode"
                    value={formData.complaintSourceCode}
                    onChange={handleChange}
                    disabled={isLoadingMasters}
                    className="w-full rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  >
                    {complaintSources.length > 0 ? (
                      complaintSources.map((s) => (
                        <option key={`source-${s.value}`} value={s.value}>
                          {s.label}
                        </option>
                      ))
                    ) : (
                      <option value="2">Voice Call</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Jenis / Kategori Pengaduan <span className="text-rose-500">*</span>
                </label>
                <select
                  name="complaintTypeCode"
                  value={formData.complaintTypeCode}
                  onChange={handleChange}
                  disabled={isLoadingMasters}
                  className="w-full rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                >
                  {complaintTypes.length > 0 ? (
                    complaintTypes.map((t) => (
                      <option key={`type-${t.value}`} value={t.value}>
                        {t.label}
                      </option>
                    ))
                  ) : (
                    <option value="10">10 - KETERLAMBATAN</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* CARD 3: KRONOLOGI & URAIAN MASALAH (DENGAN LIVE CHARACTER COUNTER) */}
          <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-500" />
                Kronologi & Uraian Keluhan Pelanggan
              </div>
              <button
                type="button"
                onClick={handleAiAutoClassify}
                disabled={aiClassifying}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition cursor-pointer"
                title="Ekstrak resi, rute, dan klasifikasi keluhan secara cerdas dengan CS Virtual AI"
              >
                {aiClassifying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-purple-600" />
                )}
                <span>Auto-Klasifikasi AI</span>
              </button>
            </div>


            {/* Ringkasan */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Ringkasan / Pokok Masalah <span className="text-rose-500">*</span>
                </label>
                <span
                  className={`text-[11px] font-mono font-medium ${
                    summaryLength >= 10 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {summaryLength}/10 min {summaryLength >= 10 && '✓'}
                </span>
              </div>
              <input
                type="text"
                name="summary"
                value={formData.summary}
                onChange={handleChange}
                placeholder="Cth: Paket kiriman obat urgent tertahan di SPP Surabaya dari kemarin"
                maxLength={200}
                className={`w-full rounded-lg bg-white dark:bg-slate-800/80 border px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${
                  errors.summary ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 dark:border-white/10'
                }`}
              />
              {errors.summary ? (
                <p className="mt-1 text-[11px] text-rose-500 font-medium">{errors.summary}</p>
              ) : (
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Tuliskan judul masalah secara padat dan jelas (min. 10 karakter).
                </p>
              )}
            </div>

            {/* Uraian Lengkap */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Uraian Kronologi Lengkap <span className="text-rose-500">*</span>
                </label>
                <span
                  className={`text-[11px] font-mono font-medium ${
                    descLength >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {descLength}/20 min {descLength >= 20 && '✓'}
                </span>
              </div>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Ceritakan kronologi lengkap, keluhan yang dirasakan pelanggan, serta harapan tindak lanjut..."
                rows={3}
                maxLength={3000}
                className={`w-full rounded-lg bg-white dark:bg-slate-800/80 border px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition resize-none ${
                  errors.description ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 dark:border-white/10'
                }`}
              />
              {errors.description ? (
                <p className="mt-1 text-[11px] text-rose-500 font-medium">{errors.description}</p>
              ) : (
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Minimal 20 karakter untuk memastikan informasi keluhan dapat ditindaklanjuti dengan baik.
                </p>
              )}

              {aiAnalysisResult && (
                <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50/80 p-3 text-xs dark:border-purple-900/50 dark:bg-purple-950/30 text-slate-800 dark:text-slate-200 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                      <Sparkles size={14} /> Analisis Triase CS Virtual AI
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                        aiAnalysisResult.urgency_level === 'P1_KRITIS'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : aiAnalysisResult.urgency_level === 'P2_TINGGI'
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {aiAnalysisResult.urgency_level}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {aiAnalysisResult.rationale}
                  </p>
                  {aiAnalysisResult.shipment_number && (
                    <div className="text-[11px] font-mono text-purple-900 dark:text-purple-200">
                      Resi Terdeteksi: <strong>{aiAnalysisResult.shipment_number}</strong>
                      {aiAnalysisResult.origin_office_hint && ` (Asal: ${aiAnalysisResult.origin_office_hint})`}
                      {aiAnalysisResult.destination_office_hint && ` (Tujuan: ${aiAnalysisResult.destination_office_hint})`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>


          {/* AUDIT TRAIL & LINK FORM LENGKAP */}
          <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/30 p-3 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              Petugas Entri:{' '}
              <span className="text-slate-700 dark:text-slate-200 font-medium">
                {user?.nama_lengkap || user?.username || 'Petugas'}
              </span>
              <span className="text-slate-400 ml-1">({user?.office || '40005CC'})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Butuh unggah lampiran dokumen BAP?</span>
              <button
                type="button"
                onClick={handleFullWizard}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                Buka Form Wizard Lengkap <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </form>

        {/* ======================================================== */}
        {/* 3. STICKY FOOTER - Selalu Terlihat di Bawah               */}
        {/* ======================================================== */}
        <div className="shrink-0 px-6 py-3.5 border-t border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-slate-800/80 flex items-center justify-between gap-3 z-10">
          <div className="text-[11px] text-slate-400 hidden sm:block">
            {isLoadingMasters ? 'Memuat master data...' : 'Otomatis tersinkronisasi ke CCH-BE & status 101 ENTRI'}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 dark:border-white/10 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              form="quick-complaint-form"
              disabled={isSubmitting || isLoadingMasters}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menerbitkan Tiket...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Terbitkan Tiket CCH
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
