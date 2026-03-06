import type { Table } from '@tanstack/react-table'
import { Check, Download, X } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { toast } from 'sonner'
import { DataTableViewOptions } from '@/components/table/data-table-view-options'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useDebounce } from '@/hooks/use-debounce'
import { MIN_LOADING_DELAY } from '@/lib/constants'

function escapeCsvField(value: string) {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function buildCsv<TData>(
  table: Table<TData>,
  columnLabels: Record<string, string>,
) {
  const visibleColumns = table.getVisibleLeafColumns()
  const headers = visibleColumns.map((col) => columnLabels[col.id] ?? col.id)

  const rows = table.getSortedRowModel().rows.map((row) =>
    row.getVisibleCells().map((cell) => {
      const value = cell.getValue()
      if (value == null) return ''
      return String(value)
    }),
  )

  const csv = [
    headers.map(escapeCsvField).join(','),
    ...rows.map((row) => row.map(escapeCsvField).join(',')),
  ].join('\n')

  return { csv, rowCount: rows.length }
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

type DataTableToolbarProps<TData> = {
  table: Table<TData>
  searchPlaceholder?: string
  searchDebounceMs?: number
  exportFilename?: string
  columnLabels?: Record<string, string>
  children?: ReactNode
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder = 'Search...',
  searchDebounceMs = 200,
  exportFilename = 'export.csv',
  columnLabels,
  children,
}: DataTableToolbarProps<TData>) {
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'done'>(
    'idle',
  )
  const [inputValue, setInputValue] = useState(
    () => (table.getState().globalFilter as string) ?? '',
  )

  const debouncedSetFilter = useDebounce(
    (value: string) => table.setGlobalFilter(value),
    searchDebounceMs,
  )

  const handleChange = (value: string) => {
    setInputValue(value)
    debouncedSetFilter(value)
  }

  const isFiltered =
    table.getState().globalFilter || table.getState().columnFilters.length > 0

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder={searchPlaceholder}
          value={inputValue}
          onChange={(event) => handleChange(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {children}
        {isFiltered && (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 px-2 lg:px-3"
            onClick={() => {
              table.resetColumnFilters()
              table.setGlobalFilter('')
              setInputValue('')
            }}
          >
            Reset
            <X className="size-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={exportState !== 'idle'}
                onClick={async () => {
                  setExportState('exporting')
                  // Yield to let the spinner render before heavy work
                  await new Promise((r) => setTimeout(r, 0))
                  const start = Date.now()
                  const { csv, rowCount } = buildCsv(table, columnLabels ?? {})
                  const elapsed = Date.now() - start
                  const remaining = MIN_LOADING_DELAY - elapsed
                  if (remaining > 0) {
                    await new Promise((r) => setTimeout(r, remaining))
                  }
                  downloadCsv(csv, exportFilename)
                  toast.success(
                    `Exported ${rowCount.toLocaleString()} rows to CSV`,
                  )
                  setExportState('done')
                  await new Promise((r) => setTimeout(r, MIN_LOADING_DELAY))
                  setExportState('idle')
                }}
              />
            }
          >
            {exportState === 'exporting' && <Spinner />}
            {exportState === 'done' && <Check className="size-4" />}
            {exportState === 'idle' && <Download className="size-4" />}
            <span className="hidden lg:inline">
              {exportState === 'exporting'
                ? 'Exporting'
                : exportState === 'done'
                  ? 'Exported'
                  : 'Export'}
            </span>
          </TooltipTrigger>
          <TooltipContent>Export to CSV</TooltipContent>
        </Tooltip>
        <DataTableViewOptions table={table} columnLabels={columnLabels} />
      </div>
    </div>
  )
}
