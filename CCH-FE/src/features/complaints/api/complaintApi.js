import { apiRequest } from '../../../shared/api/apiRequest.js'

/**
 * Call Center complaint API client following the CCH-BE v1 contract.
 * The backend revalidates JWT role, office, ACL, and routing on every call;
 * this client only shapes requests and normalizes the JSON responses.
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

export const complaintApi = {
  listOpen(token, { limit = 25, offset = 0 } = {}) {
    return readPaged('/api/v1/complaints/call-center/open', token, { limit, offset })
  },

  listCompleted(token, { limit = 25, offset = 0 } = {}) {
    return readPaged('/api/v1/complaints/call-center/completed', token, { limit, offset })
  },

  listReceivedOpen(token, { from, to, limit = 25, offset = 0 } = {}) {
    return readPaged('/api/v1/complaints/dashboard/received-open', token, { from, to, limit, offset })
  },

  listSentOpen(token, { from, to, limit = 25, offset = 0 } = {}) {
    return readPaged('/api/v1/complaints/dashboard/sent-open', token, { from, to, limit, offset })
  },

  listReceivedUnresponded(token, { from, to, product_code, regional, office, limit = 50, offset = 0 } = {}) {
    return readPaged('/api/v1/complaints/reports/received-unresponded', token, {
      from,
      to,
      product_code,
      regional,
      office,
      limit,
      offset,
    })
  },

  listSentUnresponded(token, { from, to, product_code, regional, office, limit = 50, offset = 0 } = {}) {
    return readPaged('/api/v1/complaints/reports/sent-unresponded', token, {
      from,
      to,
      product_code,
      regional,
      office,
      limit,
      offset,
    })
  },

  listReceivedSummary(token, { from, to, product_code, regional, hanya_tujuan, limit = 500, offset = 0 } = {}) {
    return readPaged('/api/v1/complaints/reports/received-summary', token, {
      from,
      to,
      product_code,
      regional,
      hanya_tujuan,
      limit,
      offset,
    })
  },

  listSentSummary(token, { from, to, product_code, regional, limit = 500, offset = 0 } = {}) {
    return readPaged('/api/v1/complaints/reports/sent-summary', token, {
      from,
      to,
      product_code,
      regional,
      limit,
      offset,
    })
  },

  listBreakdown(token, { direction = 'received', kind = 'shipment', from, to, product_code, regional, office, hanya_tujuan, limit = 50, offset = 0 } = {}) {
    const dir = direction === 'sent' ? 'sent' : 'received'
    const k = kind === 'problem' ? 'per-problem' : 'per-shipment'
    return readPaged(`/api/v1/complaints/reports/${dir}-${k}`, token, {
      from,
      to,
      product_code,
      regional,
      office,
      hanya_tujuan: hanya_tujuan ? 'on' : undefined,
      limit,
      offset,
    })
  },

  listBreakdownDetail(token, { direction = 'received', kind = 'shipment', code, from, to, regional, office, hanya_tujuan, limit = 50, offset = 0 } = {}) {
    const dir = direction === 'sent' ? 'sent' : 'received'
    const k = kind === 'problem' ? 'per-problem' : 'per-shipment'
    return readPaged(`/api/v1/complaints/reports/${dir}-${k}/detail`, token, {
      code,
      from,
      to,
      regional,
      office,
      hanya_tujuan: hanya_tujuan ? 'on' : undefined,
      limit,
      offset,
    })
  },

  async listDurationSummary(token, { direction = 'received', status = 'masih_terbuka', from, to, regional, product_code, limit = 100, offset = 0 } = {}) {
    const params = new URLSearchParams()
    if (direction) params.set('direction', direction)
    if (status) params.set('status', status)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (regional) params.set('regional', regional)
    if (product_code) params.set('product_code', product_code)
    if (limit) params.set('limit', String(limit))
    if (offset) params.set('offset', String(offset))

    const suffix = params.toString() ? `?${params}` : ''
    const payload = await apiRequest(`/api/v1/complaints/reports/duration-summary${suffix}`, { token })
    return payload ?? { data: [], summary: {} }
  },

  listDurationDetail(token, { direction = 'received', status = 'masih_terbuka', office_code, duration_bucket, from, to, product_code, limit = 50, offset = 0 } = {}) {
    return readPaged('/api/v1/complaints/reports/duration-detail', token, {
      direction,
      status,
      office_code,
      duration_bucket,
      from,
      to,
      product_code,
      limit,
      offset,
    })
  },

  async listRegionalOptions(token) {
    try {
      const payload = await apiRequest('/api/v1/masters/offices/options', { token })
      return payload?.regional_offices ?? []
    } catch {
      return []
    }
  },

  async listOfficeOptions(token) {
    try {
      const payload = await apiRequest('/api/v1/masters/offices', { token })
      return Array.isArray(payload) ? payload : (payload?.data ?? [])
    } catch {
      return []
    }
  },

  async listShippingServices(token) {
    try {
      const payload = await apiRequest('/api/v1/masters/shipping-services', { token })
      return Array.isArray(payload) ? payload : (payload?.data ?? [])
    } catch {
      return []
    }
  },

  getOpen(token, id) {
    return apiRequest(`/api/v1/complaints/call-center/${id}`, { token }).then((payload) => payload?.data ?? null)
  },

  getCompleted(token, id) {
    return apiRequest(`/api/v1/complaints/call-center/completed/${id}`, { token }).then((payload) => payload?.data ?? null)
  },

  listOpenHistory(token, id, { limit = 50, offset = 0 } = {}) {
    return readPaged(`/api/v1/complaints/call-center/${id}/history`, token, { limit, offset })
  },

  listCompletedHistory(token, id, { limit = 50, offset = 0 } = {}) {
    return readPaged(`/api/v1/complaints/call-center/completed/${id}/history`, token, { limit, offset })
  },

  async listStatusOptions(token, id) {
    try {
      return await readPaged(`/api/v1/complaints/${id}/status-options`, token)
    } catch {
      return await readPaged(`/api/v1/complaints/call-center/${id}/status-options`, token)
    }
  },

  async updateStatus(token, { id, expectedStatusCode, statusCode, description, idempotencyKey }) {
    const payload = {
      expected_status_code: expectedStatusCode,
      status_code: statusCode,
      description,
    }
    try {
      return await apiRequest(`/api/v1/complaints/${id}/status`, {
        method: 'POST',
        token,
        headers: { 'Idempotency-Key': idempotencyKey },
        body: payload,
      })
    } catch {
      return await apiRequest(`/api/v1/complaints/call-center/${id}/status`, {
        method: 'POST',
        token,
        headers: { 'Idempotency-Key': idempotencyKey },
        body: payload,
      })
    }
  },

  update(token, id, complaintData) {
    return apiRequest(`/api/v1/complaints/${id}`, {
      method: 'PUT',
      token,
      body: complaintData,
    })
  },

  count(token, path, params = {}) {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, String(value))
      }
    }
    const suffix = query.toString() ? `?${query}` : ''
    return apiRequest(`${path}${suffix}`, { token }).then((payload) => payload?.count ?? 0)
  },

  countOpen(token, { from, to } = {}) {
    return complaintApi.count(token, '/api/v1/complaints/call-center/open/count', { from, to })
  },

  countReceivedOpen(token, { from, to } = {}) {
    return complaintApi.count(token, '/api/v1/complaints/call-center/received-open/count', { from, to })
  },

  countSentOpen(token, { from, to } = {}) {
    return complaintApi.count(token, '/api/v1/complaints/call-center/sent-open/count', { from, to })
  },

  countCompleted(token, { from, to } = {}) {
    return complaintApi.count(token, '/api/v1/complaints/call-center/completed/count', { from, to })
  },

  countRequestClose(token, { from, to } = {}) {
    return complaintApi.count(token, '/api/v1/complaints/call-center/request-close/count', { from, to })
  },

  listStatusComplaints(token, {
    direction = 'received',
    status = 'belum_respon',
    from,
    to,
    regional,
    office_code,
    product_code,
    complaint_type,
    search,
    limit = 25,
    offset = 0,
  } = {}) {
    const query = new URLSearchParams()
    const params = {
      direction,
      status,
      from,
      to,
      regional,
      office_code,
      product_code,
      complaint_type,
      search,
      limit,
      offset,
    }
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, String(value))
      }
    }
    const suffix = query.toString() ? `?${query}` : ''
    return apiRequest(`/api/v1/complaints/status-list${suffix}`, { token })
  },
}