import { apiRequest } from '../../../shared/api/apiRequest.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

/**
 * Create a new complaint
 * @param {Object} complaintData - The complaint data
 * @param {string} token - JWT authentication token
 * @returns {Promise<Object>} Created complaint result
 */
export async function createComplaint(complaintData, token) {
  return apiRequest(`/api/v1/create`, {
    method: 'POST',
    body: complaintData,
    token,
  })
}

/**
 * Update an existing complaint
 * @param {string} id - Complaint ID
 * @param {Object} complaintData - The updated complaint data
 * @param {string} token - JWT authentication token
 * @returns {Promise<Object>} Updated complaint result
 */
export async function updateComplaint(id, complaintData, token) {
  return apiRequest(`/api/v1/complaints/${id}`, {
    method: 'PUT',
    body: complaintData,
    token,
  })
}

/**
 * Fetch complaint types master data
 * @param {string} token - JWT authentication token
 * @returns {Promise<Array>} List of complaint types
 */
export async function fetchComplaintTypes(token) {
  return apiRequest(`/api/v1/masters/complaint-types`, {
    method: 'GET',
    token,
  })
}

/**
 * Fetch complaint sources master data
 * @param {string} token - JWT authentication token
 * @returns {Promise<Array>} List of complaint sources
 */
export async function fetchComplaintSources(token) {
  return apiRequest(`/api/v1/masters/complaint-sources`, {
    method: 'GET',
    token,
  })
}

/**
 * Fetch shipping services master data
 * @param {string} token - JWT authentication token
 * @returns {Promise<Array>} List of shipping services
 */
export async function fetchShippingServices(token) {
  return apiRequest(`/api/v1/masters/shipping-services`, {
    method: 'GET',
    token,
  })
}

/**
 * Fetch offices master data
 * @param {string} token - JWT authentication token
 * @returns {Promise<Array>} List of offices
 */
export async function fetchOffices(token) {
  return apiRequest(`/api/v1/masters/offices`, {
    method: 'GET',
    token,
  })
}

/**
 * Delete or cancel a complaint ticket
 * @param {string} id - Complaint ID
 * @param {string} token - JWT authentication token
 * @param {Object} options - { force: boolean, reason: string }
 * @returns {Promise<Object>} Delete result
 */
export async function deleteComplaint(id, token, { force = false, reason = '' } = {}) {
  const query = new URLSearchParams()
  if (force) query.set('force', 'true')
  if (reason) query.set('reason', reason)
  const queryString = query.toString() ? `?${query.toString()}` : ''

  return apiRequest(`${API_BASE}/api/v1/complaints/${encodeURIComponent(id)}${queryString}`, {
    method: 'DELETE',
    token,
  })
}

