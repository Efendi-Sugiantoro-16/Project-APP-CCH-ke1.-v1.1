import { useContext, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { documentApi } from '../../documents/api/documentApi.js'
import { Card, CardHeader } from '../../../shared/ui/Card.jsx'
import { Button } from '../../../shared/ui/Button.jsx'
import { formatDateTime } from '../format.js'

const MAX_FILE_BYTES = 2_000_000 // 2MB backend storage limit
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

const DEFAULT_DOC_TYPES = [
  { code: '001', description: 'Resi Kiriman' },
  { code: '002', description: 'Berita Acara' },
  { code: '003', description: 'Adpis / Manifest' },
  { code: '004', description: 'Foto Kiriman' },
  { code: '005', description: 'NPD / SPBL' },
  { code: '006', description: 'SPPBMCP' },
]

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function isImageFile(mediaType, ext) {
  return (
    mediaType?.startsWith('image/') ||
    ext === '.jpg' ||
    ext === '.jpeg' ||
    ext === '.png'
  )
}

/** Inline Document & Receipt Physical Viewer Modal */
function DocumentViewerModal({ token, complaintId, doc, completed = false, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    let createdUrl = null

    async function loadPreview() {
      try {
        setLoading(true)
        setError(null)
        const blob = await documentApi.getPreviewBlob(token, complaintId, doc.document_id, { completed })
        if (active) {
          createdUrl = URL.createObjectURL(blob)
          setBlobUrl(createdUrl)
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Gagal memuat pratinjau dokumen.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    if (token && complaintId && doc?.document_id) {
      loadPreview()
    }

    return () => {
      active = false
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl)
      }
    }
  }, [token, complaintId, doc, completed])

  const handleDownload = () => {
    const filename = `dokumen-${doc.document_id}${doc.file_extension || '.pdf'}`
    documentApi.downloadFile(token, complaintId, doc.document_id, filename, { completed })
  }

  const isImg = isImageFile(doc.media_type, doc.file_extension)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                isImg ? 'bg-sky-100 text-sky-600 dark:bg-sky-950/50' : 'bg-red-100 text-red-600 dark:bg-red-950/50'
              }`}
            >
              {isImg ? <ImageIcon size={20} /> : <FileText size={20} />}
            </span>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                {doc.document_type || doc.document_type_code || 'Pratinjau Dokumen'}
              </h3>
              <p className="mono text-xs text-slate-400">
                ID: {doc.document_id} · {formatFileSize(doc.file_size)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <Download size={14} className="mr-1.5" />
              Unduh
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto bg-slate-50 p-4 dark:bg-slate-950/50">
          {loading ? (
            <div className="flex h-96 flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin text-blue-600" />
              <p className="text-sm font-medium">Memuat pratinjau berkas…</p>
            </div>
          ) : error ? (
            <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-red-50 p-3 text-red-600 dark:bg-red-950/50">
                <AlertCircle size={28} />
              </div>
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                <Download size={14} className="mr-1.5" />
                Coba Unduh Berkas Langsung
              </Button>
            </div>
          ) : blobUrl ? (
            isImg ? (
              <div className="flex min-h-[50vh] items-center justify-center p-2">
                <img
                  src={blobUrl}
                  alt={doc.document_type || 'Pratinjau'}
                  className="max-h-[72vh] max-w-full rounded-xl object-contain shadow-md"
                />
              </div>
            ) : (
              <iframe
                src={blobUrl}
                title="Pratinjau PDF"
                className="h-[72vh] w-full rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800"
              />
            )
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * Interactive Document & Receipt Physical Attachment Panel
 * Supports drag-and-drop dropzone, live upload with ClamAV validation,
 * inline modal preview, file downloads, and legacy metadata view.
 */
export function DocumentsPanel({
  complaintId,
  items = [],
  files = [],
  loading = false,
  error = null,
  historyItems = [],
  completed = false,
  onReload,
}) {
  const { token } = useContext(AuthContext)
  const fileInputRef = useRef(null)

  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedDocType, setSelectedDocType] = useState('001')
  const [selectedHistoryId, setSelectedHistoryId] = useState('')
  const [docTypes, setDocTypes] = useState(DEFAULT_DOC_TYPES)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [uploadSuccess, setUploadSuccess] = useState(null)

  const [deletingId, setDeletingId] = useState(null)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [showLegacy, setShowLegacy] = useState(false)

  // Fetch document types master on mount
  useEffect(() => {
    let active = true
    if (token) {
      documentApi
        .listDocumentTypes(token)
        .then((types) => {
          if (active && types && types.length > 0) {
            setDocTypes(types)
          }
        })
        .catch(() => {
          // Keep defaults if lookup unavailable
        })
    }
    return () => {
      active = false
    }
  }, [token])

  const effectiveHistoryId = selectedHistoryId || historyItems[0]?.history_id || historyItems[0]?.id || ''

  const validateAndSetFile = (file) => {
    setUploadError(null)
    setUploadSuccess(null)
    if (!file) return

    const name = file.name.toLowerCase()
    const validExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))
    const validType = ALLOWED_TYPES.includes(file.type)

    if (!validExt && !validType) {
      setUploadError('Format berkas tidak didukung. Harap pilih berkas PDF, JPG, atau PNG.')
      return
    }

    if (file.size > MAX_FILE_BYTES) {
      setUploadError(
        `Ukuran berkas (${formatFileSize(file.size)}) melebihi batas maksimum 2MB. Silakan kompresi berkas terlebih dahulu.`,
      )
      return
    }

    setSelectedFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer?.files?.[0]
    if (dropped) {
      validateAndSetFile(dropped)
      setIsUploadOpen(true)
    }
  }

  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile) {
      setUploadError('Pilih berkas yang akan diunggah terlebih dahulu.')
      return
    }

    const histId = effectiveHistoryId
    if (!histId) {
      setUploadError('Tahap histori pengaduan tidak ditemukan.')
      return
    }

    try {
      setUploading(true)
      setUploadError(null)
      await documentApi.upload(token, complaintId, {
        historyId: histId,
        documentTypeCode: selectedDocType,
        file: selectedFile,
        completed,
      })

      setUploadSuccess(`Berkas "${selectedFile.name}" berhasil diunggah dan diverifikasi!`)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''

      if (onReload) {
        onReload()
      }
    } catch (err) {
      setUploadError(err.message || 'Gagal mengunggah dokumen.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (docId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus dokumen lampiran ini?')) {
      return
    }

    try {
      setDeletingId(docId)
      await documentApi.deleteDocument(token, complaintId, docId, { completed })
      if (onReload) onReload()
    } catch (err) {
      alert(err.message || 'Gagal menghapus dokumen.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = (doc) => {
    const filename = `dokumen-${doc.document_id}${doc.file_extension || '.pdf'}`
    documentApi.downloadFile(token, complaintId, doc.document_id, filename, { completed })
  }

  return (
    <>
      <Card>
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <span>{completed ? 'Dokumen Tiket Selesai' : 'Dokumen & Lampiran Resi'}</span>
              {completed ? (
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Arsip Selesai
                </span>
              ) : null}
            </div>
          }
          subtitle={
            completed
              ? 'Arsip bukti penyelesaian, berita acara serah terima, dan berkas fisik tiket selesai.'
              : 'Unggah dan tinjau berkas bukti fisik tiket.'
          }
          actions={
            <Button
              variant={isUploadOpen ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => {
                setIsUploadOpen((prev) => !prev)
                setUploadError(null)
                setUploadSuccess(null)
              }}
            >
              <Plus size={14} className="mr-1" />
              {isUploadOpen ? 'Tutup Form' : 'Unggah Dokumen'}
            </Button>
          }
        />

        <div className="p-4 space-y-4">
          {/* Notifications */}
          {uploadSuccess ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
              <span>{uploadSuccess}</span>
            </div>
          ) : null}

          {uploadError ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{uploadError}</span>
            </div>
          ) : null}

          {/* Interactive Dropzone & Upload Form */}
          {isUploadOpen ? (
            <form
              onSubmit={handleUploadSubmit}
              className="space-y-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 transition-all dark:border-blue-900/40 dark:bg-blue-950/20"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Formulir Lampiran Berkas Baru
                </span>
                <span className="mono text-[11px] text-slate-400">Maks. 2MB (PDF/JPG/PNG)</span>
              </div>

              {/* Drag & Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-100/70 shadow-inner dark:bg-blue-900/40'
                    : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => validateAndSetFile(e.target.files?.[0])}
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className="hidden"
                />

                <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/80">
                  <UploadCloud size={20} />
                </span>

                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-800 text-sm dark:text-slate-100">
                      {selectedFile.name}
                    </p>
                    <p className="mono text-xs text-blue-600 dark:text-blue-400">
                      {formatFileSize(selectedFile.size)} · Siap diunggah
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Tarik & jatuhkan berkas di sini atau{' '}
                      <span className="text-blue-600 underline">klik untuk memilih</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Mendukung bukti resi, foto fisik, atau berita acara
                    </p>
                  </div>
                )}
              </div>

              {/* Select Options */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Jenis Dokumen
                  </label>
                  <select
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {docTypes.map((dt) => (
                      <option key={dt.code || dt.Kode_Jenis_Dokumen} value={dt.code || dt.Kode_Jenis_Dokumen}>
                        {dt.code || dt.Kode_Jenis_Dokumen} -{' '}
                        {dt.description || dt.Deskripsi_Jenis_Dokumen || 'Dokumen'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kaitkan ke Tahap Histori
                  </label>
                  <select
                    value={effectiveHistoryId}
                    onChange={(e) => setSelectedHistoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {historyItems.map((h, idx) => (
                      <option key={h.history_id || h.id || idx} value={h.history_id || h.id}>
                        {h.status_description || `Tahap #${idx + 1}`} ({h.history_id || h.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null)
                    setIsUploadOpen(false)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  disabled={uploading}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={uploading || !selectedFile}>
                  {uploading ? (
                    <>
                      <Loader2 size={14} className="mr-1.5 animate-spin" />
                      Memverifikasi & Mengunggah…
                    </>
                  ) : (
                    <>
                      <UploadCloud size={14} className="mr-1.5" />
                      Unggah Sekarang
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : null}

          {/* Uploaded Digital Files Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Berkas Digital Terlampir ({files.length})
              </span>
            </div>

            {loading ? (
              <div className="state-box border-0 py-6 shadow-none">
                <Loader2 size={20} className="animate-spin text-blue-500" />
                <span className="text-xs">Memuat dokumen…</span>
              </div>
            ) : error ? (
              <div className="alert alert-error" role="alert">
                <span className="text-xs">{error}</span>
              </div>
            ) : !files || files.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-800">
                <UploadCloud size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p>Belum ada berkas digital yang dilampirkan.</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Gunakan tombol &quot;Unggah Dokumen&quot; di atas untuk melampirkan resi atau foto fisik.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {files.map((file) => {
                  const isImg = isImageFile(file.media_type, file.file_extension)
                  const isDel = deletingId === file.document_id

                  return (
                    <li
                      key={file.document_id}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-xs transition hover:border-blue-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            isImg
                              ? 'bg-sky-100 text-sky-600 dark:bg-sky-950/60'
                              : 'bg-red-100 text-red-600 dark:bg-red-950/60'
                          }`}
                        >
                          {isImg ? <ImageIcon size={18} /> : <FileText size={18} />}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {file.document_type || file.document_type_code}
                            </span>
                            <span className="mono text-xs font-semibold text-slate-500">
                              {formatFileSize(file.file_size)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {file.upload_office_code ? `Kantor ${file.upload_office_code} · ` : ''}
                            {file.created_at ? formatDateTime(file.created_at) : ''}
                            {file.uploaded_by ? ` · oleh ${file.uploaded_by}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(file)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                          title="Pratinjau Dokumen"
                          aria-label="Pratinjau"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(file)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          title="Unduh Berkas"
                          aria-label="Unduh"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(file.document_id)}
                          disabled={isDel}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/50"
                          title="Hapus Dokumen"
                          aria-label="Hapus"
                        >
                          {isDel ? <Loader2 size={14} className="animate-spin text-red-500" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Legacy Metadata Accordion */}
          {items && items.length > 0 ? (
            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowLegacy((prev) => !prev)}
                className="flex w-full items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                <span>Riwayat Dokumen Metadata Legacy ({items.length})</span>
                {showLegacy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showLegacy ? (
                <ul className="mt-2 space-y-1.5">
                  {items.map((document) => (
                    <li
                      key={`${document.history_id}-${document.document_type_code}`}
                      className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/40"
                    >
                      <FileText size={14} className="mt-0.5 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          {document.document_type || document.document_type_code}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {document.upload_office_code || document.office_code
                            ? `Kantor ${document.upload_office_code || document.office_code} · `
                            : ''}
                          {document.added_at ? formatDateTime(document.added_at) : ''}
                          {document.file_count ? ` · ${document.file_count} berkas` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>

      {/* Viewer Modal */}
      {previewDoc ? (
        <DocumentViewerModal
          token={token}
          complaintId={complaintId}
          doc={previewDoc}
          completed={completed}
          onClose={() => setPreviewDoc(null)}
        />
      ) : null}
    </>
  )
}