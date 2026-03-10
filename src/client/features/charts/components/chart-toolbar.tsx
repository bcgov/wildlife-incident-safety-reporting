import { Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChartConfig } from '@/components/ui/chart'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { REMAINING_KEY } from '../lib/aggregations'
import type { TimeBucket } from '../types/chart-types'

const TIME_BUCKET_LABELS: Record<TimeBucket, string> = {
  year: 'Yearly',
  month: 'Monthly',
  seasonal: 'Seasonal',
}

type ChartToolbarProps = {
  bucket: TimeBucket
  onBucketChange: (bucket: TimeBucket) => void
  speciesKeys: string[]
  config: ChartConfig
}

export function ChartToolbar({
  bucket,
  onBucketChange,
  speciesKeys,
  config,
}: ChartToolbarProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Select value={bucket} onValueChange={(v) => v && onBucketChange(v)}>
        <SelectTrigger className="w-32">
          <SelectValue>
            {(value: TimeBucket) => TIME_BUCKET_LABELS[value]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="year">Yearly</SelectItem>
          <SelectItem value="month">Monthly</SelectItem>
          <SelectItem value="seasonal">Seasonal</SelectItem>
        </SelectContent>
      </Select>
      <Popover>
        <Tooltip>
          <TooltipTrigger
            render={<PopoverTrigger render={<Button variant="outline" />} />}
          >
            <Palette className="size-4" />
            Legend
          </TooltipTrigger>
          <TooltipContent>Species legend</TooltipContent>
        </Tooltip>
        <PopoverContent align="end" className="w-48">
          <PopoverHeader>
            <PopoverTitle>Species Legend</PopoverTitle>
          </PopoverHeader>
          <div className="flex flex-col gap-1.5">
            {speciesKeys
              .filter((s) => s !== REMAINING_KEY)
              .slice()
              .sort((a, b) => a.localeCompare(b))
              .map((species) => (
                <div key={species} className="flex items-center gap-2 text-sm">
                  <div
                    className="size-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: config[species]?.color }}
                  />
                  <span className="text-muted-foreground">
                    {config[species]?.label ?? species}
                  </span>
                </div>
              ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
