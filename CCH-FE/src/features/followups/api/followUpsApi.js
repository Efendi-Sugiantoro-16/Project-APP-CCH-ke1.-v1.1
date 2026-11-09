import { apiRequest } from '../../../shared/api/apiRequest.js'

/**
 * Call Center follow-up API client following the CCH-BE v1 contract.
 * All operations require staff JWT via X-Authorization.
 * Office scope is revalidated server-side and never trusted from client parameters.
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

export const followUpsApi = {
  /** List all follow-up plans and realizations for a complaint ticket */
  listForTicket(token, id, { limit = 25, offset = 0 } = {}) {
    return readPaged(`/api/v1/complaints/call-center/${id}/follow-ups`, token, { limit, offset })
  },

  /** List follow-ups for the operator's office */
  listForOffice(token, { limit = 25, offset = 0 } = {}) {
    return readPaged('/api/v1/follow-ups/call-center/office', token, { limit, offset })
  },

  /** List follow-ups due today */
  listDueToday(token, { limit = 25, offset = 0 } = {}) {
    return readPaged('/api/v1/follow-ups/call-center/office/due-today', token, { limit, offset })
  },

  /** Count overdue follow-ups (unrealized with planned date past due) */
  countOverdue(token, { from, to } = {}) {
    const query = new URLSearchParams()
    if (from) query.set('from', from)
    if (to) query.set('to', to)
    const suffix = query.toString() ? `?${query}` : ''
    return apiRequest(`/api/v1/follow-ups/call-center/office/overdue/count${suffix}`, { token }).then(
      (payload) => payload?.count ?? 0,
    )
  },

  /** List overdue follow-ups */
  listOverdue(token, { from, to, limit = 25, offset = 0 } = {}) {
    return readPaged('/api/v1/follow-ups/call-center/office/overdue', token, { from, to, limit, offset })
  },

  /** Fetch active master follow-up statuses (e.g. 101: Follow-Up ke-1, etc.) */
  async listStatuses(token) {
    const payload = await apiRequest('/api/v1/masters/follow-up-statuses', { token })
    return payload?.data ?? []
  },

  /** Create a new follow-up plan */
  createPlan(token, complaintId, { statusCode, plannedAt, planNotes }) {
    return apiRequest(`/api/v1/complaints/call-center/${complaintId}/follow-ups`, {
      method: 'POST',
      token,
      body: {
        status_code: statusCode,
        planned_at: plannedAt,
        plan_notes: planNotes,
      },
    })
  },

  /** Edit an existing unrealized follow-up plan */
  editPlan(token, complaintId, statusCode, { plannedAt, planNotes }) {
    return apiRequest(`/api/v1/complaints/call-center/${complaintId}/follow-ups/${statusCode}`, {
      method: 'PUT',
      token,
      body: {
        planned_at: plannedAt,
        plan_notes: planNotes,
      },
    })
  },

  /** Record realization outcome for a follow-up plan */
  realize(token, complaintId, statusCode, { outcome }) {
    return apiRequest(`/api/v1/complaints/call-center/${complaintId}/follow-ups/${statusCode}/realize`, {
      method: 'POST',
      token,
      body: {
        outcome,
      },
    })
  },

  /** Cancel an unrealized follow-up plan */
  cancelPlan(token, complaintId, statusCode) {
    return apiRequest(`/api/v1/complaints/call-center/${complaintId}/follow-ups/${statusCode}`, {
      method: 'DELETE',
      token,
    })
  },
}