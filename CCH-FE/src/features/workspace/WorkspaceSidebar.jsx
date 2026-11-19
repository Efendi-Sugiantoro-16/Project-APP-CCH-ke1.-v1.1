import { Link, NavLink } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { WORKSPACE_NAV } from './workspaceNav.js'

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
    isActive
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
  }`

export function WorkspaceSidebar({ onNavigate }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6" aria-label="Navigasi workspace">
      {WORKSPACE_NAV.map((group) => (
        <div key={group.label}>
          <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {group.label}
          </p>
          <div className="space-y-1.5">
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={onNavigate}>
                <item.icon size={18} className="w-5 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function SidebarFooter({ username = 'Staf Call Center', role = 'Call Center' }) {
  const initials = username.slice(0, 2).toUpperCase()
  return (
    <div className="border-t border-slate-800/50 p-4">
      <Link
        to="/workspace/profile"
        className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-slate-800/60"
        title="Lihat & Kelola Profil Saya"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-600 bg-slate-700 text-sm font-bold text-white transition group-hover:border-blue-500">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white transition group-hover:text-blue-400">{username}</p>
          <p className="flex items-center gap-1 text-xs text-blue-400">
            <ShieldCheck size={12} /> {role}
          </p>
        </div>
      </Link>
    </div>
  )
}