import { Link } from 'react-router-dom'
import { ArrowRight, Building2, Package } from 'lucide-react'
import { StatusBadge } from './StatusBadge.jsx'
import { DataTable } from '../../../shared/ui/DataTable.jsx'
import { formatDateTime } from '../format.js'
import { complaintDetailPath } from '../complaintPath.js'

/**
 * Link to a ticket detail page.
 *
 * The route is derived from the ticket status (not from the list variant) so a
 * ticket that was closed from within an "open" list still links to the
 * completed detail route instead of returning 404.
 */
function TicketLink({ item, variant }) {
  const href = complaintDetailPath(item, { fallback: variant === 'closed' ? 'completed' : 'open' })
  return (
    <Link
      to={href}
      className="mono inline-flex items-center gap-1.5 font-semibold text-blue-600 transition hover:text-blue-700"
    >
      {item.id || item.complaint_id}
      <ArrowRight size={13} />
    </Link>
  )
}

/**
 * Complaint list table for the workspace. Supports the open/closed/derived
 * list variants; detail links point at the matching detail route.
 */
export function ComplaintTable({ items, variant = 'open', title }) {
  const columns = [
    {
      key: 'id',
      header: 'ID tiket',
      render: (item) => <TicketLink item={item} variant={variant} />,
    },
    {
      key: 'summary',
      header: 'Ringkasan',
      className: 'max-w-xs',
      render: (item) => <span className="line-clamp-2 text-slate-600">{item.summary || '—'}</span>,
    },
    {
      key: 'office',
      header: 'Asal → tujuan',
      render: (item) => {
        const origin = item.origin_office_code || item.origin_office_update_code
        const destination = item.destination_office_code || item.shipment_destination_office_code
        return (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-600">
            <Building2 size={14} className="text-slate-400" />
            {origin || '—'}
            {destination ? ` → ${destination}` : ''}
          </span>
        )
      },
    },
    {
      key: 'shipment',
      header: 'Kiriman',
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-600">
          <Package size={14} className="text-slate-400" />
          {item.shipment_number || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'text-center',
      render: (item) => (
        <div className="flex justify-center">
          <StatusBadge code={item.status_code || item.latest_status_code} />
        </div>
      ),
    },
    {
      key: 'since',
      header: 'Status sejak',
      render: (item) => (
        <span className="whitespace-nowrap text-xs text-slate-500">
          {formatDateTime(item.status_date || item.latest_status_at)}
        </span>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={items}
      rowKey={(item) => item.id || item.complaint_id}
      emptyMessage={`Tidak ada tiket ${title || 'untuk tampilan ini'}.`}
    />
  )
}