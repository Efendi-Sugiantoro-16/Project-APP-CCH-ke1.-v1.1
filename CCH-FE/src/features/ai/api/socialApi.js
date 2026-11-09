/**
 * Social Media & Telegram AI Intake API Client
 * Berkomunikasi dengan microservice CCH-AI-ENGINE melalui Vite proxy /api/ai
 */

export const socialApi = {
  /**
   * Mengambil stream feed postingan / keluhan media sosial & Telegram terkini
   */
  async getFeed({ platform = 'ALL', urgency = 'ALL', hasTicket = null, limit = 50 } = {}) {
    const params = new URLSearchParams()
    if (platform && platform !== 'ALL') params.set('platform', platform)
    if (urgency && urgency !== 'ALL') params.set('urgency', urgency)
    if (hasTicket !== null) params.set('has_ticket', String(hasTicket))
    params.set('limit', String(limit))

    const res = await fetch(`/api/ai/api/v1/social/feed?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
      },
    })
    if (!res.ok) {
      throw new Error(`Gagal memuat feed medsos (${res.status} ${res.statusText})`)
    }
    return res.json()
  },

  /**
   * Ingest manual sebuah postingan medsos atau chat telegram
   */
  async ingestPost({
    platform,
    authorName,
    authorHandle,
    content,
    permalink = null,
    authorPhone = null,
    authorEmail = null,
    autoCreateTicket = true,
  }) {
    const res = await fetch('/api/ai/api/v1/social/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        platform,
        author_name: authorName,
        author_handle: authorHandle,
        content,
        permalink,
        author_phone: authorPhone,
        author_email: authorEmail,
        auto_create_ticket: autoCreateTicket,
      }),
    })
    if (!res.ok) {
      throw new Error(`Gagal memproses ingest medsos (${res.status})`)
    }
    return res.json()
  },

  /**
   * Mengambil status live Autonomous Agentic Scraping & Ingestion Worker
   */
  async getAgentStatus() {
    const res = await fetch('/api/ai/api/v1/social/agent/status', {
      headers: {
        'Accept': 'application/json',
      },
    })
    if (!res.ok) {
      throw new Error(`Gagal memuat status agentic worker (${res.status})`)
    }
    return res.json()
  },

  /**
   * Mengaktifkan / menonaktifkan Autonomous Agentic Scraping Worker
   */
  async toggleAgent(enable = null) {
    const params = new URLSearchParams()
    if (enable !== null) params.set('enable', String(enable))

    const res = await fetch(`/api/ai/api/v1/social/agent/toggle?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    })
    if (!res.ok) {
      throw new Error(`Gagal mengubah status agentic worker (${res.status})`)
    }
    return res.json()
  },

  /**
   * Memicu 1 siklus scraping dan triase kognitif seketika (on-demand)
   */
  async triggerPollNow() {
    const res = await fetch('/api/ai/api/v1/social/agent/poll-now', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    })
    if (!res.ok) {
      throw new Error(`Gagal memicu siklus agentic poll (${res.status})`)
    }
    return res.json()
  },
}

