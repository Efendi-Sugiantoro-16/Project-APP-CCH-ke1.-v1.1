import { useContext, useState } from 'react'
import { Download, FileSpreadsheet, Inbox } from 'lucide-react'
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
  const [offset, setOffset] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const { data, loading, error } = useWorkspaceApi(
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