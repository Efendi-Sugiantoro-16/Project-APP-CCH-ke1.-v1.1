import { apiRequest } from '../../../shared/api/apiRequest.js'

/**
 * Kiriman Gagal X-Ray API client for CCH-BE v1.
 */
export const gagalXrayApi = {
  /**
   * List kiriman gagal X-ray with filtering and pagination.
   * Returns: { items: KirimanGagalXray[], total: number, limit: number, offset: number }
   */
  async list(token, {
    q = '',
    kantor_asal = '',
    kantor_tujuan = '',
    kantor_penerbangan = '',
    keterangan = '',
    start_date = '',
    end_date = '',
    limit = 25,
    offset = 0,
  } = {}) {
    const query = new URLSearchParams()
    if (q) query.set('q', q)
    if (kantor_asal) query.set('kantor_asal', kantor_asal)
    if (kantor_tujuan) query.set('kantor_tujuan', kantor_tujuan)
    if (kantor_penerbangan) query.set('kantor_penerbangan', kantor_penerbangan)
    if (keterangan) query.set('keterangan', keterangan)
    if (start_date) query.set('start_date', start_date)
    if (end_date) query.set('end_date', end_date)
    query.set('limit', String(limit))
    query.set('offset', String(offset))

    return apiRequest(`/api/v1/gagal-xray?${query.toString()}`, { token })
  },

  /**
   * Get aggregated stats for dashboard counters.
   * Returns: { total_records, darat_laut_count, retour_count, disita_count, freighter_count }
   */
  async getStats(token) {
    return apiRequest('/api/v1/gagal-xray/stats', { token })
  },

  /**
   * Get detail of single kiriman gagal X-ray.
   */
  async get(token, asal, tujuan, id, kantong) {
    return apiRequest(
      `/api/v1/gagal-xray/${encodeURIComponent(asal)}/${encodeURIComponent(tujuan)}/${encodeURIComponent(id)}/${encodeURIComponent(kantong)}`,
      { token },
    )
  },

  /**
   * Create new kiriman gagal X-ray record.
   */
  async create(token, data) {
    return apiRequest('/api/v1/gagal-xray', {
      method: 'POST',
      token,
      body: data,
    })
  },

  /**
   * Update existing kiriman gagal X-ray record.
   */
  async update(token, asal, tujuan, id, kantong, data) {
    return apiRequest(
      `/api/v1/gagal-xray/${encodeURIComponent(asal)}/${encodeURIComponent(tujuan)}/${encodeURIComponent(id)}/${encodeURIComponent(kantong)}`,
      {
        method: 'PUT',
        token,
        body: data,
      },
    )
  },

  /**
   * Delete kiriman gagal X-ray record.
   */
  async delete(token, asal, tujuan, id, kantong) {
    return apiRequest(
      `/api/v1/gagal-xray/${encodeURIComponent(asal)}/${encodeURIComponent(tujuan)}/${encodeURIComponent(id)}/${encodeURIComponent(kantong)}`,
      {
        method: 'DELETE',
        token,
      },
    )
  },
}
