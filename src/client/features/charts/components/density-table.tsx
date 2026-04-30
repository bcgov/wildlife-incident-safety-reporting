import type {
  ColumnDef,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Crosshair } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DataTableColumnHeader } from '@/components/table/data-table-column-header'
import { DataTablePagination } from '@/components/table/data-table-pagination'
import { DataTableToolbar } from '@/components/table/data-table-toolbar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ColumnConfig } from '@/components/ui/table-skeleton'
import { TableRowsSkeleton } from '@/components/ui/table-skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { DensityMode } from '@/features/map/store/layer-store'
import { useLayerStore } from '@/features/map/store/layer-store'
import type { DensitySegment } from '@/lib/density-api'
import { useSegmentLocateStore } from '@/stores/segment-locate-store'
import { useTabStore } from '@/stores/tab-store'

type DensityRow = DensitySegment & {
  rawDensityPerKm: number | null
}

const nullCell = <span className="text-muted-foreground">-</span>

function buildSearchIndex(rows: DensityRow[], keys: string[]) {
  const index = new Map<number, string>()
  for (const row of rows) {
    const record = row as Record<string, unknown>
    index.set(
      row.segmentId,
      keys
        .map((key) => record[key])
        .filter((v) => v != null)
        .map(String)
        .join('\0')
        .toLowerCase(),
    )
  }
  return index
}

function locateColumn(densityMode: DensityMode): ColumnDef<DensityRow> {
  return {
    id: 'locate',
    enableSorting: false,
    enableHiding: false,
    header: () => <span className="sr-only">Locate</span>,
    cell: ({ row }) => (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="gold"
              size="icon"
              className="size-7"
              onClick={() => {
                const segment = row.original
                useSegmentLocateStore.getState().locate({
                  segmentId: segment.segmentId,
                  segmentName: segment.segmentName,
                  geometry: segment.geometry,
                })
                useLayerStore.getState().setLayerVisible('density', true)
                useLayerStore.getState().setDensityMode(densityMode)
                useTabStore.getState().setActiveTab('map')
              }}
            />
          }
        >
          <Crosshair className="size-4" />
        </TooltipTrigger>
        <TooltipContent>Locate on map</TooltipContent>
      </Tooltip>
    ),
  }
}

const dataColumns: ColumnDef<DensityRow>[] = [
  {
    accessorKey: 'segmentName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Segment" />
    ),
    cell: ({ getValue }) => (
      <span className="font-medium">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'highwayNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Highway" />
    ),
    cell: ({ getValue }) => getValue<string | null>() ?? nullCell,
  },
  {
    accessorKey: 'segmentLengthKm',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Length (km)" />
    ),
    cell: ({ getValue }) => {
      const v = getValue<number | null>()
      return v != null ? (
        <span className="tabular-nums">{v.toFixed(1)}</span>
      ) : (
        nullCell
      )
    },
  },
  {
    accessorKey: 'small',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Small" />
    ),
    cell: ({ getValue }) => (
      <span className="tabular-nums">{getValue<number>()}</span>
    ),
  },
  {
    accessorKey: 'medium',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Medium" />
    ),
    cell: ({ getValue }) => (
      <span className="tabular-nums">{getValue<number>()}</span>
    ),
  },
  {
    accessorKey: 'large',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Large" />
    ),
    cell: ({ getValue }) => (
      <span className="tabular-nums">{getValue<number>()}</span>
    ),
  },
  {
    accessorKey: 'totalAnimals',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" />
    ),
    cell: ({ getValue }) => (
      <span className="tabular-nums">{getValue<number>()}</span>
    ),
  },
  {
    accessorKey: 'weighted',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Weighted" />
    ),
    cell: ({ getValue }) => (
      <span className="tabular-nums">
        {getValue<number>().toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: 'densityPerKm',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Weighted/km" />
    ),
    cell: ({ getValue }) => {
      const v = getValue<number | null>()
      return v != null ? (
        <span className="tabular-nums">{v.toFixed(1)}</span>
      ) : (
        nullCell
      )
    },
  },
  {
    accessorKey: 'rawDensityPerKm',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Animals/km" />
    ),
    cell: ({ getValue }) => {
      const v = getValue<number | null>()
      return v != null ? (
        <span className="tabular-nums">{v.toFixed(2)}</span>
      ) : (
        nullCell
      )
    },
  },
]

const skeletonColumns: ColumnConfig[] = [
  { type: 'text', width: 'w-28' },
  { type: 'text', width: 'w-12' },
  { type: 'text', width: 'w-14' },
  { type: 'text', width: 'w-10' },
  { type: 'text', width: 'w-10' },
  { type: 'text', width: 'w-10' },
  { type: 'text', width: 'w-10' },
  { type: 'text', width: 'w-14' },
  { type: 'text', width: 'w-14' },
  { type: 'text', width: 'w-14' },
  { type: 'text', width: 'w-7' },
]

type DensityTableProps = {
  segments: DensitySegment[]
  densityMode: DensityMode
  isLoading: boolean
  highlightedSegment: string | null
}

const DEFAULT_SORTING: SortingState = [{ id: 'densityPerKm', desc: true }]
const DEFAULT_VISIBILITY: VisibilityState = {
  small: false,
  medium: false,
  large: false,
  weighted: false,
}

export function DensityTable({
  segments,
  densityMode,
  isLoading,
  highlightedSegment,
}: DensityTableProps) {
  const highlightRef = useRef<HTMLTableRowElement>(null)
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>(DEFAULT_VISIBILITY)
  const [globalFilter, setGlobalFilter] = useState('')

  const rows: DensityRow[] = useMemo(
    () =>
      segments.map((s) => ({
        ...s,
        rawDensityPerKm:
          s.segmentLengthKm && s.segmentLengthKm > 0
            ? Math.round((s.totalAnimals / s.segmentLengthKm) * 100) / 100
            : null,
      })),
    [segments],
  )

  const columns = useMemo(
    () => [...dataColumns, locateColumn(densityMode)],
    [densityMode],
  )

  const visibleKeys = useMemo(
    () =>
      dataColumns
        .map((col) =>
          'accessorKey' in col ? (col.accessorKey as string) : undefined,
        )
        .filter(
          (key): key is string =>
            key != null && columnVisibility[key] !== false,
        ),
    [columnVisibility],
  )

  const searchIndex = useMemo(
    () => buildSearchIndex(rows, visibleKeys),
    [rows, visibleKeys],
  )

  const table = useReactTable({
    data: rows,
    columns,
    initialState: { pagination: { pageSize: 20 } },
    state: { sorting, columnVisibility, globalFilter },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const indexed = searchIndex.get(row.original.segmentId)
      return indexed?.includes((filterValue as string).toLowerCase()) ?? false
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  // Keep a stable ref to the table so the highlight effect doesn't re-run
  // on every render (useReactTable returns a new object each render)
  const tableRef = useRef(table)
  tableRef.current = table

  useEffect(() => {
    if (!highlightedSegment) return

    const t = tableRef.current
    const sortedRows = t.getSortedRowModel().rows
    const rowIndex = sortedRows.findIndex(
      (r) => r.original.segmentName === highlightedSegment,
    )
    if (rowIndex === -1) return

    const currentPageSize = t.getState().pagination.pageSize
    const targetPage = Math.floor(rowIndex / currentPageSize)
    t.setPageIndex(targetPage)

    // Scroll after React re-renders with the new page
    requestAnimationFrame(() => {
      highlightRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })
  }, [highlightedSegment])

  const visibleSkeletonColumns = skeletonColumns.filter((_, i) => {
    const col = columns[i]
    if (!col) return false
    const key = 'accessorKey' in col ? (col.accessorKey as string) : undefined
    return key ? columnVisibility[key] !== false : true
  })

  const filteredRowCount = table.getFilteredRowModel().rows.length

  return (
    <Card className="gap-0 py-0 overflow-hidden">
      <DataTableToolbar
        table={table}
        totalRows={rows.length}
        filteredRowCount={filteredRowCount}
        searchPlaceholder="Search segment, highway..."
        exportFilename="wisr-lki-density.csv"
        columnLabels={{
          segmentName: 'Segment',
          highwayNumber: 'Highway',
          segmentLengthKm: 'Length (km)',
          small: 'Small',
          medium: 'Medium',
          large: 'Large',
          totalAnimals: 'Total',
          weighted: 'Weighted',
          densityPerKm: 'Weighted/km',
          rawDensityPerKm: 'Animals/km',
        }}
      />

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRowsSkeleton
                rows={table.getState().pagination.pageSize}
                columns={visibleSkeletonColumns}
              />
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => {
                const isHighlighted =
                  row.original.segmentName === highlightedSegment
                return (
                  <TableRow
                    key={row.id}
                    ref={isHighlighted ? highlightRef : undefined}
                    className={
                      isHighlighted
                        ? 'bg-primary/10 animate-in fade-in duration-300'
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-40 text-center"
                >
                  <div className="text-muted-foreground">
                    <p>No density records found</p>
                    <p className="mt-1 text-xs">
                      Try adjusting your filters or date range
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </Card>
  )
}
