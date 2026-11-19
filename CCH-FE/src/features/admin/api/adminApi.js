import { apiRequest } from '../../../shared/api/apiRequest.js'

/**
 * Administration read clients following the CCH-BE v1 contract.
 * Reference/catalog data only; office scope and ACL are revalidated server-side.
 * Responses come in two shapes: paged `{data: [...]}` and `{data, total, limit, offset}`.
 */
async function readList(path, token, params = {}) {
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

export const adminApi = {
  listUserLevels(token, { limit = 25, offset = 0 } = {}) {
    return readList('/api/v1/admin/user-levels', token, { limit, offset })
  },

  async getUserLevelPermissions(token, levelId) {
    const payload = await apiRequest(`/api/v1/admin/user-levels/${levelId}/permissions`, { token })
    return payload?.data ?? []
  },

  async updateUserLevelPermissions(token, levelId, permissions) {
    const payload = await apiRequest(`/api/v1/admin/user-levels/${levelId}/permissions`, {
      method: 'PUT',
      token,
      body: { permissions },
    })
    return payload?.data ?? []
  },


  listOffices(token, { limit = 25, offset = 0 } = {}) {
    return readList('/api/v1/masters/offices', token, { limit, offset })
  },

  listRegionalOffices(token, { limit = 25, offset = 0 } = {}) {
    return readList('/api/v1/admin/regional-offices', token, { limit, offset })
  },

  listCsOfficers(token, { limit = 25, offset = 0 } = {}) {
    return readList('/api/v1/admin/cs-officers', token, { limit, offset })
  },
}