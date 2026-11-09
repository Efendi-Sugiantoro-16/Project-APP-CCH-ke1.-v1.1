import { useState } from 'react'
import {
  Building2,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  User,
  Copy,
  Check,
  MessageCircle,
  ArrowRight,
  Clock,
  ShieldCheck,
  Tag,
  ExternalLink,
} from 'lucide-react'
import { StatusBadge } from './StatusBadge.jsx'
import { EditComplaintModal } from './EditComplaintModal.jsx'
import { Card } from '../../../shared/ui/Card.jsx'
import { formatDateTime } from '../format.js'

function Field({ icon: Icon, label, value, action }) {
  return (
    <div className="flex items-start gap-3">
      {Icon ? (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon size={15} />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="break-words text-sm font-semibold text-slate-800">{value || '—'}</p>
          {action}
        </div>
      </div>
    </div>
  )
}

/** Read-only ticket header + customer/shipment detail card with edit capability. */
export function ComplaintInfoPanel({ detail, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false)
  const [copiedResi, setCopiedResi] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)

  if (!detail) return null

  const isClosed = detail.status_code === '109'

  // Format phone to international WhatsApp link
  const cleanPhone = detail.customer_phone ? detail.customer_phone.replace(/\D/g, '') : ''
  const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=Halo%20Bapak%2FIbu%20${encodeURIComponent(detail.customer_name || 'Pelanggan')}%2C%20kami%20dari%20Customer%20Care%20Pos%20Indonesia%20terkait%20pengaduan%20nomor%20${encodeURIComponent(detail.id)}...` : null

  const handleCopyResi = () => {
    if (detail.shipment_number) {
      navigator.clipboard.writeText(detail.shipment_number)
      setCopiedResi(true)
      setTimeout(() => setCopiedResi(false), 2000)
    }
  }

  const handleCopyPhone = () => {
    if (detail.customer_phone) {
      navigator.clipboard.writeText(detail.customer_phone)
      setCopiedPhone(true)
      setTimeout(() => setCopiedPhone(false), 2000)
    }
  }

  return (
    <Card className="p-5 sm:p-6 shadow-sm border border-slate-200/90 rounded-2xl bg-white">
      {/* Top Header Card: Ticket ID & Actions */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              ID Tiket Pengaduan CCH
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              Pos Indonesia
            </span>
          </div>
          <h3 className="font-mono text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight mt-1">
            {detail.id}
          </h3>
        </div>

        <div className="flex items-center gap-2.5">
          {!isClosed && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
            >
              <Pencil size={13} className="text-blue-500" />
              <span>Ubah Data</span>
            </button>
          )}
          <StatusBadge code={detail.status_code} label={detail.status_description} />
        </div>
      </div>

      {/* Visual Disposisi & Routing Bar */}
      <div className="mb-5 p-3 rounded-xl bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/20 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-semibold text-slate-700">Rute Disposisi:</span>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs">
              {detail.origin_office_code || '—'}
            </span>
            <span className="text-[10px] text-slate-400">Asal</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-blue-600 text-white shadow-2xs">
              {detail.destination_office_code || '—'}
            </span>
            <span className="text-[10px] text-blue-700 font-semibold">Tujuan Investigasi</span>
          </div>
        </div>

        {detail.copy_office_codes && (
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="text-slate-300">•</span>
            <span className="text-[11px]">Tembusan: <strong>{detail.copy_office_codes}</strong></span>
          </div>
        )}
      </div>

      {/* Grid Fields Information */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field icon={User} label="Nama Pelanggan" value={detail.customer_name} />

        <Field
          icon={Phone}
          label="Nomor Telepon"
          value={detail.customer_phone}
          action={
            detail.customer_phone ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  title="Salin Nomor HP"
                >
                  {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[10px] font-semibold transition"
                    title="Buka Chat WhatsApp"
                  >
                    <MessageCircle className="w-3 h-3 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            ) : null
          }
        />

        <Field
          icon={Mail}
          label="Alamat Email"
          value={detail.customer_email}
          action={
            detail.customer_email ? (
              <a
                href={`mailto:${detail.customer_email}`}
                className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                title="Kirim Email"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : null
          }
        />

        <Field icon={MapPin} label="Alamat Domisili" value={detail.customer_address} />

        <Field
          icon={Package}
          label="Nomor Resi / Kiriman"
          value={detail.shipment_number}
          action={
            detail.shipment_number ? (
              <button
                type="button"
                onClick={handleCopyResi}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-[10px] font-semibold transition cursor-pointer"
                title="Salin Nomor Resi"
              >
                {copiedResi ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            ) : null
          }
        />

        <Field
          icon={Tag}
          label="Klasifikasi Pengaduan"
          value={
            detail.complaint_type_code
              ? `Kategori ${detail.complaint_type_code} (Kanal ${detail.complaint_source_code || '—'})`
              : '—'
          }
        />
      </div>

      {/* Summary & Description Section */}
      <div className="mt-6 border-t border-slate-100 pt-5">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
          Ringkasan & Pokok Masalah
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-800 leading-snug">
          {detail.summary || 'Tidak ada ringkasan.'}
        </p>

        {detail.description ? (
          <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
            {detail.description}
          </div>
        ) : null}
      </div>

      {/* Footer Timestamp & SLA Status */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Status sejak {formatDateTime(detail.status_date)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Update kantor {detail.status_office_code || '—'}</span>
        </span>
      </div>

      <EditComplaintModal
        detail={detail}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onUpdated={onUpdated}
      />
    </Card>
  )
}
