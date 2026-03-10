import { DensityLegend } from '@/components/density-legend'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DensityMode } from '@/features/map/store/layer-store'

const DENSITY_MODE_LABELS: Record<DensityMode, string> = {
  weighted: 'Weighted',
  raw: 'Raw count',
}

type DensityToolbarProps = {
  densityMode: DensityMode
  onDensityModeChange: (mode: DensityMode) => void
}

export function DensityToolbar({
  densityMode,
  onDensityModeChange,
}: DensityToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <DensityLegend />
      <Select
        value={densityMode}
        onValueChange={(v) => v && onDensityModeChange(v as DensityMode)}
      >
        <SelectTrigger className="w-32">
          <SelectValue>
            {(value: DensityMode) => DENSITY_MODE_LABELS[value]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="weighted">Weighted</SelectItem>
          <SelectItem value="raw">Raw count</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
