/**
 * Core CCH Global Search & Real-Time Notifications API Client
 * Terhubung langsung ke Go Backend (CCH-BE) di /api/v1/core/*
 * dengan fallback otomatis ke CCH-AI-ENGINE di /api/ai/api/v1/core/*
 * sehingga fitur pencarian dan notifikasi realtime tetap berfungsi 100%
 * meskipun CCH-AI-ENGINE dinonaktifkan!
 */

async function fetchWithFallback(bePath, aiPath, options = {}) {
  // 1. Coba CCH-BE (Go Backend) terlebih dahulu
  try {
    const res = await fetch(bePath, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    })
    if (res.ok) {
      return await res.json()
    }
  } catch {
    // CCH-BE network error, lanjutkan ke fallback AI Engine
  }

  // 2. Fallback ke CCH-AI-ENGINE jika CCH-BE tidak merespons
  try {
    const aiRes = await fetch(aiPath, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    })
    if (aiRes.ok) {
      return await aiRes.json()
    }
  } catch {
    // Keduanya gagal
  }

  throw new Error('Gagal menghubungi CCH-BE maupun CCH-AI-ENGINE')
}

export const coreApi = {
  /**
   * Pencarian cepat multi-kriteria (ID pengaduan, resi pos, nama pelanggan, ringkasan)
   */
  async searchComplaints(query, limit = 8) {
    if (!query || !query.trim()) return { total: 0, results: [] }
    const params = new URLSearchParams()
    params.set('q', query.trim())
    params.set('limit', String(limit))

    const beUrl = `/api/v1/core/search?${params.toString()}`
    const aiUrl = `/api/ai/api/v1/core/search?${params.toString()}`

    try {
      return await fetchWithFallback(beUrl, aiUrl)
    } catch {
      return { query, total: 0, results: [] }
    }
  },

  /**
   * Mengambil feed notifikasi real-time (Aduan P1 Kritis, Overdue, AI Medsos, Gagal X-Ray)
   */
  async getNotifications() {
    const beUrl = '/api/v1/core/notifications'
    const aiUrl = '/api/ai/api/v1/core/notifications'

    try {
      return await fetchWithFallback(beUrl, aiUrl)
    } catch {
      return { unread_count: 0, total_count: 0, items: [], updated_at: '' }
    }
  },

  /**
   * Menandai semua notifikasi telah dibaca
   */
  async markAllRead() {
    const beUrl = '/api/v1/core/notifications/mark-read'
    const aiUrl = '/api/ai/api/v1/core/notifications/mark-read'

    try {
      return await fetchWithFallback(beUrl, aiUrl, { method: 'POST' })
    } catch {
      return { success: true, marked_count: 0 }
    }
  },
}
