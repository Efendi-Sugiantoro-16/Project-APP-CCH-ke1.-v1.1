import { apiRequest } from '../../../shared/api/apiRequest.js'

/**
 * Visitor Statistics API Client (cch_stats_* tables)
 */
export const statsApi = {
  /**
   * Get overall summary (total hits, unique visitors, today, month, year, browser/OS breakdowns).
   */
  async getSummary(token) {
    const res = await apiRequest('/api/v1/admin/stats/summary', { token })
    return res.data
  },

  /**
   * Get traffic trends by period (hourly, daily, monthly, yearly).
   */
  async getTrends(token, { period = 'daily', year, month, date } = {}) {
    const params = new URLSearchParams()
    if (period) params.set('period', period)
    if (year) params.set('year', String(year))
    if (month) params.set('month', String(month))
    if (date) params.set('date', String(date))

    const res = await apiRequest(`/api/v1/admin/stats/trends?${params.toString()}`, { token })
    return res.data
  },

  /**
   * Get paginated visitor IP log list with optional search.
   */
  async getVisitorLogs(token, { limit = 20, offset = 0, q = '' } = {}) {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    if (q) params.set('q', q)

    return apiRequest(`/api/v1/admin/stats/visitors?${params.toString()}`, { token })
  },

  /**
   * Public beacon to record a page hit.
   */
  async recordHit() {
    try {
      return await apiRequest('/api/v1/stats/hit', {
        method: 'POST',
      })
    } catch (err) {
      // Fire-and-forget; beacon failures shouldn't disrupt UI
      console.warn('Hit beacon failed:', err)
      return null
    }
  },
}
