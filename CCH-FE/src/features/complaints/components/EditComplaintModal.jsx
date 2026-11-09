import { useContext, useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  FileEdit,
  Loader2,
  Package,
  RotateCcw,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { complaintApi } from '../api/complaintApi.js'
import {
  fetchComplaintTypes,
  fetchComplaintSources,
  fetchShippingServices,
  fetchOffices,
} from '../api/complaintsApi.js'

// Kantor pos tujuan favorit/hub utama Pos Indonesia untuk quick-select
const POPULAR_OFFICES = [
  { code: '50000', label: 'SPP Surabaya (50000)' },
  { code: '40000', label: 'Kprk Bandung (40000)' },
  { code: '10000', label: 'Jakarta Pusat (10000)' },
  { code: '20000', label: 'Medan (20000)' },
  { code: '90000', label: 'Makassar (90000)' },
  { code: '40005CC', label: 'Call Center (40005CC)' },
]

function EditComplaintForm({ detail, onClose, onUpdated }) {
  const { token, user } = useContext(AuthContext)

  const [formData, setFormData] = useState({
    customerName: detail.customer_name || '',
    customerEmail: detail.customer_email || '',
    customerPhone: detail.customer_phone || '',
    customerAddress: detail.customer_address || '',
    complaintTypeCode: String(detail.complaint_type_code ?? '10'),
    complaintSourceCode: String(detail.complaint_source_code ?? '2'),
    shipmentTypeCode: String(detail.shipment_type_code || '000'),
    shipmentNumber: detail.shipment_number || '',
    shipmentOriginOffice: detail.shipment_origin_office_code || detail.origin_office_code || '50000',
    shipmentTargetOffice: detail.shipment_target_office_code || detail.destination_office_code || '40005',
    summary: detail.summary || '',
    description: detail.description || '',
  })

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Master data
  const [complaintTypes, setComplaintTypes] = useState([])
  const [complaintSources, setComplaintSources] = useState([])
  const [shippingServices, setShippingServices] = useState([])
  const [offices, setOffices] = useState([])
  const [loadingMasters, setLoadingMasters] = useState(true)

  // Filter office search
  const [originSearch, setOriginSearch] = useState('')
  const [targetSearch, setTargetSearch] = useState('')

  // Sinkronkan form saat detail berubah
  useEffect(() => {
    if (detail) {
      setFormData({
        customerName: detail.customer_name || '',
        customerEmail: detail.customer_email || '',
        customerPhone: detail.customer_phone || '',
        customerAddress: detail.customer_address || '',
        complaintTypeCode: String(detail.complaint_type_code ?? '10'),
        complaintSourceCode: String(detail.complaint_source_code ?? '2'),
        shipmentTypeCode: String(detail.shipment_type_code || '000'),
        shipmentNumber: detail.shipment_number || '',
        shipmentOriginOffice: detail.shipment_origin_office_code || detail.origin_office_code || '50000',
        shipmentTargetOffice: detail.shipment_target_office_code || detail.destination_office_code || '40005',
        summary: detail.summary || '',
        description: detail.description || '',
      })
    }
  }, [detail])

  // Load masters on mount - ekstraksi aman untuk array langsung atau wrapper { data: [...] }
  useEffect(() => {
    if (!token) return
    let active = true

    async function loadMasters() {
      try {
        setLoadingMasters(true)
        const [typesRes, sourcesRes, servicesRes, officesRes] = await Promise.all([
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

        const rawTypes = extractList(typesRes)
        const rawSources = extractList(sourcesRes)
        const rawServices = extractList(servicesRes)
        const rawOffices = extractList(officesRes)

        if (active) {
          // Format jenis pengaduan (cch_jenis_pengaduan: Kode_Jenis, Deskripsi)
          const formattedTypes = rawTypes.map((item) => ({
            value: String(item.code ?? item.id ?? item.Kode_Jenis ?? ''),
            label: item.description || item.name || item.Deskripsi || String(item.code || item.id || ''),
          }))

          // Format sumber pengaduan (cch_sumber_pengaduan: ID, Sumber)
          const formattedSources = rawSources.map((item) => ({
            value: String(item.id ?? item.code ?? item.ID ?? ''),
            label: item.name || item.description || item.Sumber || String(item.id || item.code || ''),
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

          // Pastikan current value dari tiket tetap ada dalam list agar dropdown tidak blank
          const currentTypeCode = String(detail?.complaint_type_code ?? '')
          if (currentTypeCode && !formattedTypes.some((t) => t.value === currentTypeCode)) {
            formattedTypes.unshift({
              value: currentTypeCode,
              label: `[Kode ${currentTypeCode}] ${detail?.complaint_type_description || 'Pengaduan Sebelumnya'}`,
            })
          }

          const currentSourceCode = String(detail?.complaint_source_code ?? '')
          if (currentSourceCode && !formattedSources.some((s) => s.value === currentSourceCode)) {
            formattedSources.unshift({
              value: currentSourceCode,
              label: `[Sumber ${currentSourceCode}] ${detail?.complaint_source_name || 'Saluran Sebelumnya'}`,
            })
          }

          const currentServiceCode = String(detail?.shipment_type_code ?? '')
          if (currentServiceCode && !formattedServices.some((s) => s.value === currentServiceCode)) {
            formattedServices.unshift({
              value: currentServiceCode,
              label: `${currentServiceCode} - ${detail?.shipment_type_description || 'Layanan Sebelumnya'}`,
            })
          }

          setComplaintTypes(formattedTypes)
          setComplaintSources(formattedSources)
          setShippingServices(formattedServices)
          setOffices(formattedOffices)
        }
      } catch (err) {
        console.error('Failed to load masters for edit modal:', err)
      } finally {
        if (active) setLoadingMasters(false)
      }
    }

    loadMasters()
    return () => {
      active = false
    }
  }, [token, detail])

  function handleChange(field, value) {
    const cleanVal = field === 'shipmentNumber' ? value.toUpperCase() : value
    setFormData((prev) => ({ ...prev, [field]: cleanVal }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  function validate() {
    const errs = {}
    if (!formData.customerName.trim()) errs.customerName = 'Nama pelanggan wajib diisi'
    if (!formData.customerPhone.trim()) errs.customerPhone = 'Nomor HP wajib diisi'
    if (!formData.shipmentNumber.trim()) errs.shipmentNumber = 'Nomor resi wajib diisi'
    if (!formData.shipmentTypeCode) errs.shipmentTypeCode = 'Jenis kiriman wajib dipilih'
    if (!formData.summary.trim() || formData.summary.trim().length < 10) {
      errs.summary = `Ringkasan minimal 10 karakter (${formData.summary.trim().length}/10)`
    }
    if (!formData.description.trim() || formData.description.trim().length < 20) {
      errs.description = `Uraian pengaduan minimal 20 karakter (${formData.description.trim().length}/20)`
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate() || submitting) return

    setSubmitting(true)
    setSubmitError('')
    setSuccessMsg('')

    try {
      await complaintApi.update(token, detail.id, {
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail.trim(),
        customerPhone: formData.customerPhone.trim(),
        customerAddress: formData.customerAddress.trim(),
        complaintTypeCode: Number(formData.complaintTypeCode),
        complaintSourceCode: Number(formData.complaintSourceCode),
        shipmentTypeCode: formData.shipmentTypeCode,
        shipmentNumber: formData.shipmentNumber.trim().toUpperCase(),
        shipmentOriginOffice: formData.shipmentOriginOffice.trim(),
        shipmentTargetOffice: formData.shipmentTargetOffice.trim(),
        summary: formData.summary.trim(),
        description: formData.description.trim(),
      })

      setSuccessMsg('Data pengaduan berhasil diperbarui dan disinkronkan!')
      setTimeout(() => {
        if (onUpdated) onUpdated()
        onClose()
      }, 700)
    } catch (err) {
      setSubmitError(err.message || 'Gagal menyimpan perubahan tiket pengaduan.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter kantor untuk opsi dropdown
  const filteredOriginOffices = useMemo(() => {
    if (!originSearch.trim()) return offices.slice(0, 30)
    const q = originSearch.toLowerCase()
    return offices.filter((o) => o.code.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)).slice(0, 30)
  }, [offices, originSearch])

  const filteredTargetOffices = useMemo(() => {
    if (!targetSearch.trim()) return offices.slice(0, 30)
    const q = targetSearch.toLowerCase()
    return offices.filter((o) => o.code.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)).slice(0, 30)
  }, [offices, targetSearch])

  const summaryLength = formData.summary.trim().length
  const descLength = formData.description.trim().length

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* Container Utama: max-h-[92vh] flex-col dengan Sticky Header & Footer */}
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
              <FileEdit className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-wider uppercase">
                  Ubah Data Pengaduan
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 text-[11px] font-semibold font-mono">
                  #{detail?.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pembaruan informasi aduan pelanggan dan routing investigasi CCH Pos Indonesia
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
            title="Tutup (ESC)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* 2. SCROLLABLE BODY - Hanya Bagian Ini yang Scroll       */}
        {/* ======================================================== */}
        <form onSubmit={handleSubmit} id="edit-complaint-form" className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-800/60 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Status Tiket Saat Ini:</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {detail?.status_code || '101'} - {detail?.status_description || 'TIKET DIBUKA (ENTRI)'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Kantor Pemroses:{' '}
              <span className="font-semibold text-slate-800 dark:text-white">
                {detail?.status_office_code || detail?.origin_office_code || '40005CC'}
              </span>
            </div>
          </div>

          {/* Feedback Messages */}
          {submitError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1">
                <strong className="font-semibold">Terjadi Kendala:</strong> {submitError}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
              <div className="flex-1">
                <strong className="font-semibold">Sukses:</strong> {successMsg}
              </div>
            </div>
          )}

          {/* CARD 1: RUTE KANTOR POS DENGAN QUICK PILLS & SELECT (TIDAK PERLU KETIK MANUAL!) */}
          <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center justify-between">
              <span>Rute Pengiriman & Disposisi Kantor Pos</span>
              <span className="text-[11px] font-normal text-slate-400 normal-case">
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
                    value={formData.shipmentOriginOffice}
                    onChange={(e) => handleChange('shipmentOriginOffice', e.target.value)}
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
                        onClick={() => handleChange('shipmentOriginOffice', hub.code)}
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
                    value={formData.shipmentTargetOffice}
                    onChange={(e) => handleChange('shipmentTargetOffice', e.target.value)}
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
                        onClick={() => handleChange('shipmentTargetOffice', hub.code)}
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

          {/* GRID 2 KOLOM: DATA PELANGGAN & DETAIL KIRIMAN POS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kolom Kiri: Informasi Pelanggan */}
            <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-blue-500" />
                Informasi Pelanggan
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Nama Pelanggan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => handleChange('customerName', e.target.value)}
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
                    Nomor HP / Telepon <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => handleChange('customerPhone', e.target.value)}
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
                    value={formData.customerEmail}
                    onChange={(e) => handleChange('customerEmail', e.target.value)}
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
                  value={formData.customerAddress}
                  onChange={(e) => handleChange('customerAddress', e.target.value)}
                  placeholder="Alamat domisili/korespondensi pelanggan..."
                  rows={2}
                  maxLength={250}
                  className="w-full rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition resize-none"
                />
              </div>
            </div>

            {/* Kolom Kanan: Klasifikasi & Detail Kiriman Pos (DROPDOWN TERISI 100% SINKRON!) */}
            <div className="rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-amber-500" />
                Klasifikasi & Detail Kiriman
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Nomor Resi / Barcode <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Otomatis Huruf Besar</span>
                </div>
                <input
                  type="text"
                  value={formData.shipmentNumber}
                  onChange={(e) => handleChange('shipmentNumber', e.target.value)}
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
                    value={formData.shipmentTypeCode}
                    onChange={(e) => handleChange('shipmentTypeCode', e.target.value)}
                    disabled={loadingMasters}
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
                    value={formData.complaintSourceCode}
                    onChange={(e) => handleChange('complaintSourceCode', e.target.value)}
                    disabled={loadingMasters}
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
                  value={formData.complaintTypeCode}
                  onChange={(e) => handleChange('complaintTypeCode', e.target.value)}
                  disabled={loadingMasters}
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
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileEdit className="h-3.5 w-3.5 text-blue-500" />
              Kronologi & Uraian Keluhan Pelanggan
            </div>

            {/* Ringkasan */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Ringkasan / Judul Masalah <span className="text-rose-500">*</span>
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
                value={formData.summary}
                onChange={(e) => handleChange('summary', e.target.value)}
                placeholder="Ringkasan singkat kendala pelanggan (min. 10 karakter)"
                maxLength={200}
                className={`w-full rounded-lg bg-white dark:bg-slate-800/80 border px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${
                  errors.summary ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 dark:border-white/10'
                }`}
              />
              {errors.summary ? (
                <p className="mt-1 text-[11px] text-rose-500 font-medium">{errors.summary}</p>
              ) : (
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Judul pokok keluhan untuk memudahkan identifikasi dan monitoring SLA.
                </p>
              )}
            </div>

            {/* Uraian Lengkap */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Uraian Lengkap Masalah <span className="text-rose-500">*</span>
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
                rows={4}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Ceritakan detail kronologi keluhan pelanggan (min. 20 karakter)..."
                maxLength={3000}
                className={`w-full rounded-lg bg-white dark:bg-slate-800/80 border px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition resize-none ${
                  errors.description ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-200 dark:border-white/10'
                }`}
              />
              {errors.description ? (
                <p className="mt-1 text-[11px] text-rose-500 font-medium">{errors.description}</p>
              ) : (
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Informasi kronologis lengkap yang akan dibaca oleh petugas investigasi kantor tujuan.
                </p>
              )}
            </div>
          </div>
        </form>

        {/* ======================================================== */}
        {/* 3. STICKY FOOTER - Selalu Terlihat di Bawah               */}
        {/* ======================================================== */}
        <div className="shrink-0 px-6 py-3.5 border-t border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-slate-800/80 flex items-center justify-between gap-3 z-10">
          <div className="text-[11px] text-slate-400 hidden sm:block">
            {loadingMasters ? 'Memuat data master CCH...' : 'Perubahan otomatis tersinkronisasi ke database CCH'}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-300 dark:border-white/10 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              form="edit-complaint-form"
              disabled={submitting || loadingMasters}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menyimpan Perubahan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Simpan Perubahan
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

/** Modal wrapper that cleanly mounts/unmounts the edit form when open and keyed by complaint id */
export function EditComplaintModal({ detail, isOpen, onClose, onUpdated }) {
  if (!isOpen || !detail) return null

  return (
    <EditComplaintForm
      key={detail.id || detail.complaint_id}
      detail={detail}
      onClose={onClose}
      onUpdated={onUpdated}
    />
  )
}
