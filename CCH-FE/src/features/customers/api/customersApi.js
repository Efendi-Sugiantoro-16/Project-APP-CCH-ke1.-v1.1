import { apiRequest } from '../../../shared/api/apiRequest.js'

/**
 * Customers API client for CCH-BE v1 (cchentricus).
 */
export const customersApi = {
  /**
   * Search customer profiles (Call Center search endpoint)
   * @param {string} token - JWT token
   * @param {string} q - Search term (min 3 chars)
   * @param {number} limit - Max results
   */
  async search(token, q, limit = 10) {
    const query = new URLSearchParams()
    if (q) query.set('q', q)
    if (limit) query.set('limit', String(limit))
    return apiRequest(`/api/v1/complaints/call-center/customers/search?${query.toString()}`, { token })
  },

  /**
   * Search / list customer profiles
   * @param {string} token - JWT token
   * @param {Object} params - { q, limit, offset }
   */
  async list(token, { q = '', limit = 10, offset = 0 } = {}) {
    const query = new URLSearchParams()
    if (q) query.set('q', q)
    query.set('limit', String(limit))
    query.set('offset', String(offset))
    return apiRequest(`/api/v1/customers?${query.toString()}`, { token })
  },

  /**
   * Quick-add customer profile (cchentricus addopt)
   * @param {string} token - JWT token
   * @param {Object} data - { full_name, email, phone, address }
   */
  async create(token, data) {
    return apiRequest('/api/v1/customers', {
      method: 'POST',
      token,
      body: {
        full_name: data.full_name || data.customerName,
        email: data.email || data.customerEmail || '',
        phone: data.phone || data.customerPhone,
        address: data.address || data.customerAddress || '',
      },
    })
  },

  /**
   * Get single customer by ID
   */
  async get(token, id) {
    return apiRequest(`/api/v1/customers/${encodeURIComponent(id)}`, { token })
  },
}
