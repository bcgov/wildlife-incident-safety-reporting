import type { Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  totalRows: number
  onPageSizeChange?: (size: number) => void
}

export function DataTablePagination<TData>({
  table,
  totalRows,
  onPageSizeChange,
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()
  const start = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, totalRows)

  return (
    <div className="flex items-center justify-between gap-4 px-2 py-2">
      {/* Left: page size selector */}
      <div className="flex items-center gap-2">
        <Select
          value={`${pageSize}`}
          onValueChange={(value) => {
            const size = Number(value)
            table.setPageSize(size)
            onPageSizeChange?.(size)
          }}
        >
          <SelectTrigger size="sm" className="w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="top">
            {[10, 20, 30, 50].map((size) => (
              <SelectItem key={size} value={`${size}`}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-sm hidden sm:inline">
          per page
        </span>
      </div>

      {/* Center: showing info */}
      <div className="text-muted-foreground text-sm tabular-nums">
        <span className="hidden md:inline">
          Showing {start}-{end} of {totalRows.toLocaleString()}
        </span>
        <span className="md:hidden">
          Page {pageIndex + 1} of {pageCount}
        </span>
      </div>

      {/* Right: prev / next */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="size-4 md:hidden" />
          <span className="hidden md:inline">Previous</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <span className="hidden md:inline">Next</span>
          <ChevronRight className="size-4 md:hidden" />
        </Button>
      </div>
    </div>
  )
}
