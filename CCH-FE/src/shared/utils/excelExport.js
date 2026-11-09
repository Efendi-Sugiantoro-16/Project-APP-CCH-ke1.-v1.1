/**
 * Utility for exporting data to Microsoft Excel (.xls XML Spreadsheet 2003), CSV (UTF-8 BOM),
 * and Executive PDF / Print rendering.
 * Pure browser-based implementation without heavy third-party dependencies,
 * ensuring high performance, zero security scanner risk, and proper UTF-8 formatting.
 */

function escapeXml(value) {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function escapeCsvField(value) {
  if (value === null || value === undefined) return '""'
  const stringValue = String(value)
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return `"${stringValue}"`
}

function triggerDownload(blob, fullFilename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', fullFilename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Normalizes export arguments to support both:
 * 1. Modern options object: exportToExcel({ filename, sheetName, columns, data, title, subtitle })
 * 2. Positional legacy arguments: exportToExcel(dataArray, filename, sheetName)
 */
function normalizeExportArgs(optionsOrData, legacyFilename, legacySheetName) {
  if (Array.isArray(optionsOrData)) {
    const data = optionsOrData
    const filename = legacyFilename || 'laporan'
    const sheetName = legacySheetName || 'Laporan'
    let columns = []
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      columns = Object.keys(data[0]).map((key) => ({
        header: key,
        key: key,
      }))
    }
    return { filename, sheetName, columns, data }
  }

  const {
    filename = 'laporan',
    sheetName = 'Laporan',
    columns = [],
    data = [],
    title = '',
    subtitle = '',
  } = optionsOrData || {}

  let normalizedCols = columns
  if ((!normalizedCols || normalizedCols.length === 0) && data.length > 0) {
    normalizedCols = Object.keys(data[0] || {}).map((key) => ({
      header: key,
      key: key,
    }))
  }

  return { filename, sheetName, columns: normalizedCols, data, title, subtitle }
}

/**
 * Export data to XML Spreadsheet 2003 (.xls compatible with MS Excel, WPS, LibreOffice)
 * Supports POS IND executive title header, alternating row styling, and overdue alerts.
 */
export function exportToExcel(optionsOrData, legacyFilename, legacySheetName) {
  const { filename, sheetName, columns, data, title, subtitle } = normalizeExportArgs(
    optionsOrData,
    legacyFilename,
    legacySheetName
  )

  const safeSheetName = escapeXml((sheetName || 'Laporan').slice(0, 31))
  const reportTitle = title || 'PT POS INDONESIA (PERSERO) - SISTEM CUSTOMER COMPLAINT HANDLING (CCH)'
  const reportSubtitle = subtitle || `Laporan Operasional & Rekapitulasi SLA (${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })})`

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#1E293B"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="14" ss:Color="#EE2737" ss:Bold="1"/>
  </Style>
  <Style ss:ID="SubtitleStyle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9" ss:Color="#64748B" ss:Italic="1"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#EE2737" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataStyle">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="DataCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="DataOverdue">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECDD3"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9" ss:Color="#BE123C" ss:Bold="1"/>
   <Interior ss:Color="#FFE4E6" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="TotalStyle">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#94A3B8"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#94A3B8"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#0F172A" ss:Bold="1"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${safeSheetName}">
  <Table ss:DefaultRowHeight="20">`

  // Define Column Widths
  columns.forEach(() => {
    xml += `\n   <Column ss:AutoFitWidth="1" ss:Width="130"/>`
  })

  // Executive Title Banner
  xml += `\n   <Row ss:Height="26">`
  xml += `\n    <Cell ss:StyleID="TitleStyle"><Data ss:Type="String">${escapeXml(reportTitle)}</Data></Cell>`
  xml += `\n   </Row>`
  xml += `\n   <Row ss:Height="18">`
  xml += `\n    <Cell ss:StyleID="SubtitleStyle"><Data ss:Type="String">${escapeXml(reportSubtitle)}</Data></Cell>`
  xml += `\n   </Row>`
  xml += `\n   <Row ss:Height="8"/>`

  // Header Row
  xml += `\n   <Row ss:Height="26">`
  columns.forEach((col) => {
    xml += `\n    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(col.header)}</Data></Cell>`
  })
  xml += `\n   </Row>`

  // Data Rows
  data.forEach((row, rowIndex) => {
    const isTotalRow = String(row.no || '').toUpperCase() === 'TOTAL' || String(row.office_name || '').toUpperCase() === 'TOTAL'
    const isOverdue = !isTotalRow && (row.is_overdue || (row.duration_seconds && row.duration_seconds >= 345600))
    const styleId = isTotalRow ? 'TotalStyle' : isOverdue ? 'DataOverdue' : 'DataStyle'

    xml += `\n   <Row ss:Height="20">`
    columns.forEach((col) => {
      let rawVal = row[col.key]
      if (col.transform) {
        rawVal = col.transform(rawVal, row, rowIndex)
      } else if (col.key === 'no' && !isTotalRow) {
        rawVal = rowIndex + 1
      }

      const valStr = rawVal === null || rawVal === undefined ? '' : String(rawVal)
      const isNum = typeof rawVal === 'number' && !Number.isNaN(rawVal)

      xml += `\n    <Cell ss:StyleID="${styleId}"><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeXml(valStr)}</Data></Cell>`
    })
    xml += `\n   </Row>`
  })

  xml += `\n  </Table>
 </Worksheet>
</Workbook>`

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  triggerDownload(blob, `${filename}.xls`)
}

/**
 * Export data to CSV format with UTF-8 BOM
 * Supports dual signature (options object or positional arguments).
 */
export function exportToCsv(optionsOrData, legacyFilename) {
  const { filename, columns, data } = normalizeExportArgs(optionsOrData, legacyFilename)

  const headerLine = columns.map((col) => escapeCsvField(col.header)).join(',')

  const dataLines = data.map((row, rowIndex) => {
    return columns
      .map((col) => {
        let rawVal = row[col.key]
        if (col.transform) {
          rawVal = col.transform(rawVal, row, rowIndex)
        } else if (col.key === 'no' && String(row.no || '').toUpperCase() !== 'TOTAL') {
          rawVal = rowIndex + 1
        }
        return escapeCsvField(rawVal)
      })
      .join(',')
  })

  // UTF-8 BOM (\uFEFF) ensures Excel opens Indonesian characters without encoding problems
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `${filename}.csv`)
}

/**
 * Executive Print & PDF Generator
 * Renders an official PT Pos Indonesia formatted printable document and automatically
 * prompts window.print() (which enables saving to PDF with crisp vector formatting).
 *
 * @param {Object} options
 * @param {string} options.title - Document title (e.g., 'Rekapitulasi Penanganan Pengaduan')
 * @param {string} [options.subtitle] - Document subtitle / category
 * @param {Array<{ label: string, value: string }>} [options.metadata] - Header parameters (Periode, Regional, etc.)
 * @param {Array<{ label: string, value: string|number, tone?: string }>} [options.kpis] - Executive KPI cards
 * @param {Array<{ header: string, key: string, transform?: (val: any, row: any) => any }>} options.columns - Table columns
 * @param {Array<Object>} options.data - Data rows
 * @param {string} [options.notes] - Footer notes or remarks
 */
export function printExecutiveReport({
  title = 'Laporan Eksekutif Customer Complaint Handling (CCH)',
  subtitle = 'PT POS INDONESIA (PERSERO)',
  metadata = [],
  kpis = [],
  columns = [],
  data = [],
  notes = '',
}) {
  const printWindow = window.open('', '_blank', 'width=1100,height=850')
  if (!printWindow) {
    alert('Pop-up printer diblokir oleh browser. Harap izinkan pop-up untuk mencetak laporan.')
    return
  }

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const currentTimeStr = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Build Metadata HTML
  let metadataHtml = ''
  if (metadata.length > 0) {
    metadataHtml = `
      <div class="metadata-grid">
        ${metadata
          .map(
            (m) => `
          <div class="meta-item">
            <span class="meta-label">${escapeXml(m.label)}:</span>
            <span class="meta-val">${escapeXml(m.value || '-')}</span>
          </div>
        `
          )
          .join('')}
        <div class="meta-item">
          <span class="meta-label">Waktu Cetak:</span>
          <span class="meta-val">${currentDateStr}, ${currentTimeStr} WIB</span>
        </div>
      </div>
    `
  }

  // Build KPI Cards HTML
  let kpisHtml = ''
  if (kpis.length > 0) {
    kpisHtml = `
      <div class="kpi-grid">
        ${kpis
          .map(
            (k) => `
          <div class="kpi-card ${k.tone || 'default'}">
            <div class="kpi-val">${escapeXml(k.value)}</div>
            <div class="kpi-lbl">${escapeXml(k.label)}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `
  }

  // Build Table Header
  const theadHtml = `
    <thead>
      <tr>
        ${columns.map((c) => `<th>${escapeXml(c.header)}</th>`).join('')}
      </tr>
    </thead>
  `

  // Build Table Rows
  const tbodyHtml = `
    <tbody>
      ${data
        .map((row, rIdx) => {
          const isTotal = String(row.no || '').toUpperCase() === 'TOTAL' || String(row.office_name || '').toUpperCase() === 'TOTAL'
          const isOverdue = !isTotal && (row.is_overdue || (row.duration_seconds && row.duration_seconds >= 345600))
          const trClass = isTotal ? 'row-total' : isOverdue ? 'row-overdue' : rIdx % 2 === 1 ? 'row-alt' : ''

          const cells = columns
            .map((col) => {
              let val = row[col.key]
              if (col.transform) {
                val = col.transform(val, row, rIdx)
              } else if (col.key === 'no' && !isTotal) {
                val = rIdx + 1
              }
              const displayVal = val === null || val === undefined ? '' : String(val)
              return `<td>${escapeXml(displayVal)}</td>`
            })
            .join('')

          return `<tr class="${trClass}">${cells}</tr>`
        })
        .join('')}
    </tbody>
  `

  const docHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${escapeXml(title)} - Pos Indonesia CCH</title>
      <style>
        @page {
          size: landscape;
          margin: 10mm 12mm 12mm 12mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
          margin: 0;
          padding: 15px;
          color: #0f172a;
          background: #ffffff;
          font-size: 9pt;
          line-height: 1.35;
        }
        .header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2.5px solid #ee2737;
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        .brand-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-box {
          background: #ee2737;
          color: #ffffff;
          font-weight: 900;
          font-size: 14pt;
          padding: 6px 14px;
          border-radius: 6px;
          letter-spacing: 1px;
        }
        .title-box h1 {
          font-size: 13pt;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .title-box p {
          font-size: 8.5pt;
          color: #64748b;
          margin: 2px 0 0 0;
        }
        .badge-official {
          font-size: 7.5pt;
          font-weight: 700;
          color: #b91c1c;
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 12px;
          font-size: 8pt;
        }
        .meta-item {
          display: flex;
          gap: 4px;
        }
        .meta-label {
          color: #64748b;
          font-weight: 600;
        }
        .meta-val {
          color: #0f172a;
          font-weight: 700;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }
        .kpi-card {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 10px;
          text-align: center;
          background: #ffffff;
        }
        .kpi-card.brand {
          border-color: #fca5a5;
          background: #fff5f5;
        }
        .kpi-card.warning {
          border-color: #fde68a;
          background: #fffbeb;
        }
        .kpi-card.danger {
          border-color: #fecdd3;
          background: #fff1f2;
        }
        .kpi-card.success {
          border-color: #a7f3d0;
          background: #f0fdf4;
        }
        .kpi-val {
          font-size: 13pt;
          font-weight: 800;
          color: #0f172a;
        }
        .kpi-lbl {
          font-size: 7pt;
          font-weight: 600;
          text-transform: uppercase;
          color: #64748b;
          margin-top: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          page-break-inside: auto;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        thead {
          display: table-header-group;
        }
        th {
          background-color: #ee2737;
          color: #ffffff;
          font-weight: 700;
          text-align: center;
          padding: 6px 7px;
          font-size: 8pt;
          border: 1px solid #cbd5e1;
          letter-spacing: 0.3px;
        }
        td {
          padding: 5px 6px;
          border: 1px solid #e2e8f0;
          font-size: 7.8pt;
          color: #1e293b;
        }
        .row-alt {
          background-color: #f8fafc;
        }
        .row-overdue {
          background-color: #ffe4e6;
          color: #9f1239;
          font-weight: 600;
        }
        .row-total {
          background-color: #f1f5f9;
          font-weight: 800;
          border-top: 2px solid #94a3b8;
          border-bottom: 2px solid #94a3b8;
        }
        .signature-section {
          margin-top: 24px;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
          padding: 0 40px;
        }
        .sig-box {
          text-align: center;
          width: 220px;
        }
        .sig-space {
          height: 50px;
        }
        .sig-name {
          font-weight: 700;
          text-decoration: underline;
          color: #0f172a;
          font-size: 8.5pt;
        }
        .sig-role {
          font-size: 7.5pt;
          color: #64748b;
        }
        .footer-note {
          margin-top: 14px;
          border-top: 1px dashed #cbd5e1;
          padding-top: 6px;
          font-size: 7pt;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
        }
        .no-print {
          display: block;
          margin-bottom: 12px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          padding: 8px 12px;
          border-radius: 6px;
          text-align: center;
        }
        .btn-print {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 6px 14px;
          font-weight: 700;
          font-size: 8.5pt;
          border-radius: 4px;
          cursor: pointer;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print">
        <span style="color: #1e40af; font-size: 8.5pt; margin-right: 12px;">
          Dokumen Siap Dicetak / Disimpan ke PDF (Gunakan opsi "Save as PDF" di dialog browser).
        </span>
        <button class="btn-print" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
      </div>

      <div class="header-bar">
        <div class="brand-section">
          <div class="logo-box">POS INDONESIA</div>
          <div class="title-box">
            <h1>${escapeXml(title)}</h1>
            <p>${escapeXml(subtitle)} &bull; Sistem Customer Complaint Handling (CCH)</p>
          </div>
        </div>
        <div>
          <span class="badge-official">Dokumen Resmi Eksekutif</span>
        </div>
      </div>

      ${metadataHtml}
      ${kpisHtml}

      <table>
        ${theadHtml}
        ${tbodyHtml}
      </table>

      ${notes ? `<p style="font-size: 7.5pt; color: #64748b; margin-top: 6px;">Catatan: ${escapeXml(notes)}</p>` : ''}

      <div class="signature-section">
        <div class="sig-box">
          <div class="sig-role">Dibuat & Dikelola Oleh,</div>
          <div class="sig-space"></div>
          <div class="sig-name">Petugas Call Center / CS</div>
          <div class="sig-role">Customer Care Division</div>
        </div>
        <div class="sig-box">
          <div class="sig-role">Mengetahui & Menyetujui,</div>
          <div class="sig-space"></div>
          <div class="sig-name">Kepala Kantor / Manajer Pelayanan</div>
          <div class="sig-role">PT Pos Indonesia (Persero)</div>
        </div>
      </div>

      <div class="footer-note">
        <span>Sistem Customer Complaint Handling (CCH) Pos Indonesia</span>
        <span>Dicetak secara otomatis oleh sistem pada ${currentDateStr} ${currentTimeStr} WIB</span>
      </div>

      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print()
          }, 400)
        })
      </script>
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(docHtml)
  printWindow.document.close()
}
