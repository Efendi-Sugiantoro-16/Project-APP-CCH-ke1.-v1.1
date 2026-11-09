import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

/**
 * Enterprise Offset-based & Page-based Pagination Component.
 * Supports page size selector ("filter baris"), direct first/last page jumping,
 * and seamless light/dark theme adaptation.
 */
export function Pagination({
  offset = 0,
  count = 0,
  total,
  totalCount,
  perPage = 25,
  limit,
  pageSize,
  loading = false,
  onPage,
  onChange,
  onPageChange,
  pageSizeOptions = [10, 25, 50, 100],
  onPerPageChange,
  onPageSizeChange,
  label = 'baris',
}) {
  const actualPerPage = limit || pageSize || perPage || 25
  const handlePageChange = onPage || onChange || onPageChange
  const handleSizeChange = onPerPageChange || onPageSizeChange

  const effectiveTotal = total ?? totalCount ?? (count > actualPerPage ? count : undefined)
  const currentItemsCount =
    count > 0
      ? effectiveTotal && count > actualPerPage
        ? Math.min(count - offset, actualPerPage)
        : count
      : 0

  if (loading || (count === 0 && !effectiveTotal)) return null

  const currentPage = Math.floor(offset / actualPerPage) + 1
  const totalPages = effectiveTotal ? Math.max(1, Math.ceil(effectiveTotal / actualPerPage)) : undefined

  const hasPrevious = offset > 0
  const hasNext = effectiveTotal
    ? offset + actualPerPage < effectiveTotal
    : count === actualPerPage

  const startItem = offset + 1
  const endItem = effectiveTotal
    ? Math.min(offset + actualPerPage, effectiveTotal)
    : offset + currentItemsCount

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 select-none">
      {/* Left: Info & Rows Per Page Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Menampilkan <strong className="font-semibold text-slate-700 dark:text-slate-200">{startItem}–{endItem}</strong>
          {effectiveTotal !== undefined ? (
            <> dari <strong className="font-semibold text-slate-800 dark:text-slate-100">{effectiveTotal.toLocaleString('id-ID')}</strong> {label}</>
          ) : (
            <> · {currentItemsCount} {label}</>
          )}
        </span>

        {/* Rows Per Page Selector ("Filter Baris") */}
        {handleSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Tampilkan:</span>
            <select
              value={actualPerPage}
              onChange={(e) => handleSizeChange(Number(e.target.value))}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} baris
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation */}
      <div className="flex items-center gap-1.5">
        {/* First Page Button (<<) */}
        {totalPages && totalPages > 2 && (
          <button
            type="button"
            disabled={!hasPrevious}
            onClick={() => handlePageChange && handlePageChange(0)}
            title="Halaman Pertama"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm cursor-pointer"
          >
            <ChevronsLeft size={14} />
          </button>
        )}

        {/* Previous Button (<) */}
        <button
          type="button"
          disabled={!hasPrevious}
          onClick={() => handlePageChange && handlePageChange(Math.max(0, offset - actualPerPage))}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm cursor-pointer"
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Sebelumnya</span>
        </button>

        {/* Page Indicator */}
        <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold font-mono text-xs">
          Hal {currentPage}{totalPages ? ` dari ${totalPages.toLocaleString('id-ID')}` : ''}
        </div>

        {/* Next Button (>) */}
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => handlePageChange && handlePageChange(offset + actualPerPage)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm cursor-pointer"
        >
          <span className="hidden sm:inline">Berikutnya</span>
          <ChevronRight size={14} />
        </button>

        {/* Last Page Button (>>) */}
        {totalPages && totalPages > 2 && (
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => handlePageChange && handlePageChange((totalPages - 1) * actualPerPage)}
            title="Halaman Terakhir"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm cursor-pointer"
          >
            <ChevronsRight size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
