import {
  BarChart3,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Database,
  FileSpreadsheet,
  Inbox,
  Layers,
  LayoutDashboard,
  PackageX,
  Send,
  Share2,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react'

/** Workspace navigation model. Grouped like the reference design. */
export const WORKSPACE_NAV = [
  {
    label: 'Monitoring',
    items: [
      { to: '/workspace', end: true, icon: LayoutDashboard, label: 'Dasbor' },
      { to: '/workspace/ai/social-monitoring', icon: Share2, label: 'Monitoring Medsos & TG' },
      { to: '/workspace/complaints/open', icon: Inbox, label: 'Tiket Terbuka' },
      { to: '/workspace/complaints/received-open', icon: Building2, label: 'Diterima' },
      { to: '/workspace/complaints/sent-open', icon: Send, label: 'Dikirim' },
      { to: '/workspace/complaints/completed', icon: CheckCircle2, label: 'Selesai' },
      { to: '/workspace/complaints/status-list', icon: Layers, label: 'Daftar Status SLA' },
      { to: '/workspace/follow-ups', icon: CalendarCheck, label: 'Follow Up' },
      { to: '/workspace/gagal-xray', icon: PackageX, label: 'Kiriman Gagal X-Ray' },
      { to: '/workspace/profile', icon: Users, label: 'Profil Saya' },
    ],
  },
  {
    label: 'Laporan & Rekap',
    items: [
      { to: '/workspace/reports/office-summary', icon: Building2, label: 'Rekap Per Kantor Pos' },
      { to: '/workspace/reports/received-unresponded', icon: FileSpreadsheet, label: 'Terima Belum Respon' },
      { to: '/workspace/reports/sent-unresponded', icon: FileSpreadsheet, label: 'Kirim Belum Respon' },
      { to: '/workspace/reports/breakdown', icon: Layers, label: 'Rekap & Rincian Per Jenis' },
      { to: '/workspace/reports/duration', icon: Clock, label: 'Rekap & Rincian Durasi (SLA)' },
      { to: '/workspace/stats/visitors', icon: BarChart3, label: 'Statistik Pengunjung' },
      { to: '/workspace/analytics/sentiment', icon: Sparkles, label: 'Analitik Sentimen AI' },
      { to: '/workspace/ai/social-monitoring', icon: Share2, label: 'Monitoring Medsos & TG' },
    ],
  },
  {
    label: 'Administrator',
    items: [
      { to: '/admin/users', icon: Users, label: 'Kelola Pengguna' },
      { to: '/admin/user-levels', icon: Shield, label: 'Katalog Role' },
      { to: '/admin/masters', icon: Database, label: 'Master Data Studio' },
      { to: '/workspace/stats/visitors', icon: BarChart3, label: 'Statistik Pengunjung' },
      { to: '/workspace/analytics/sentiment', icon: Sparkles, label: 'Analitik Sentimen AI' },
      { to: '/workspace/ai/social-monitoring', icon: Share2, label: 'Monitoring Medsos & TG' },
    ],
  },
]
