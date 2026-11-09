import { useState, useRef, useEffect } from 'react'
import {
  AlertCircle,
  Bot,
  FileText,
  Loader2,
  Package,
  Paperclip,
  UploadCloud,
  X,
  Truck,
  CheckCircle2,
  Image as ImageIcon,
  FileSpreadsheet,
  Link2,
  Sparkles,
} from 'lucide-react'
import { FormInput } from '../form/FormInput.jsx'
import { FormSelect } from '../form/FormSelect.jsx'
import { FormTextarea } from '../form/FormTextarea.jsx'
import { OfficeCombobox } from '../form/OfficeCombobox.jsx'
import { virtualCsApi } from '../../../ai/api/virtualCsApi.js'


const DOC_TYPES = [
  { code: '002', label: 'Berita Acara (BAP)' },
  { code: '001', label: 'Resi Kiriman' },
  { code: '004', label: 'Foto Kiriman / Kerusakan' },
  { code: '003', label: 'Adpis / Manifest' },
  { code: '005', label: 'NPD / SPBL' },
]

/**
 * Step 2: Complaint Details
 * Clean, structured, and responsive layout for complaint categorization, shipment routing, and description
 */
export function ComplaintDetailsStep({
  formData,
  errors,
  onChange,
  onBlur,
  complaintTypes = [],
  complaintSources = [],
  shippingServices = [],
  offices = [],
  isLoadingMasters = false,
  selectedFiles = [],
  onFilesChange,
}) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  const [aiClassifying, setAiClassifying] = useState(false)
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null)

  async function handleAiClassify() {
    const rawText = (formData.description || formData.summary || '').trim()
    if (!rawText) {
      alert('Ketik atau tempel isi keluhan pada kolom uraian terlebih dahulu untuk dianalisis oleh CS Virtual AI.')
      return
    }

    setAiClassifying(true)
    try {
      const res = await virtualCsApi.copilotClassify(rawText)
      setAiAnalysisResult(res)

      if (res.shipment_number && !formData.shipmentNumber) {
        onChange?.({ target: { name: 'shipmentNumber', value: res.shipment_number } })
      }
      if (res.summary && !formData.summary) {
        onChange?.({ target: { name: 'summary', value: res.summary } })
      }
      if (res.complaint_type_code) {
        onChange?.({ target: { name: 'complaintTypeCode', value: String(res.complaint_type_code) } })
      }
      if (res.destination_office_hint && !formData.shipmentTargetOffice) {
        onChange?.({ target: { name: 'shipmentTargetOffice', value: res.destination_office_hint.slice(0, 5) } })
      }
    } catch (err) {
      alert(`CS Virtual gagal menganalisis teks: ${err.message}`)
    } finally {
      setAiClassifying(false)
    }
  }


  // Auto-sync shipment route with complaint routing
  const [isSyncRoute, setIsSyncRoute] = useState(
    !formData.shipmentOriginOffice ||
      (formData.shipmentOriginOffice === formData.originOffice &&
        formData.shipmentTargetOffice === formData.targetOffice),
  )

  useEffect(() => {
    if (isSyncRoute) {
      if (formData.originOffice && formData.shipmentOriginOffice !== formData.originOffice) {
        onChange?.({ target: { name: 'shipmentOriginOffice', value: formData.originOffice } })
      }
      if (formData.targetOffice && formData.shipmentTargetOffice !== formData.targetOffice) {
        onChange?.({ target: { name: 'shipmentTargetOffice', value: formData.targetOffice } })
      }
    }
  }, [
    isSyncRoute,
    formData.originOffice,
    formData.targetOffice,
    formData.shipmentOriginOffice,
    formData.shipmentTargetOffice,
    onChange,
  ])

  const handleToggleSync = (e) => {
    const checked = e.target.checked
    setIsSyncRoute(checked)
    if (checked) {
      if (formData.originOffice) {
        onChange?.({ target: { name: 'shipmentOriginOffice', value: formData.originOffice } })
      }
      if (formData.targetOffice) {
        onChange?.({ target: { name: 'shipmentTargetOffice', value: formData.targetOffice } })
      }
    }
  }

  const handleFilesSelected = (files) => {
    const fileList = Array.from(files)
    const validFiles = fileList
      .filter((f) => f.size <= 5 * 1024 * 1024)
      .map((f) => ({
        file: f,
        documentTypeCode: '002', // Default: Berita Acara / BAP
        name: f.name,
        size: f.size,
      }))
    const combined = [...(selectedFiles || []), ...validFiles].slice(0, 5)
    onFilesChange?.(combined)
  }

  const handleRemoveFile = (indexToRemove) => {
    const updated = (selectedFiles || []).filter((_, idx) => idx !== indexToRemove)
    onFilesChange?.(updated)
  }

  const handleDocTypeChange = (idx, docTypeCode) => {
    const updated = [...(selectedFiles || [])]
    updated[idx] = { ...updated[idx], documentTypeCode: docTypeCode }
    onFilesChange?.(updated)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const summaryLength = formData.summary ? formData.summary.trim().length : 0
  const descriptionLength = formData.description ? formData.description.trim().length : 0

  return (
    <div className="complaint-details-step space-y-6">
      {/* Modern Section Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Detail & Kronologi Pengaduan</h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Klasifikasi pengaduan, informasi kiriman paket Pos, dan uraian kronologi masalah
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Kategori & Sumber Pengaduan */}
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect
            label="Jenis Pengaduan"
            name="complaintTypeCode"
            value={formData.complaintTypeCode}
            onChange={onChange}
            onBlur={onBlur}
            error={errors.complaintTypeCode}
            options={complaintTypes}
            required
            disabled={isLoadingMasters}
            placeholder={isLoadingMasters ? 'Memuat jenis...' : '-- Pilih Jenis Pengaduan --'}
          />
          <FormSelect
            label="Sumber Pengaduan"
            name="complaintSourceCode"
            value={formData.complaintSourceCode}
            onChange={onChange}
            onBlur={onBlur}
            error={errors.complaintSourceCode}
            options={complaintSources}
            required
            disabled={isLoadingMasters}
            placeholder={isLoadingMasters ? 'Memuat sumber...' : '-- Pilih Sumber Pengaduan --'}
          />
        </div>
      </div>

      {/* Section 2: Data Kiriman & Rute Pos (Structured Sub-Card) */}
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                Informasi & Rute Kiriman Pos
              </h4>
              <p className="text-[11px] text-slate-500">
                Identitas paket fisik yang diadukan beserta rute kantor asal dan tujuan
              </p>
            </div>
          </div>

          {/* Smart Route Sync Switch */}
          <label className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/70 text-blue-700 text-xs font-semibold cursor-pointer hover:bg-blue-100/70 transition self-start sm:self-auto">
            <input
              type="checkbox"
              checked={isSyncRoute}
              onChange={handleToggleSync}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5" />
              Samakan Rute Kiriman dengan Rute Pengaduan
            </span>
          </label>
        </div>

        {/* Shipment Type & Receipt Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <FormSelect
            label="Jenis Layanan Kiriman"
            name="shipmentTypeCode"
            value={formData.shipmentTypeCode}
            onChange={onChange}
            onBlur={onBlur}
            error={errors.shipmentTypeCode}
            options={shippingServices}
            required
            disabled={isLoadingMasters}
            placeholder={isLoadingMasters ? 'Memuat layanan...' : '-- Pilih Jenis Kiriman --'}
          />
          <FormInput
            label="Nomor Resi / Connote"
            name="shipmentNumber"
            value={formData.shipmentNumber}
            onChange={onChange}
            onBlur={onBlur}
            error={errors.shipmentNumber}
            placeholder="Contoh: POS992381273ID atau P240829..."
            required
            maxLength={35}
            className="font-mono uppercase font-semibold"
          />
        </div>

        {/* Shipment Offices Route */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <OfficeCombobox
              label="Kantor Asal Kiriman"
              name="shipmentOriginOffice"
              value={formData.shipmentOriginOffice}
              onChange={onChange}
              onBlur={onBlur}
              error={errors.shipmentOriginOffice}
              offices={offices}
              placeholder="Cari kantor asal paket..."
              required
              showQuickChips={!isSyncRoute}
            />
            {isSyncRoute && (
              <span className="text-[10px] text-blue-600 font-medium inline-flex items-center gap-1 -mt-2 mb-2">
                <CheckCircle2 className="w-3 h-3 text-blue-500" />
                Tersinkron dengan Kantor Asal Pengaduan ({formData.originOffice || '-'})
              </span>
            )}
          </div>

          <div className="relative">
            <OfficeCombobox
              label="Kantor Tujuan Kiriman"
              name="shipmentTargetOffice"
              value={formData.shipmentTargetOffice}
              onChange={onChange}
              onBlur={onBlur}
              error={errors.shipmentTargetOffice}
              offices={offices}
              placeholder="Cari kantor tujuan paket..."
              required
              showQuickChips={!isSyncRoute}
            />
            {isSyncRoute && (
              <span className="text-[10px] text-blue-600 font-medium inline-flex items-center gap-1 -mt-2 mb-2">
                <CheckCircle2 className="w-3 h-3 text-blue-500" />
                Tersinkron dengan Kantor Tujuan Investigasi ({formData.targetOffice || '-'})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Kronologi & Deskripsi Pengaduan */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Ringkasan / Pokok Masalah <span className="text-red-500">*</span>
            </label>
            <span
              className={`text-[11px] font-mono font-medium ${
                summaryLength >= 10 ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {summaryLength}/10 min {summaryLength >= 10 && '✓'}
            </span>
          </div>
          <FormInput
            name="summary"
            value={formData.summary}
            onChange={onChange}
            onBlur={onBlur}
            error={errors.summary}
            placeholder="Cth: Paket kiriman obat urgent tertahan di SPP Surabaya dari kemarin"
            required
            maxLength={120}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700">
              Uraian Kronologi Lengkap <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAiClassify}
                disabled={aiClassifying}
                className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                title="Ekstrak resi dan klasifikasi otomatis dengan CS Virtual AI"
              >
                {aiClassifying ? (
                  <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                ) : (
                  <Bot className="w-3 h-3 text-purple-600" />
                )}
                <span>Auto-Klasifikasi AI</span>
              </button>
              <span
                className={`text-[11px] font-mono font-medium ${
                  descriptionLength >= 20 ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {descriptionLength}/20 min {descriptionLength >= 20 && '✓'}
              </span>
            </div>
          </div>
          <FormTextarea
            name="description"
            value={formData.description}
            onChange={onChange}
            onBlur={onBlur}
            error={errors.description}
            placeholder="Ceritakan detail kronologi lengkap, keluhan yang dirasakan pelanggan, serta harapan tindak lanjut..."
            required
            rows={3}
            maxLength={2000}
          />
          {aiAnalysisResult && (
            <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50/80 p-3 text-xs text-slate-800 space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-purple-700">
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
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {aiAnalysisResult.rationale}
              </p>
              {aiAnalysisResult.shipment_number && (
                <div className="text-[11px] font-mono text-purple-900">
                  Resi Terdeteksi: <strong>{aiAnalysisResult.shipment_number}</strong>
                  {aiAnalysisResult.origin_office_hint && ` (Asal: ${aiAnalysisResult.origin_office_hint})`}
                  {aiAnalysisResult.destination_office_hint && ` (Tujuan: ${aiAnalysisResult.destination_office_hint})`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Section 4: Bukti & Dokumen Pendukung (cchentridok - Modern Interactive Dropzone) */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 transition-colors hover:border-blue-400">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-700">
              Lampiran Bukti / Berita Acara BAP / Foto Kerusakan (cchentridok)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Maks. 5 file, @5MB (JPG, PNG, PDF)</span>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFilesSelected(e.target.files)}
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
        />

        {/* Dropzone Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`py-4 px-4 rounded-xl border border-dashed text-center cursor-pointer transition flex flex-col sm:flex-row items-center justify-center gap-3 ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-slate-200 bg-white hover:bg-blue-50/30 hover:border-blue-300'
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div className="text-left text-xs">
            <span className="font-semibold text-blue-600 hover:underline">
              Klik untuk unggah dokumen BAP / Foto
            </span>{' '}
            <span className="text-slate-500">atau seret file resi/kemasan ke sini</span>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Dokumen otomatis terunggah dan terlampir pada tiket setelah diterbitkan
            </div>
          </div>
        </div>

        {/* Selected Files List with Document Type Selection */}
        {selectedFiles && selectedFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            {selectedFiles.map((item, idx) => {
              const file = item.file || item
              const docType = item.documentTypeCode || '002'
              const isPdf = file.type === 'application/pdf' || file.name?.endsWith('.pdf')

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      {isPdf ? <FileSpreadsheet className="w-4 h-4 text-rose-500" /> : <ImageIcon className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-xs sm:max-w-md">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <select
                      value={docType}
                      onChange={(e) => handleDocTypeChange(idx, e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {DOC_TYPES.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition cursor-pointer"
                      title="Hapus file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Section 5: Compact Tip / Notice */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="leading-relaxed">
          Pastikan <strong>Nomor Resi</strong> dan <strong>Kantor Tujuan Investigasi</strong> telah terverifikasi dengan benar agar unit investigasi di kantor pemeriksa dapat segera memproses SLA pengaduan.
        </span>
      </div>
    </div>
  )
}
