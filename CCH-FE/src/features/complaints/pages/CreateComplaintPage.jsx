import { useState, useEffect, useContext, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'

import {
  Sparkles,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PlusCircle,
  ChevronRight,
  X,
  ArrowLeft,
  ArrowRight,
  Send,
  FileCheck,
} from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import {
  createComplaint,
  fetchComplaintTypes,
  fetchComplaintSources,
  fetchShippingServices,
  fetchOffices,
} from '../api/complaintsApi.js'
import { documentApi } from '../../documents/api/documentApi.js'
import { useComplaintForm } from '../hooks/useComplaintForm.js'
import { StepIndicator } from '../components/create/StepIndicator.jsx'
import { CustomerInfoStep } from '../components/create/CustomerInfoStep.jsx'
import { ComplaintDetailsStep } from '../components/create/ComplaintDetailsStep.jsx'
import { ReviewStep } from '../components/create/ReviewStep.jsx'

const STEPS = [
  { id: 'customer', label: '1. Info Pelanggan & Rute' },
  { id: 'complaint', label: '2. Detail Kiriman & BAP' },
  { id: 'review', label: '3. Konfirmasi & Terbitkan' },
]

// Preset contoh data simulasi cepat
const SAMPLE_PRESETS = [
  {
    name: 'Paket Terlambat (SLA) - Surabaya',
    badge: 'Keterlambatan',
    customerName: 'Budi Santoso',
    customerPhone: '081234567890',
    customerEmail: 'budi.santoso@gmail.com',
    customerAddress: 'Jl. Merdeka No. 45, Surabaya',
    shipmentNumber: 'POS992381273ID',
    originOffice: '40005CC',
    targetOffice: '50000',
    ccOffice: '',
    shipmentOriginOffice: '40005CC',
    shipmentTargetOffice: '50000',
    summary: 'Paket Pos Sameday terlambat sampai, status tertahan di Surabaya',
    description:
      'Kiriman paket penting berisi dokumen tender belum diterima hingga hari ini, padahal estimasi kemarin sore. Mohon segera dicek status fisik di SPP Surabaya.',
    complaintTypeCode: '10',
    complaintSourceCode: '2',
    shipmentTypeCode: '000',
  },
  {
    name: 'Kiriman Rusak / BAP - Bandung',
    badge: 'Kerusakan',
    customerName: 'Siti Rahmawati',
    customerPhone: '085712345678',
    customerEmail: 'siti.rahma@yahoo.com',
    customerAddress: 'Jl. Riau No. 12, Bandung',
    shipmentNumber: 'P2408290039578',
    originOffice: '50000',
    targetOffice: '40000',
    ccOffice: '',
    shipmentOriginOffice: '50000',
    shipmentTargetOffice: '40000',
    summary: 'Kardus pembungkus robek dan isi barang pecah saat serah terima',
    description:
      'Paket kiriman kosmetik diterima penerima dalam kondisi basah dan segel rusak. Penerima menolak menerima dan meminta pembuatan Berita Acara Pemeriksaan (BAP) serta klaim ganti rugi segera.',
    complaintTypeCode: '11',
    complaintSourceCode: '1',
    shipmentTypeCode: '000',
  },
]

/**
 * Main Create Complaint Page - Modern Multi-Step Wizard
 */
export function CreateComplaintPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, token } = useContext(AuthContext)
  const { formData, errors, handleChange, handleBlur, isStepValid, resetForm, setFormData } =
    useComplaintForm()

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatusText, setSubmitStatusText] = useState('')
  const [submitError, setSubmitError] = useState('')

  // Prefill otomatis jika dialihkan dari modul Kiriman Gagal X-Ray atau lainnya
  useEffect(() => {
    if (location.state?.prefill) {
      setFormData((prev) => ({
        ...prev,
        ...location.state.prefill,
      }))
      // Jika dialihkan dengan data kiriman lengkap, otomatis arahkan ke Step 2
      if (location.state.prefill.shipmentNumber) {
        setCurrentStep(2)
      }
    }
  }, [location.state, setFormData])


  // State untuk lampiran file dokumen (cchentridok)
  const [selectedFiles, setSelectedFiles] = useState([])

  // State dropdown preset
  const [showPresetMenu, setShowPresetMenu] = useState(false)
  const presetRef = useRef(null)

  // Click outside to close preset dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (presetRef.current && !presetRef.current.contains(event.target)) {
        setShowPresetMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-default originOffice to logged-in user's office
  useEffect(() => {
    if (user?.office && !formData.originOffice) {
      setFormData((prev) => ({
        ...prev,
        originOffice: prev.originOffice || user.office,
        shipmentOriginOffice: prev.shipmentOriginOffice || prev.originOffice || user.office,
      }))
    }
  }, [user, formData.originOffice, setFormData])

  const handleSelectCustomer = (customer) => {
    if (!customer) return
    setFormData((prev) => ({
      ...prev,
      customerId: customer.id ? String(customer.id) : prev.customerId,
      customerName: customer.name ?? prev.customerName,
      customerEmail: customer.email ?? prev.customerEmail,
      customerPhone: customer.phone ?? prev.customerPhone,
      customerAddress: customer.address ?? prev.customerAddress,
    }))
  }

  const handleApplyPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      customerName: preset.customerName,
      customerPhone: preset.customerPhone,
      customerEmail: preset.customerEmail,
      customerAddress: preset.customerAddress,
      originOffice: preset.originOffice || user?.office || '40005CC',
      targetOffice: preset.targetOffice,
      ccOffice: preset.ccOffice || '',
      complaintTypeCode: preset.complaintTypeCode,
      complaintSourceCode: preset.complaintSourceCode,
      shipmentTypeCode: preset.shipmentTypeCode,
      shipmentNumber: preset.shipmentNumber,
      shipmentOriginOffice: preset.shipmentOriginOffice || preset.originOffice || '40005CC',
      shipmentTargetOffice: preset.shipmentTargetOffice || preset.targetOffice,
      summary: preset.summary,
      description: preset.description,
    }))
    setShowPresetMenu(false)
  }

  // Master data
  const [complaintTypes, setComplaintTypes] = useState([])
  const [complaintSources, setComplaintSources] = useState([])
  const [shippingServices, setShippingServices] = useState([])
  const [offices, setOffices] = useState([])
  const [isLoadingMasters, setIsLoadingMasters] = useState(true)

  // Load master data on mount
  useEffect(() => {
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

        // Transform master data to options format
        setComplaintTypes(
          rawTypes.map((item) => ({
            value: String(item.id ?? item.code ?? ''),
            label: item.description || item.name || item.label || String(item.code || item.id || ''),
          })),
        )
        setComplaintSources(
          rawSources.map((item) => ({
            value: String(item.id ?? item.code ?? ''),
            label: item.description || item.name || item.label || String(item.code || item.id || ''),
          })),
        )
        setShippingServices(
          rawServices.map((item) => ({
            value: String(item.code ?? item.id ?? ''),
            label: item.description || item.name || item.label || String(item.code || item.id || ''),
          })),
        )
        setOffices(rawOffices)
      } catch (error) {
        console.error('Failed to load master data:', error)
      } finally {
        setIsLoadingMasters(false)
      }
    }

    loadMasterData()
  }, [token])

  const handleNext = () => {
    if (isStepValid(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    // Final validation
    if (!isStepValid(1) || !isStepValid(2)) {
      setSubmitError('Terdapat field yang belum lengkap pada form. Silakan periksa kembali.')
      return
    }

    setIsSubmitting(true)
    setSubmitStatusText('Menerbitkan tiket pengaduan ke sistem CCH Pos Indonesia...')
    setSubmitError('')

    try {
      const payload = {
        customerId: formData.customerId ? parseInt(formData.customerId, 10) : 0,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail || '',
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress || '',
        originOffice: formData.originOffice || user?.office || '40005CC',
        targetOffice: formData.targetOffice || formData.shipmentTargetOffice || '',
        ccOffice: formData.ccOffice || '',
        complaintTypeCode: parseInt(formData.complaintTypeCode, 10),
        complaintSourceCode: parseInt(formData.complaintSourceCode, 10),
        shipmentTypeCode: formData.shipmentTypeCode,
        shipmentNumber: formData.shipmentNumber,
        summary: formData.summary,
        description: formData.description,
        shipmentOriginOffice: formData.shipmentOriginOffice || formData.originOffice || '',
        shipmentTargetOffice: formData.shipmentTargetOffice || formData.targetOffice || '',
      }

      const result = await createComplaint(payload, token)
      const createdId = result?.data?.complaintId || result?.complaintId

      if (!createdId) {
        throw new Error('Server tidak mengembalikan ID pengaduan yang dibuat')
      }

      // Sequential document upload if files attached
      if (selectedFiles && selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const item = selectedFiles[i]
          const fileObj = item.file || item
          const docTypeCode = item.documentTypeCode || '002'

          setSubmitStatusText(
            `Mengunggah lampiran dokumen (${i + 1}/${selectedFiles.length}): ${fileObj.name}...`,
          )

          try {
            await documentApi.upload(token, createdId, {
              historyId: '1',
              documentTypeCode: docTypeCode,
              file: fileObj,
            })
          } catch (uploadErr) {
            console.warn(`Gagal mengunggah berkas ${fileObj.name}:`, uploadErr)
            // Non-blocking warning: complaint was successfully created
          }
        }
      }

      // Success redirect
      navigate(`/workspace/complaints/open/${createdId}`, {
        state: {
          successMessage: `Pengaduan #${createdId} berhasil diterbitkan ${
            selectedFiles.length > 0 ? `dengan ${selectedFiles.length} lampiran dokumen!` : '!'
          }`,
        },
      })
    } catch (error) {
      console.error('Submit error:', error)
      setSubmitError(
        error.message || 'Gagal membuat pengaduan. Silakan coba lagi atau hubungi administrator.',
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setIsSubmitting(false)
      setSubmitStatusText('')
    }
  }

  const handleCancel = () => {
    if (window.confirm('Apakah Anda yakin ingin membatalkan? Data yang diisi akan hilang.')) {
      resetForm()
      navigate('/workspace')
    }
  }

  return (
    <div className="create-complaint-page min-h-screen bg-slate-50">
      {/* Modern Top Header with Breadcrumbs & Simulator Preset */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shrink-0 text-white shadow-inner">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  Form Wizard Pengaduan Baru
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/20 text-white font-semibold">
                    Full Mode
                  </span>
                </h1>
                <p className="text-blue-100 text-xs sm:text-sm">
                  Pencatatan keluhan komprehensif dengan lampiran dokumen BAP & integrasi routing kantor pos
                </p>
              </div>
            </div>

            {/* Top Right: Preset Simulator & Breadcrumbs */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              {/* Preset Simulator Button */}
              <div className="relative" ref={presetRef}>
                <button
                  type="button"
                  onClick={() => setShowPresetMenu(!showPresetMenu)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-900" />
                  <span>✨ Isi Contoh Data</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                </button>

                {showPresetMenu && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2">
                    <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Pilih Skenario Pengaduan CCH:
                    </div>
                    {SAMPLE_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className="w-full text-left p-2.5 hover:bg-blue-50/80 rounded-lg transition group cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                            {p.name}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                            {p.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 truncate">
                          {p.summary}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Breadcrumb Nav */}
              <div className="hidden md:flex items-center gap-2 text-xs text-blue-100/80">
                <Link to="/workspace" className="hover:text-white transition">
                  Dashboard
                </Link>
                <ChevronRight className="w-3 h-3 text-blue-300" />
                <span className="text-white font-medium">Wizard Pengaduan</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden">
            <div className="p-4 sm:p-6 md:p-8">
              {/* Step Progress Indicator */}
              <StepIndicator currentStep={currentStep} steps={STEPS} />

              {/* Error Alert */}
              {submitError && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-r-lg p-3 sm:p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h5 className="text-red-900 font-bold text-xs sm:text-sm mb-1">
                      Terjadi Kesalahan
                    </h5>
                    <p className="text-red-700 text-xs sm:text-sm">{submitError}</p>
                  </div>
                  <button
                    type="button"
                    className="text-red-400 hover:text-red-600 transition p-1 cursor-pointer"
                    onClick={() => setSubmitError('')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Step Content */}
              <div className="step-content mt-4 sm:mt-6">
                {currentStep === 1 && (
                  <CustomerInfoStep
                    formData={formData}
                    errors={errors}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onSelectCustomer={handleSelectCustomer}
                    offices={offices}
                  />
                )}

                {currentStep === 2 && (
                  <ComplaintDetailsStep
                    formData={formData}
                    errors={errors}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    complaintTypes={complaintTypes}
                    complaintSources={complaintSources}
                    shippingServices={shippingServices}
                    offices={offices}
                    isLoadingMasters={isLoadingMasters}
                    selectedFiles={selectedFiles}
                    onFilesChange={setSelectedFiles}
                  />
                )}

                {currentStep === 3 && (
                  <ReviewStep
                    formData={formData}
                    complaintTypes={complaintTypes}
                    complaintSources={complaintSources}
                    shippingServices={shippingServices}
                    offices={offices}
                    selectedFiles={selectedFiles}
                  />
                )}
              </div>

              {/* Navigation Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-200">
                <button
                  type="button"
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4" />
                  Batal
                </button>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      className="px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                      onClick={handlePrevious}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Sebelumnya
                    </button>
                  )}

                  {currentStep < STEPS.length && (
                    <button
                      type="button"
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 text-xs sm:text-sm min-h-[42px] cursor-pointer"
                      onClick={handleNext}
                      disabled={isSubmitting}
                    >
                      <span>Langkah Selanjutnya</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {currentStep === STEPS.length && (
                    <button
                      type="button"
                      className="px-7 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-semibold transition-all shadow-md shadow-green-500/20 flex items-center justify-center gap-2 text-xs sm:text-sm min-h-[42px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{submitStatusText || 'Menerbitkan Tiket...'}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Terbitkan Tiket CCH</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
