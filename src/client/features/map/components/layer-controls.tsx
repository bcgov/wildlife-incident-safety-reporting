import { Layers } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { ControlButton, ControlGroup } from '@/components/ui/map'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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

const layers = [{ id: 'boundaries', label: 'Service area boundaries' }] as const

export function LayerControls({ position = 'top-right' }: LayerControlsProps) {
  const layerVisibility = useLayerStore((s) => s.layers)
  const toggleLayer = useLayerStore((s) => s.toggleLayer)

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
          <div className="flex flex-col gap-2">
            {layers.map((layer) => (
              <div
                key={layer.id}
                className="flex cursor-pointer items-center gap-2"
              >
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
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
