import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableRow } from '@/components/ui/table'

interface ColumnConfig {
  width?: string
  className?: string
  hideOnMobile?: boolean
  type?: 'text' | 'twoLine' | 'badge'
}

interface TableRowsSkeletonProps {
  rows: number
  columns: ColumnConfig[]
}

export type { ColumnConfig }

export function TableRowsSkeleton({ rows, columns }: TableRowsSkeletonProps) {
  const renderContent = (column: ColumnConfig) => {
    switch (column.type) {
      case 'twoLine':
        return (
          <div>
            <Skeleton className={`h-4 ${column.width || 'w-20'}`} />
            <Skeleton className="h-3 w-10 mt-1" />
          </div>
        )
      case 'badge':
        return <Skeleton className={`h-6 ${column.width || 'w-16'}`} />
      default:
        return <Skeleton className={`h-4 ${column.width || 'w-24'}`} />
    }
  }

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={`skeleton-row-${rowIndex}`}>
          {columns.map((column, colIndex) => (
            <TableCell
              key={`skeleton-cell-${rowIndex}-${colIndex}`}
              className={`${column.className || ''} ${
                column.hideOnMobile ? 'hidden sm:table-cell' : ''
              }`}
            >
              {renderContent(column)}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
