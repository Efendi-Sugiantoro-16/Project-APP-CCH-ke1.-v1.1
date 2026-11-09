import { apiRequest } from '../../../shared/api/apiRequest.js'

/**
 * Call Center document client following the CCH-BE v1 contract.
 * Supports metadata listing, file queries, direct binary uploads with ClamAV validation,
 * inline previews, file downloads, and deletions.
 */
async function readPaged(path, token, params = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  }
  const suffix = query.toString() ? `?${query}` : ''
  const payload = await apiRequest(`${path}${suffix}`, { token })
  return payload?.data ?? []
}

export const documentApi = {
  /** List legacy & grouped document metadata */
  listForTicket(token, id, { limit = 25, offset = 0, completed = false } = {}) {
    const basePath = completed
      ? `/api/v1/complaints/call-center/completed/${id}/documents`
      : `/api/v1/complaints/call-center/${id}/documents`
    return readPaged(basePath, token, { limit, offset })
  },

  /** List individual uploaded digital files with document_id */
  listFilesForTicket(token, id, { limit = 50, offset = 0, completed = false } = {}) {
    const basePath = completed
      ? `/api/v1/complaints/call-center/completed/${id}/documents/files`
      : `/api/v1/complaints/call-center/${id}/documents/files`
    return readPaged(basePath, token, { limit, offset })
  },

  /** Fetch active document types master */
  async listDocumentTypes(token) {
    const payload = await apiRequest('/api/v1/masters/document-types', { token })
    return payload?.data ?? []
  },

  /** Upload a document/receipt file */
  async upload(token, complaintId, { historyId, documentTypeCode, file, completed = false }) {
    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `up-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`

    const basePath = completed
      ? `/api/v1/complaints/call-center/completed/${complaintId}/documents`
      : `/api/v1/complaints/call-center/${complaintId}/documents`

    const response = await fetch(basePath, {
      method: 'POST',
      headers: {
        'X-Authorization': `Bearer ${token}`,
        'X-History-ID': historyId,
        'X-Document-Type': documentTypeCode,
        'X-File-Name': file.name,
        'Content-Type': file.type || 'application/octet-stream',
        'Idempotency-Key': idempotencyKey,
      },
      body: file,
    })

    if (!response.ok) {
      let message = `Gagal mengunggah dokumen (${response.status})`
      try {
        const errorJson = await response.json()
        if (errorJson?.message) message = errorJson.message
        else if (errorJson?.error?.message) message = errorJson.error.message
      } catch {
        // Fallback to HTTP status message
      }
      throw new Error(message)
    }

    return response.json()
  },

  /** Fetch inline preview as Blob */
  async getPreviewBlob(token, complaintId, documentId, { completed = false } = {}) {
    const basePath = completed
      ? `/api/v1/complaints/call-center/completed/${complaintId}/documents/${documentId}/preview`
      : `/api/v1/complaints/call-center/${complaintId}/documents/${documentId}/preview`

    const response = await fetch(basePath, {
      headers: {
        'X-Authorization': `Bearer ${token}`,
      },
    })
    if (!response.ok) {
      throw new Error(`Gagal memuat pratinjau dokumen (${response.status})`)
    }
    return response.blob()
  },

  /** Download file directly to local computer */
  async downloadFile(token, complaintId, documentId, filename = 'dokumen', { completed = false } = {}) {
    const basePath = completed
      ? `/api/v1/complaints/call-center/completed/${complaintId}/documents/${documentId}/file`
      : `/api/v1/complaints/call-center/${complaintId}/documents/${documentId}/file`

    const response = await fetch(basePath, {
      headers: {
        'X-Authorization': `Bearer ${token}`,
      },
    })
    if (!response.ok) {
      throw new Error(`Gagal mengunduh berkas (${response.status})`)
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(anchor)
  },

  /** Delete uploaded document */
  async deleteDocument(token, complaintId, documentId, { completed = false } = {}) {
    const basePath = completed
      ? `/api/v1/complaints/call-center/completed/${complaintId}/documents/${documentId}`
      : `/api/v1/complaints/call-center/${complaintId}/documents/${documentId}`

    return apiRequest(basePath, {
      method: 'DELETE',
      token,
    })
  },
}