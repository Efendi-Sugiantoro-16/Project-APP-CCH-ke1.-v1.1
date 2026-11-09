import { apiRequest } from '../../../shared/api/apiRequest.js'

/**
 * Client for all 14 CCH Master Data CRUD endpoints.
 * All requests pass { token } which supplies the X-Authorization: Bearer header.
 */

// Helper to normalize array or { data: [...] } responses
function unwrap(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return payload ?? []
}

export const mastersApi = {
  // 1. Kalender Libur (cch_kalender_libur)
  holidayCalendar: {
    async list(token) {
      const res = await apiRequest('/api/v1/masters/holiday-calendar', { token })
      return unwrap(res)
    },
    async get(token, date) {
      return apiRequest(`/api/v1/masters/holiday-calendar/${encodeURIComponent(date)}`, { token })
    },
    async create(token, payload) {
      return apiRequest('/api/v1/masters/holiday-calendar', {
        method: 'POST',
        token,
        body: payload,
      })
    },
    async update(token, date, payload) {
      return apiRequest(`/api/v1/masters/holiday-calendar/${encodeURIComponent(date)}`, {
        method: 'PUT',
        token,
        body: payload,
      })
    },
    async delete(token, date) {
      return apiRequest(`/api/v1/masters/holiday-calendar/${encodeURIComponent(date)}`, {
        method: 'DELETE',
        token,
      })
    },
  },

  // 2. Jenis Aduan (cch_jenis_pengaduan)
  complaintTypes: {
    async list(token) {
      const res = await apiRequest('/api/v1/masters/complaint-types', { token })
      return unwrap(res)
    },
    async get(token, code) {
      return apiRequest(`/api/v1/masters/complaint-types/${code}`, { token })
    },
    async create(token, payload) {
      return apiRequest('/api/v1/masters/complaint-types', {
        method: 'POST',
        token,
        body: payload,
      })
    },
    async update(token, code, payload) {
      return apiRequest(`/api/v1/masters/complaint-types/${code}`, {
        method: 'PUT',
        token,
        body: payload,
      })
    },
    async delete(token, code) {
      return apiRequest(`/api/v1/masters/complaint-types/${code}`, {
        method: 'DELETE',
        token,
      })
    },
  },

  // 3. Jenis Layanan (cch_jenis_layanan)
  shippingServices: {
    async list(token) {
      const res = await apiRequest('/api/v1/masters/shipping-services', { token })
      return unwrap(res)
    },
    async get(token, code) {
      return apiRequest(`/api/v1/masters/shipping-services/${encodeURIComponent(code)}`, { token })
    },
    async create(token, payload) {
      return apiRequest('/api/v1/masters/shipping-services', {
        method: 'POST',
        token,
        body: payload,
      })
    },
    async update(token, code, payload) {
      return apiRequest(`/api/v1/masters/shipping-services/${encodeURIComponent(code)}`, {
        method: 'PUT',
        token,
        body: payload,
      })
    },
    async delete(token, code) {
      return apiRequest(`/api/v1/masters/shipping-services/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        token,
      })
    },
  },

  // 4. Jenis Dokumen (cch_jenis_dokumen)
  documentTypes: {
    async list(token) {
      const res = await apiRequest('/api/v1/masters/document-types', { token })
      return unwrap(res)
    },
    async get(token, code) {
      return apiRequest(`/api/v1/masters/document-types/${encodeURIComponent(code)}`, { token })
    },
    async create(token, payload) {
      return apiRequest('/api/v1/masters/document-types', {
        method: 'POST',
        token,
        body: payload,
      })
    },
    async update(token, code, payload) {
      return apiRequest(`/api/v1/masters/document-types/${encodeURIComponent(code)}`, {
        method: 'PUT',
        token,
        body: payload,
      })
    },
    async delete(token, code) {
      return apiRequest(`/api/v1/masters/document-types/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        token,
      })
    },
  },

  // 5. Status Penanganan (cch_jenis_penanganan)
  handlingStatuses: {
    async list(token) {
      const res = await apiRequest('/api/v1/masters/handling-statuses', { token })
      return unwrap(res)
    },
    async get(token, code) {
      return apiRequest(`/api/v1/masters/handling-statuses/${encodeURIComponent(code)}`, { token })
    },
    async create(token, payload) {
      return apiRequest('/api/v1/masters/handling-statuses', {
        method: 'POST',
        token,
        body: payload,
      })
    },
    async update(token, code, payload) {
      return apiRequest(`/api/v1/masters/handling-statuses/${encodeURIComponent(code)}`, {
        method: 'PUT',
        token,
        body: payload,
      })
    },
    async delete(token, code) {
      return apiRequest(`/api/v1/masters/handling-statuses/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        token,
      })
    },
  },

  // 6. Status Follow-Up (cchfust)
  followUpStatuses: {
    async list(token) {
      const res = await apiRequest('/api/v1/masters/follow-up-statuses', { token })
      return unwrap(res)
    },
    async get(token, code) {
      return apiRequest(`/api/v1/masters/follow-up-statuses/${encodeURIComponent(code)}`, { token })
    },
    async create(token, payload) {
      return apiRequest('/api/v1/masters/follow-up-statuses', {
        method: 'POST',
        token,
        body: payload,
      })
    },
    async update(token, code, payload) {
      return apiRequest(`/api/v1/masters/follow-up-statuses/${encodeURIComponent(code)}`, {
        method: 'PUT',
        token,
        body: payload,
      })
    },
    async delete(token, code) {
      return apiRequest(`/api/v1/masters/follow-up-statuses/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        token,
      })
    },
  },

  // 7. Sumber Aduan (cch_sumber_pengaduan)
  complaintSources: {
    async list(token) {
      const res = await apiRequest('/api/v1/masters/complaint-sources', { token })
      return unwrap(res)
    },
    async get(token, id) {
      return apiRequest(`/api/v1/masters/complaint-sources/${id}`, { token })
    },
    async create(token, payload) {
      return apiRequest('/api/v1/masters/complaint-sources', {
        method: 'POST',
        token,
        body: payload,
      })
    },
    async update(token, id, payload) {
      return apiRequest(`/api/v1/masters/complaint-sources/${id}`, {
        method: 'PUT',
        token,
        body: payload,
      })
    },
    async delete(token, id) {
      return apiRequest(`/api/v1/masters/complaint-sources/${id}`, {
        method: 'DELETE',
        token,
      })
    },
  },

  // 8. Master Kantor (cch_kantor)
  offices: {
    async list(token) {
      const res = await apiRequest('/api/v1/masters/offices', { token })
      return unwrap(res)
    },
    async getOptions(token) {
      return apiRequest('/api/v1/masters/offices/options', { token })
    },
    async get(token, code) {
      return apiRequest(`/api/v1/masters/offices/${encodeURIComponent(code)}`, { token })
    },
    async create(token, payload) {
      return apiRequest('/api/v1/masters/offices', {
        method: 'POST',
        token,
        body: payload,
      })
    },
    async update(token, code, payload) {
      return apiRequest(`/api/v1/masters/offices/${encodeURIComponent(code)}`, {
        method: 'PUT',
        token,
        body: payload,
      })
    },
    async delete(token, code) {
      return apiRequest(`/api/v1/masters/offices/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        token,
      })
    },
  },

  // 9. Zona Waktu (cch_timezone)
  timezones: {
    async list(token) {
      const res = await apiRequest('/api/v1/masters/timezones', { token })
      return unwrap(res)
    },
    async get(token, id) {
      return apiRequest(`/api/v1/masters/timezones/${id}`, { token })
    },
    async create(token, payload) {
      return apiRequest('/api/v1/masters/timezones', {
        method: 'POST',
        token,
        body: payload,
      })
    },
    async update(token, id, payload) {
      return apiRequest(`/api/v1/masters/timezones/${id}`, {
        method: 'PUT',
        token,
        body: payload,
      })
    },
    async delete(token, id) {
      return apiRequest(`/api/v1/masters/timezones/${id}`, {
        method: 'DELETE',
        token,
      })
    },
  },

  // 10. Katalog Bahasa (cch_languages)
  languages: {
    async list(token) {
      const res = await apiRequest('/api/v1/masters/languages', { token })
      return unwrap(res)
    },
    async get(token, code) {
      return apiRequest(`/api/v1/masters/languages/${encodeURIComponent(code)}`, { token })
    },
    async create(token, payload) {
      return apiRequest('/api/v1/masters/languages', {
        method: 'POST',
        token,
        body: payload,
      })
    },
    async update(token, code, payload) {
      return apiRequest(`/api/v1/masters/languages/${encodeURIComponent(code)}`, {
        method: 'PUT',
        token,
        body: payload,
      })
    },
    async delete(token, code) {
      return apiRequest(`/api/v1/masters/languages/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        token,
      })
    },
  },

  // 11. Kategori Bantuan (cch_help_categories)
  helpCategories: {
    async list(token) {
      const res = await apiRequest('/api/v1/masters/help-categories', { token })
      return unwrap(res)
    },
    async get(token, id) {
      return apiRequest(`/api/v1/masters/help-categories/${id}`, { token })
    },
    async create(token, payload) {
      return apiRequest('/api/v1/masters/help-categories', {
        method: 'POST',
        token,
        body: payload,
      })
    },
    async update(token, id, payload) {
      return apiRequest(`/api/v1/masters/help-categories/${id}`, {
        method: 'PUT',
        token,
        body: payload,
      })
    },
    async delete(token, id) {
      return apiRequest(`/api/v1/masters/help-categories/${id}`, {
        method: 'DELETE',
        token,
      })
    },
  },

  // 12. Pengumuman (cch_announcement)
  announcements: {
    async list(token, { limit = 100, offset = 0 } = {}) {
      const res = await apiRequest(`/api/v1/announcements?limit=${limit}&offset=${offset}`, { token })
      return unwrap(res)
    },
    async get(token, id) {
      return apiRequest(`/api/v1/announcements/${id}`, { token })
    },
    async create(token, payload) {
      return apiRequest('/api/v1/announcements', {
        method: 'POST',
        token,
        body: payload,
      })
    },
    async update(token, id, payload) {
      return apiRequest(`/api/v1/announcements/${id}`, {
        method: 'PUT',
        token,
        body: payload,
      })
    },
    async delete(token, id) {
      return apiRequest(`/api/v1/announcements/${id}`, {
        method: 'DELETE',
        token,
      })
    },
  },

  // 13. Pengaturan Sistem (cch_settings)
  appSettings: {
    async list(token) {
      const res = await apiRequest('/api/v1/app-settings', { token })
      return unwrap(res)
    },
    async get(token, id) {
      return apiRequest(`/api/v1/app-settings/${id}`, { token })
    },
    async update(token, id, payload) {
      return apiRequest(`/api/v1/app-settings/${id}`, {
        method: 'PUT',
        token,
        body: payload,
      })
    },
  },

  // 14. Breadcrumbs Navigasi (cch_breadcrumblinks)
  breadcrumbs: {
    async list(token, { limit = 100, offset = 0 } = {}) {
      const res = await apiRequest(`/api/v1/admin/breadcrumbs?limit=${limit}&offset=${offset}`, { token })
      return unwrap(res)
    },
    async get(token, title) {
      return apiRequest(`/api/v1/admin/breadcrumbs/${encodeURIComponent(title)}`, { token })
    },
    async create(token, payload) {
      return apiRequest('/api/v1/admin/breadcrumbs', {
        method: 'POST',
        token,
        body: payload,
      })
    },
    async delete(token, title) {
      return apiRequest(`/api/v1/admin/breadcrumbs/${encodeURIComponent(title)}`, {
        method: 'DELETE',
        token,
      })
    },
  },

  // 15. Kantor Regional / KP (cch_regional)
  regionalOffices: {
    async list(token, { limit = 100, offset = 0, q = '' } = {}) {
      const params = new URLSearchParams()
      if (limit) params.set('limit', limit)
      if (offset) params.set('offset', offset)
      if (q) params.set('q', q)
      const res = await apiRequest(`/api/v1/admin/regional-offices?${params.toString()}`, { token })
      return unwrap(res)
    },
    async get(token, code) {
      return apiRequest(`/api/v1/admin/regional-offices/${encodeURIComponent(code)}`, { token })
    },
    async options(token) {
      const res = await apiRequest('/api/v1/admin/regional-offices/options', { token })
      return unwrap(res)
    },
    async update(token, code, payload) {
      return apiRequest(`/api/v1/admin/regional-offices/${encodeURIComponent(code)}`, {
        method: 'PUT',
        token,
        body: payload,
      })
    },
  },

  // 16. Roster Petugas CS (cch_cs_officer)
  csOfficers: {
    async list(token, { limit = 100, offset = 0, q = '', regional = '', office = '', status = '' } = {}) {
      const params = new URLSearchParams()
      if (limit) params.set('limit', limit)
      if (offset) params.set('offset', offset)
      if (q) params.set('q', q)
      if (regional) params.set('regional', regional)
      if (office) params.set('office', office)
      if (status) params.set('status', status)
      const res = await apiRequest(`/api/v1/admin/cs-officers?${params.toString()}`, { token })
      return unwrap(res)
    },
    async get(token, username) {
      return apiRequest(`/api/v1/admin/cs-officers/${encodeURIComponent(username)}`, { token })
    },
  },
}
