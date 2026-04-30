import type { Incident } from '@schemas/incidents/incidents.schema'
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
import { format } from 'date-fns'
import { Crosshair } from 'lucide-react'
import { useMemo, useState } from 'react'
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
import { useIncidentLocateStore } from '@/stores/incident-locate-store'
import { useTabStore } from '@/stores/tab-store'

const nullCell = <span className="text-muted-foreground">-</span>

function buildSearchIndex(incidents: Incident[], keys: string[]) {
  const index = new Map<number, string>()
  for (const incident of incidents) {
    const record = incident as Record<string, unknown>
    index.set(
      incident.id,
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

const locateColumn: ColumnDef<Incident> = {
  id: 'locate',
  enableSorting: false,
  enableHiding: false,
  header: () => <span className="sr-only">Locate</span>,
  cell: ({ row }) => {
    const { latitude, longitude } = row.original
    const hasCoordinates = latitude != null && longitude != null
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="gold"
              size="icon"
              className="size-7"
              disabled={!hasCoordinates}
              onClick={() => {
                if (latitude == null || longitude == null) return
                const incident = row.original
                useIncidentLocateStore.getState().locate({
                  coordinates: [longitude, latitude],
                  properties: {
                    id: incident.id,
                    speciesName: incident.speciesName,
                    speciesColor: incident.speciesColor,
                    speciesGroupName: incident.speciesGroupName,
                    year: incident.year,
                    accidentDate: incident.accidentDate,
                    sex: incident.sex,
                    timeOfKill: incident.timeOfKill,
                    age: incident.age,
                    quantity: incident.quantity,
                    nearestTown: incident.nearestTown,
                    serviceAreaName: incident.serviceAreaName,
                    contractAreaNumber: incident.contractAreaNumber,
                    comments: incident.comments,
                  },
                })
                useTabStore.getState().setActiveTab('map')
              }}
            />
          }
        >
          <Crosshair className="size-4" />
        </TooltipTrigger>
        <TooltipContent>
          {hasCoordinates ? 'Locate on map' : 'No coordinates available'}
        </TooltipContent>
      </Tooltip>
    )
  },
}

const columns: ColumnDef<Incident>[] = [
  {
    accessorKey: 'accidentDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ getValue }) => {
      const value = getValue<string | null>()
      if (!value) return nullCell
      // Parse date parts manually to avoid timezone shifting date-only ISO strings
      const [year, month, day] = value.split('T')[0].split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return format(date, 'MMM d, yyyy')
    },
  },
  {
    accessorKey: 'year',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Year" />
    ),
    cell: ({ getValue }) => (
      <span className="tabular-nums">{getValue<number>()}</span>
    ),
  },
  {
    accessorKey: 'speciesGroupName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Species" />
    ),
    cell: ({ row, getValue }) => (
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-sm"
          style={{ backgroundColor: row.original.speciesColor }}
        />
        <span className="font-semibold">{getValue<string>()}</span>
      </div>
    ),
  },
  {
    accessorKey: 'quantity',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Quantity" />
    ),
    cell: ({ getValue }) => (
      <span className="tabular-nums">{getValue<number>()}</span>
    ),
  },
  {
    accessorKey: 'sex',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sex" />
    ),
    cell: ({ getValue }) => getValue<string | null>() ?? nullCell,
  },
  {
    accessorKey: 'age',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Age" />
    ),
    cell: ({ getValue }) => getValue<string | null>() ?? nullCell,
  },
  {
    accessorKey: 'timeOfKill',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Time of Kill" />
    ),
    cell: ({ getValue }) => getValue<string | null>() ?? nullCell,
  },
  {
    accessorKey: 'serviceAreaName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Service Area" />
    ),
    cell: ({ getValue }) => getValue<string | null>() ?? nullCell,
  },
  {
    accessorKey: 'nearestTown',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nearest Town" />
    ),
    cell: ({ getValue }) => getValue<string | null>() ?? nullCell,
  },
  {
    accessorKey: 'region',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Region" />
    ),
    cell: ({ getValue }) => getValue<string | null>() ?? nullCell,
  },
  {
    accessorKey: 'district',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="District" />
    ),
    cell: ({ getValue }) => getValue<string | null>() ?? nullCell,
  },
  {
    accessorKey: 'latitude',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Latitude" />
    ),
    cell: ({ getValue }) => {
      const value = getValue<number | null>()
      return value != null ? (
        <span className="tabular-nums">{value}</span>
      ) : (
        nullCell
      )
    },
  },
  {
    accessorKey: 'longitude',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Longitude" />
    ),
    cell: ({ getValue }) => {
      const value = getValue<number | null>()
      return value != null ? (
        <span className="tabular-nums">{value}</span>
      ) : (
        nullCell
      )
    },
  },
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ getValue }) => (
      <span className="tabular-nums">{getValue<number>()}</span>
    ),
  },
  {
    accessorKey: 'comments',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Comments" />
    ),
    cell: ({ getValue }) => getValue<string>() || nullCell,
  },
  locateColumn,
]

const skeletonColumns: ColumnConfig[] = [
  { type: 'text', width: 'w-24' },
  { type: 'text', width: 'w-10' },
  { type: 'text', width: 'w-20' },
  { type: 'text', width: 'w-8' },
  { type: 'text', width: 'w-14' },
  { type: 'text', width: 'w-14' },
  { type: 'text', width: 'w-14' },
  { type: 'text', width: 'w-24' },
  { type: 'text', width: 'w-20' },
  { type: 'text', width: 'w-20' },
  { type: 'text', width: 'w-20' },
  { type: 'text', width: 'w-16' },
  { type: 'text', width: 'w-16' },
  { type: 'text', width: 'w-12' },
  { type: 'text', width: 'w-32' },
  { type: 'text', width: 'w-7' },
]

type IncidentsTableProps = {
  incidents: Incident[]
  isLoading: boolean
}

const DEFAULT_SORTING: SortingState = [{ id: 'accidentDate', desc: true }]
const DEFAULT_VISIBILITY: VisibilityState = {
  region: false,
  district: false,
  latitude: false,
  longitude: false,
  id: false,
  comments: false,
}

export function IncidentsTable({ incidents, isLoading }: IncidentsTableProps) {
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>(DEFAULT_VISIBILITY)
  const [globalFilter, setGlobalFilter] = useState('')

  const visibleKeys = useMemo(
    () =>
      columns
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
    () => buildSearchIndex(incidents, visibleKeys),
    [incidents, visibleKeys],
  )

  const table = useReactTable({
    data: incidents,
    columns,
    initialState: { pagination: { pageSize: 20 } },
    state: { sorting, columnVisibility, globalFilter },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const indexed = searchIndex.get(row.original.id)
      return indexed?.includes((filterValue as string).toLowerCase()) ?? false
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

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
        totalRows={incidents.length}
        filteredRowCount={filteredRowCount}
        searchPlaceholder="Search species, town, area..."
        exportFilename="wisr-incidents.csv"
        columnLabels={{
          accidentDate: 'Date',
          year: 'Year',
          speciesGroupName: 'Species',
          quantity: 'Quantity',
          sex: 'Sex',
          age: 'Age',
          timeOfKill: 'Time of Kill',
          serviceAreaName: 'Service Area',
          nearestTown: 'Nearest Town',
          region: 'Region',
          district: 'District',
          latitude: 'Latitude',
          longitude: 'Longitude',
          id: 'ID',
          comments: 'Comments',
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
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-40 text-center"
                >
                  <div className="text-muted-foreground">
                    <p>No incident records found</p>
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
