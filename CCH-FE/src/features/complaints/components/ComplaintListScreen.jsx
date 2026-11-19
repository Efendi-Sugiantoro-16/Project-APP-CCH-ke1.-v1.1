import { useContext, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, FileSpreadsheet, Inbox, CheckCircle2, X } from 'lucide-react'
import { AuthContext } from '../../auth/auth-context.js'
import { PageHeader } from '../../../shared/ui/PageHeader.jsx'
import { Card } from '../../../shared/ui/Card.jsx'
import { Pagination } from '../../../shared/ui/Pagination.jsx'
import { StateBox } from '../../../shared/ui/StateBox.jsx'
import { ComplaintTable } from './ComplaintTable.jsx'
import { useWorkspaceApi } from '../useWorkspaceApi.js'
import { exportToExcel, exportToCsv } from '../../../shared/utils/excelExport.js'
import { formatDateTime } from '../format.js'

const PAGE_SIZE = 25

/**
 * Shared complaint list screen.
 *
 * One implementation backs the open / completed / received / sent list pages,
 * which differ only by their data source and copy. Keeping the layout here
 * avoids four near-identical files.
 */
export function ComplaintListScreen({ eyebrow, title, subtitle, loadPage, variant, emptyTitle }) {
  const { token } = useContext(AuthContext)
  const location = useLocation()
  const [notification, setNotification] = useState(location.state?.successMessage || '')
  const [offset, setOffset] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    if (location.state?.successMessage) {
      setNotification(location.state.successMessage)
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        setNotification('')
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [location.state])

  const { data, loading, error, refresh } = useWorkspaceApi(
    () => loadPage(token, { limit: PAGE_SIZE, offset }),
    [token, offset, loadPage],
  )
  const items = data || []

  // Export handlers
  const handleExportExcel = () => {
    if (!items || items.length === 0) return
    const exportData = items.map((item, idx) => ({
      No: idx + 1,
      'ID Tiket': item.id || item.complaint_id || '—',
      'Ringkasan Masalah': item.summary || '—',
      'Nomor Kiriman': item.shipment_number || '—',
      'Kantor Asal': item.origin_office_code || item.origin_office_update_code || '—',
      'Kantor Tujuan': item.destination_office_code || item.shipment_destination_office_code || '—',
      Status: item.status_code || item.latest_status_code || '—',
      'Waktu Status': formatDateTime(item.status_date || item.latest_status_at),
    }))
    const fileName = `${title ? title.toLowerCase().replace(/\s+/g, '_') : 'daftar_tiket'}_${new Date().toISOString().slice(0, 10)}`
    exportToExcel(exportData, fileName, title || 'Daftar Tiket')
  }

  const handleExportCsv = () => {
    if (!items || items.length === 0) return
    const exportData = items.map((item, idx) => ({
      No: idx + 1,
      'ID Tiket': item.id || item.complaint_id || '—',
      'Ringkasan Masalah': item.summary || '—',
      'Nomor Kiriman': item.shipment_number || '—',
      'Kantor Asal': item.origin_office_code || item.origin_office_update_code || '—',
      'Kantor Tujuan': item.destination_office_code || item.shipment_destination_office_code || '—',
      Status: item.status_code || item.latest_status_code || '—',
      'Waktu Status': formatDateTime(item.status_date || item.latest_status_at),
    }))
    const fileName = `${title ? title.toLowerCase().replace(/\s+/g, '_') : 'daftar_tiket'}_${new Date().toISOString().slice(0, 10)}`
    exportToCsv(exportData, fileName)
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            className="btn btn-secondary btn-sm gap-1.5 cursor-pointer disabled:opacity-50"
            disabled={items.length === 0}
            onClick={handleExportCsv}
            title="Ekspor tiket ke format CSV"
          >
            <Download size={14} /> CSV
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm gap-1.5 cursor-pointer disabled:opacity-50"
            disabled={items.length === 0}
            onClick={handleExportExcel}
            title="Ekspor tiket ke format Excel (.xlsx)"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
        </div>
      </div>

      {/* Pop-up Notification / Success Banner */}
      {notification && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-200/80 bg-emerald-50/95 dark:bg-emerald-950/40 dark:border-emerald-800/60 p-4 text-xs sm:text-sm text-emerald-900 dark:text-emerald-100 shadow-md animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm ring-4 ring-emerald-100 dark:ring-emerald-900/50">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                Pemberitahuan Sistem
              </p>
              <p className="text-emerald-800 dark:text-emerald-300 text-xs mt-0.5 leading-relaxed font-medium">
                {notification}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotification('')}
            className="p-1.5 rounded-xl text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition cursor-pointer"
            title="Tutup pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Card>
        <StateBox
          loading={loading}
          error={error}
          loadingLabel="Memuat tiket…"
          isEmpty={!loading && items.length === 0}
          empty={
            <div className="state-box border-0 shadow-none">
              <Inbox size={26} className="text-slate-400" />
              <strong className="text-slate-700">{emptyTitle}</strong>
              <span className="text-sm">Tiket akan tampil di sini sesuai scope kantor Anda.</span>
            </div>
          }
        >
          <ComplaintTable items={items} variant={variant} title={title} />
          <Pagination
            offset={offset}
            count={items.length}
            perPage={PAGE_SIZE}
            loading={loading}
            onPage={setOffset}
          />
        </StateBox>
      </Card>
    </div>
  )
}
