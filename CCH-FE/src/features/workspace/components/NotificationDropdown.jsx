import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  Bot,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  PackageX,
  Radio,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react'
import { coreApi } from '../api/coreApi.js'

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState({
    unread_count: 0,
    total_count: 0,
    items: [],
    updated_at: '',
  })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('ALL') // ALL | P1 | OVERDUE | AI
  const panelRef = useRef(null)
  const navigate = useNavigate()

  // Load notifications
  const loadNotifications = async (isManual = false) => {
    try {
      if (isManual) setLoading(true)
      const res = await coreApi.getNotifications()
      setNotifications(res)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  // Initial load & Polling every 30 seconds for real-time reactivity
  useEffect(() => {
    loadNotifications()
    const interval = setInterval(() => {
      loadNotifications()
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await coreApi.markAllRead()
      setNotifications((prev) => ({
        ...prev,
        unread_count: 0,
        items: prev.items.map((i) => ({ ...i, is_read: true })),
      }))
    } catch (err) {
      console.error('Failed mark all read:', err)
    }
  }

  const handleItemClick = (item) => {
    setIsOpen(false)
    // Mark this item as read locally
    setNotifications((prev) => ({
      ...prev,
      unread_count: Math.max(0, prev.unread_count - (item.is_read ? 0 : 1)),
      items: prev.items.map((i) => (i.id === item.id ? { ...i, is_read: true } : i)),
    }))
    if (item.link) {
      navigate(item.link)
    }
  }

  // Filter items by category
  const filteredItems = (notifications.items || []).filter((item) => {
    if (activeTab === 'P1') return item.urgency === 'P1_KRITIS' || item.type === 'p1_kritis'
    if (activeTab === 'OVERDUE') return item.type === 'followup_overdue'
    if (activeTab === 'AI') return item.type === 'ai_intake'
    return true
  })

  return (
    <div ref={panelRef} className="relative">
      {/* Bell Button with Reactive Badge */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative rounded-xl p-2 text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        aria-label="Notifikasi Real-Time"
        title="Notifikasi Real-Time CCH"
      >
        <Bell size={18} className={notifications.unread_count > 0 ? 'text-slate-700 dark:text-slate-200' : ''} />

        {notifications.unread_count > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white shadow-xs animate-pulse ring-2 ring-white dark:ring-slate-900">
            {notifications.unread_count > 9 ? '9+' : notifications.unread_count}
          </span>
        ) : (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-900" />
        )}
      </button>

      {/* Floating Notifications Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 text-xs flex flex-col max-h-[85vh]">
          {/* Popover Header */}
          <div className="border-b border-slate-100 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                <Bell size={14} />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                  Notifikasi Real-Time CCH
                </h3>
                <p className="text-[10px] text-slate-400">
                  {notifications.unread_count} belum dibaca · update otomatis
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => loadNotifications(true)}
                disabled={loading}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                title="Perbarui sekarang"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin text-blue-600' : ''} />
              </button>

              {notifications.unread_count > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline px-1 py-0.5"
                >
                  <CheckCheck size={12} />
                  Tandai dibaca
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-100 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-900 overflow-x-auto text-[11px]">
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'P1', label: '🚨 P1 Kritis' },
              { id: 'OVERDUE', label: '⏰ Overdue' },
              { id: 'AI', label: '🤖 AI & Medsos' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-2 py-1 font-semibold transition shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification List Scrollable */}
          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 max-h-80">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500" />
                <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs">
                  Semua Beres!
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tidak ada notifikasi baru untuk kategori ini.
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 transition cursor-pointer flex items-start gap-3 ${
                    !item.is_read
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {/* Left Icon by Type */}
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                      item.type === 'p1_kritis'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                        : item.type === 'followup_overdue'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                        : item.type === 'gagal_xray'
                        ? 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                        : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {item.type === 'p1_kritis' && <ShieldAlert size={16} />}
                    {item.type === 'followup_overdue' && <AlertTriangle size={16} />}
                    {item.type === 'gagal_xray' && <PackageX size={16} />}
                    {item.type === 'ai_intake' && <Bot size={16} />}
                  </span>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">{item.time_ago}</span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.2 font-bold ${
                          item.urgency === 'P1_KRITIS'
                            ? 'bg-rose-600 text-white'
                            : item.urgency === 'P2_TINGGI'
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.category}
                      </span>

                      <span className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                        Buka Detail <ExternalLink size={10} />
                      </span>
                    </div>
                  </div>

                  {/* Unread indicator dot */}
                  {!item.is_read && (
                    <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Popover Footer Links */}
          <div className="border-t border-slate-100 dark:border-slate-800 p-3 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-[11px]">
            <Link
              to="/workspace/analytics/sentiment"
              onClick={() => setIsOpen(false)}
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <Sparkles size={12} />
              Analitik Sentimen AI
            </Link>

            <Link
              to="/workspace/ai/social-monitoring"
              onClick={() => setIsOpen(false)}
              className="font-semibold text-slate-600 dark:text-slate-400 hover:underline flex items-center gap-1"
            >
              <Radio size={12} />
              Monitoring Medsos
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

