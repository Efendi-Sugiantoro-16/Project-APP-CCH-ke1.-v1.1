/**
 * CS Virtual AI API Client
 * Berkomunikasi dengan microservice CCH-AI-ENGINE melalui Vite proxy /api/ai
 */

export const virtualCsApi = {
  /**
   * Mengambil data metrik dasbor analitik sentimen, urgensi SLA, CSAT,
   * sebaran regional Pos Indonesia, dan log aktivitas real-time CS Virtual AI.
   */
  async getSentimentAnalytics() {
    const res = await fetch('/api/ai/api/v1/virtual-cs/analytics/sentiment-stats', {
      headers: {
        'Accept': 'application/json',
      },
    })
    if (!res.ok) {
      throw new Error(`Gagal memuat analitik sentimen (${res.status} ${res.statusText})`)
    }
    return res.json()
  },

  /**
   * Mengirim pesan interaktif ke CS Virtual Agent (Agentic AI)
   */
  async chat({ sessionId, message, history = [], customerName, customerPhone }) {
    const res = await fetch('/api/ai/api/v1/virtual-cs/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId || null,
        message,
        history,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
      }),
    })
    if (!res.ok) {
      throw new Error(`Gagal berkomunikasi dengan CS Virtual AI (${res.status})`)
    }
    return res.json()
  },

  /**
   * Analisis teks mandiri (sentimen, emosi, urgensi, entitas resi pos)
   */
  async analyzeText(text) {
    const res = await fetch('/api/ai/api/v1/virtual-cs/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      throw new Error(`Gagal menganalisis teks (${res.status})`)
    }
    return res.json()
  },

  /**
   * Cek status kiriman / deteksi gagal x-ray
   */
  async trackShipment(shipmentNumber) {
    const res = await fetch(`/api/ai/api/v1/virtual-cs/track/${encodeURIComponent(shipmentNumber)}`, {
      headers: {
        'Accept': 'application/json',
      },
    })
    if (!res.ok) {
      throw new Error(`Gagal melacak nomor kiriman (${res.status})`)
    }
    return res.json()
  },

  /**
   * CS Virtual Copilot: Auto-Klasifikasi Cerdas & Ekstraksi Entitas
   */
  async copilotClassify(text) {
    const res = await fetch('/api/ai/api/v1/virtual-cs/copilot/classify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      throw new Error(`Gagal melakukan klasifikasi copilot (${res.status})`)
    }
    return res.json()
  },

  /**
   * CS Virtual Copilot: Rekomendasi Draf Tanggapan & Investigasi
   */
  async copilotSuggestResponse(payload) {
    const res = await fetch('/api/ai/api/v1/virtual-cs/copilot/suggest-response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      throw new Error(`Gagal menyusun rekomendasi balasan copilot (${res.status})`)
    }
    return res.json()
  },
}


