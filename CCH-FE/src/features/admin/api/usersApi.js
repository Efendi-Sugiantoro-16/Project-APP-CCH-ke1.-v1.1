import { apiRequest } from '../../../shared/api/apiRequest.js'

/**
 * Users and Access Administration API client for CCH-BE v1.
 */
export const usersApi = {
  /**
   * List users with pagination, role filtering, office filtering, and text search.
   * Returns: { data: User[], total: number, limit: number, offset: number }
   */
  async listUsers(token, { q = '', office = '', level = '', limit = 25, offset = 0 } = {}) {
    const query = new URLSearchParams()
    if (q) query.set('q', q)
    if (office) query.set('office', office)
    if (level) query.set('level', level)
    query.set('limit', String(limit))
    query.set('offset', String(offset))

    return apiRequest(`/api/v1/admin/users?${query.toString()}`, { token })
  },

  /**
   * List all user levels/roles available in CCH.
   * Returns: UserLevel[]
   */
  async getUserLevels(token) {
    const res = await apiRequest('/api/v1/admin/users/levels', { token })
    if (Array.isArray(res)) return res
    return res?.data ?? []
  },

  /**
   * Get single user detail.
   * Returns: User
   */
  async getUser(token, username) {
    return apiRequest(`/api/v1/admin/users/${encodeURIComponent(username)}`, { token })
  },

  /**
   * Register a new user.
   */
  async createUser(token, data) {
    return apiRequest('/api/v1/admin/users', {
      method: 'POST',
      token,
      body: data,
    })
  },

  /**
   * Update existing user details.
   */
  async updateUser(token, username, data) {
    return apiRequest(`/api/v1/admin/users/${encodeURIComponent(username)}`, {
      method: 'PUT',
      token,
      body: data,
    })
  },

  /**
   * Reset user password with bcrypt hashing.
   */
  async resetPassword(token, username, newPassword) {
    return apiRequest(`/api/v1/admin/users/${encodeURIComponent(username)}/reset-password`, {
      method: 'POST',
      token,
      body: { new_password: newPassword },
    })
  },

  /**
   * Fetch office master catalog for office code dropdown.
   */
  async listOffices(token, { limit = 200 } = {}) {
    try {
      const res = await apiRequest(`/api/v1/masters/offices?limit=${limit}`, { token })
      if (Array.isArray(res)) return res
      return res?.data ?? []
    } catch {
      return []
    }
  },

  /**
   * Get authenticated user's own profile (cch_profil_pengguna).
   */
  async getProfile(token) {
    return apiRequest('/api/v1/users/profile', { token })
  },

  /**
   * Update authenticated user's own profile (cch_profil_pengguna).
   */
  async updateProfile(token, data) {
    return apiRequest('/api/v1/users/profile', {
      method: 'PUT',
      token,
      body: {
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
      },
    })
  },

  /**
   * Change authenticated user's own password with old password verification.
   */
  async changePassword(token, oldPassword, newPassword) {
    return apiRequest('/api/v1/users/profile/change-password', {
      method: 'POST',
      token,
      body: {
        old_password: oldPassword,
        new_password: newPassword,
      },
    })
  },
}
