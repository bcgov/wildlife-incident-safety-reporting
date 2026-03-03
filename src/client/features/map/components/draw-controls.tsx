import {
  Circle,
  MousePointer,
  Pentagon,
  RectangleHorizontal,
  Ruler,
  Trash2,
} from 'lucide-react'
import { ControlButton, ControlGroup, MapPopup } from '@/components/ui/map'
import { useTerraDraw } from '../hooks/use-terra-draw'

type DrawControlsProps = {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

const positionClasses = {
  'top-left': 'top-2 left-2',
  'top-right': 'top-2 right-2',
  'bottom-left': 'bottom-2 left-2',
  'bottom-right': 'bottom-10 right-2',
}

export function DrawControls({ position = 'top-right' }: DrawControlsProps) {
  const {
    activeMode,
    measurementPopup,
    hasDrawing,
    startDrawing,
    clearDrawing,
    dismissMeasurement,
  } = useTerraDraw()

  const tooltipSide = position.includes('left')
    ? ('right' as const)
    : ('left' as const)

  return (
    <>
      <div
        className={`absolute z-10 flex flex-col gap-1.5 ${positionClasses[position]}`}
      >
        <ControlGroup>
          <ControlButton
            onClick={() => startDrawing('polygon')}
            label="Draw polygon"
            active={activeMode === 'polygon'}
            tooltipSide={tooltipSide}
          >
            <Pentagon className="size-4" />
          </ControlButton>
          <ControlButton
            onClick={() => startDrawing('rectangle')}
            label="Draw rectangle"
            active={activeMode === 'rectangle'}
            tooltipSide={tooltipSide}
          >
            <RectangleHorizontal className="size-4" />
          </ControlButton>
          <ControlButton
            onClick={() => startDrawing('circle')}
            label="Draw circle"
            active={activeMode === 'circle'}
            tooltipSide={tooltipSide}
          >
            <Circle className="size-4" />
          </ControlButton>
          <ControlButton
            onClick={() => startDrawing('measure')}
            label="Measure distance"
            active={activeMode === 'measure'}
            tooltipSide={tooltipSide}
          >
            <Ruler className="size-4" />
          </ControlButton>
        </ControlGroup>
        {hasDrawing && (
          <ControlGroup>
            <ControlButton
              onClick={() => startDrawing('select')}
              label="Edit shape"
              active={activeMode === 'select'}
              tooltipSide={tooltipSide}
            >
              <MousePointer className="size-4" />
            </ControlButton>
            <ControlButton
              onClick={clearDrawing}
              label="Clear drawn area"
              tooltipSide={tooltipSide}
            >
              <Trash2 className="size-4" />
            </ControlButton>
          </ControlGroup>
        )}
      </div>
      {measurementPopup && (
        <MapPopup
          longitude={measurementPopup.lngLat[0]}
          latitude={measurementPopup.lngLat[1]}
          onClose={dismissMeasurement}
          closeButton
          focusAfterOpen={false}
          closeOnClick={false}
        >
          <p className="pr-4 text-sm font-medium">{measurementPopup.text}</p>
        </MapPopup>
      )}
    </>
  )
}
