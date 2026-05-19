import { Layers } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { ControlButton, ControlGroup } from '@/components/ui/map'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { Basemap, DensityMode } from '../store/layer-store'
import { useLayerStore } from '../store/layer-store'

type LayerControlsProps = {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

const positionClasses = {
  'top-left': 'top-2 left-2',
  'top-right': 'top-2 right-2',
  'bottom-left': 'bottom-2 left-2',
  'bottom-right': 'bottom-10 right-2',
}

const basemapOptions: { id: Basemap; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'hybrid', label: 'Hybrid' },
]

const overlayLayers = [
  { id: 'boundaries', label: 'Service area boundaries' },
  { id: 'density', label: 'LKI segment density' },
] as const

const densityModeOptions: { id: DensityMode; label: string }[] = [
  { id: 'weighted', label: 'Weighted' },
  { id: 'raw', label: 'Raw count' },
]

export function LayerControls({ position = 'top-right' }: LayerControlsProps) {
  const basemap = useLayerStore((s) => s.basemap)
  const setBasemap = useLayerStore((s) => s.setBasemap)
  const layerVisibility = useLayerStore((s) => s.layers)
  const toggleLayer = useLayerStore((s) => s.toggleLayer)
  const densityMode = useLayerStore((s) => s.densityMode)
  const setDensityMode = useLayerStore((s) => s.setDensityMode)

  const tooltipSide = position.includes('left')
    ? ('right' as const)
    : ('left' as const)

  return (
    <div
      className={`absolute z-10 flex flex-col gap-1.5 ${positionClasses[position]}`}
    >
      <Popover>
        <ControlGroup>
          <PopoverTrigger
            render={
              <ControlButton
                onClick={() => {}}
                label="Map layers"
                tooltipSide={tooltipSide}
              >
                <Layers className="size-4" />
              </ControlButton>
            }
          />
        </ControlGroup>
        <PopoverContent side={tooltipSide} align="start" className="w-auto">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">
                Basemap
              </span>
              <div className="grid grid-cols-2 gap-1">
                {basemapOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setBasemap(opt.id)}
                    aria-pressed={basemap === opt.id}
                    className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                      basemap === opt.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-border border-t" />
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                Overlays
              </span>
              {overlayLayers.map((layer) => (
                <div key={layer.id} className="flex flex-col gap-1.5">
                  <div className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      id={`layer-${layer.id}`}
                      checked={layerVisibility[layer.id] ?? false}
                      onCheckedChange={() => toggleLayer(layer.id)}
                    />
                    <label
                      htmlFor={`layer-${layer.id}`}
                      className="cursor-pointer text-sm"
                    >
                      {layer.label}
                    </label>
                  </div>
                  {layer.id === 'density' && layerVisibility.density && (
                    <fieldset
                      className="ml-6 flex gap-1 border-none p-0"
                      aria-label="Density mode"
                    >
                      {densityModeOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDensityMode(opt.id)}
                          aria-pressed={densityMode === opt.id}
                          className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
                            densityMode === opt.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80 text-foreground'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </fieldset>
                  )}
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
