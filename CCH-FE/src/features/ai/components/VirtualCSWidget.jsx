import { useState, useRef, useEffect } from 'react'
import {
  Bot,
  Send,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ticket,
  ChevronRight,
  ShieldAlert,
  HeartHandshake
} from 'lucide-react'

export function VirtualCSWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Halo! Selamat datang di Layanan Pelanggan CS Virtual Pos Indonesia (Sahabat POS) 24 Jam Nonstop. Ada yang bisa kami bantu terkait kiriman paket Anda hari ini? Silakan sebutkan nomor resi Anda ya.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [latestSentiment, setLatestSentiment] = useState(null)
  const [createdTicket, setCreatedTicket] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, isMinimized])

  async function handleSendMessage(textToSend) {
    const text = (textToSend || inputMessage).trim()
    if (!text || loading) return

    const userMsg = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputMessage('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/api/v1/virtual-cs/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId || undefined,
          message: text,
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTP error: ${res.status}`)
      }

      const data = await res.json()
      if (data.session_id) {
        setSessionId(data.session_id)
      }
      if (data.sentiment) {
        setLatestSentiment(data.sentiment)
      }
      if (data.ticket) {
        setCreatedTicket(data.ticket)
      }

      const botMsg = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ticket: data.ticket,
        sentiment: data.sentiment,
        action: data.action_taken,
      }

      setMessages((prev) => [...prev, botMsg])
    } catch (err) {
      console.error('Virtual CS error:', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Mohon maaf, terjadi kendala saat menghubungi server AI. Namun sistem kami tetap mencatat pesan Anda. Silakan coba kembali dalam beberapa saat.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickPrompt = (prompt) => {
    handleSendMessage(prompt)
  }

  return (
    <aside aria-label="Layanan Pelanggan Virtual Pos Indonesia" className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Pill Launcher */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 rounded-full bg-gradient-to-r from-orange-600 to-blue-600 px-5 py-3.5 text-white shadow-xl shadow-orange-500/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/30 active:scale-95 cursor-pointer"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Bot size={20} className="animate-pulse" />
          </span>
          <div className="text-left">
            <div className="flex items-center gap-1.5 text-xs font-bold leading-tight">
              <span>CS Virtual Pos Indonesia</span>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="text-[10px] text-white/80">Asisten Cerdas 24/7</div>
          </div>
        </button>
      )}

      {/* Chat Window Drawer */}
      {isOpen && (
        <div
          className={`flex w-[92vw] max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 ${
            isMinimized ? 'h-16' : 'h-[620px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-4 py-3.5 text-white dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-600 shadow-md shadow-orange-500/30">
                <Bot size={22} className="text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border border-slate-900"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold tracking-tight">CS Virtual Pos Indonesia</h3>
                  <span className="rounded-md bg-orange-500/30 px-1.5 py-0.2 text-[9px] font-bold text-orange-300 border border-orange-400/30">
                    CS Virtual
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">Customer Service Virtual & Investigasi CCH</p>
              </div>
            </div>


            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
                title={isMinimized ? 'Perbesar' : 'Perkecil'}
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Sentiment & Urgency Banner (If Detected) */}
              {latestSentiment && (
                <div
                  className={`flex items-center justify-between border-b px-3.5 py-2 text-xs transition-colors ${
                    latestSentiment.urgency_level === 'P1_KRITIS'
                      ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'
                      : latestSentiment.urgency_level === 'P2_TINGGI'
                      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    {latestSentiment.urgency_level === 'P1_KRITIS' ? (
                      <ShieldAlert size={15} className="animate-pulse text-red-600" />
                    ) : (
                      <HeartHandshake size={15} />
                    )}
                    <span>
                      Urgensi: {latestSentiment.urgency_level} (Sentimen:{' '}
                      {latestSentiment.sentiment})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono opacity-80">
                    Skor: {latestSentiment.score}
                  </span>
                </div>
              )}

              {/* Chat Messages Body */}
              <div className="flex-1 space-y-4 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-950/50 text-xs">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Special Official CCH Ticket Card Render */}
                      {msg.ticket && (
                        <div className="mt-3 overflow-hidden rounded-xl border border-orange-200 bg-orange-50/70 p-3 text-slate-800 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-slate-200">
                          <div className="flex items-center justify-between border-b border-orange-200/60 pb-1.5 dark:border-orange-900/40">
                            <span className="flex items-center gap-1 font-bold text-orange-700 dark:text-orange-400">
                              <Ticket size={14} /> Tiket Resmi CCH
                            </span>
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400">
                              {msg.ticket.status_code}
                            </span>
                          </div>
                          <div className="mt-2 space-y-1 font-mono text-[11px]">
                            <div>
                              ID Tiket: <strong className="text-blue-600 dark:text-blue-400">{msg.ticket.ticket_id}</strong>
                            </div>
                            <div>
                              Kantor Tujuan: {msg.ticket.target_office_code} - {msg.ticket.target_office_name}
                            </div>
                            <div>
                              Target SLA: <strong>{msg.ticket.sla_hours} Jam</strong> ({msg.ticket.priority})
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="mt-1 px-1 font-mono text-[10px] text-slate-400">
                      {msg.timestamp}
                    </span>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800">
                      <Sparkles size={14} className="animate-spin text-orange-500" />
                    </div>
                    <span className="text-xs italic">CS Virtual sedang menganalisis & memeriksa sistem pos…</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts */}
              {messages.length <= 2 && (
                <div className="flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 bg-white p-2 text-[11px] dark:border-slate-800 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => handleQuickPrompt('Paket saya P2408290039578 obat darurat belum sampai!')}
                    className="whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                  >
                    📦 Cek Resi Obat Darurat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPrompt('Kiriman saya rusak dan pecah saat diterima')}
                    className="whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                  >
                    💔 Kiriman Rusak / Pecah
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPrompt('Apakah kiriman saya tertahan gagal X-ray bandara?')}
                    className="whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                  >
                    ✈️ Cek Gagal X-Ray
                  </button>
                </div>
              )}

              {/* Input Footer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }}
                className="flex items-center gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ketik pesan atau nomor resi kiriman Anda..."
                  disabled={loading}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 transition focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-orange-400"
                />
                <button
                  type="submit"
                  disabled={loading || !inputMessage.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-orange-600 to-blue-600 text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  title="Kirim Pesan"
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </aside>
  )
}

