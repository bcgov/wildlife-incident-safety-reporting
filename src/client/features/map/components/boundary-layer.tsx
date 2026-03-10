import type { BoundaryProperties } from '@schemas/service-areas/boundaries.schema'
import type MapLibreGL from 'maplibre-gl'
import { useEffect, useState } from 'react'
import { MapPopup, useMap } from '@/components/ui/map'
import { useBoundaries } from '../hooks/use-boundaries'
import { useLayerStore } from '../store/layer-store'

const SOURCE_ID = 'boundaries-source'
const FILL_LAYER_ID = 'boundaries-fill'
const LINE_LAYER_ID = 'boundaries-line'

type SelectedBoundary = {
  coordinates: [number, number]
  properties: BoundaryProperties
}

export function BoundaryLayer() {
  const { map, isLoaded } = useMap()
  const { data } = useBoundaries()
  const visible = useLayerStore((s) => s.layers.boundaries)
  const [selected, setSelected] = useState<SelectedBoundary | null>(null)

  useEffect(() => {
    if (!visible) setSelected(null)
  }, [visible])

  useEffect(() => {
    if (!isLoaded || !map) return

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'id',
    })

    // Add on top of all basemap layers. Other app layers (clusters, draw shapes)
    // mount after this component and will stack above these.
    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': '#42814A',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.18,
          0.1,
        ],
      },
    })

    map.addLayer({
      id: LINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#ffffff',
          '#42814A',
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          2,
          1,
        ],
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.9,
          1.0,
        ],
      },
    })

    return () => {
      try {
        if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID)
        if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID)
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
      } catch {
        // Map may already be removed
      }
    }
  }, [isLoaded, map])

  useEffect(() => {
    if (!isLoaded || !map || !data) return

    const source = map.getSource(SOURCE_ID) as MapLibreGL.GeoJSONSource
    if (source) {
      source.setData(data)
    }
  }, [isLoaded, map, data])

  useEffect(() => {
    if (!isLoaded || !map) return

    const visibility = visible ? 'visible' : 'none'

    if (map.getLayer(FILL_LAYER_ID)) {
      map.setLayoutProperty(FILL_LAYER_ID, 'visibility', visibility)
    }
    if (map.getLayer(LINE_LAYER_ID)) {
      map.setLayoutProperty(LINE_LAYER_ID, 'visibility', visibility)
    }
  }, [isLoaded, map, visible])

  useEffect(() => {
    if (!isLoaded || !map) return

    let hoveredId: string | number | null = null

    const clearHover = () => {
      if (hoveredId !== null) {
        map.setFeatureState(
          { source: SOURCE_ID, id: hoveredId },
          { hover: false },
        )
        hoveredId = null
      }
    }

    const isExternalCursor = () => {
      const c = map.getCanvas().style.cursor
      return c === 'crosshair' || c === 'grab' || c === 'grabbing'
    }

    // Check if any non-boundary app layer features are at this point
    const hasOverlappingFeatures = (point: MapLibreGL.PointLike) =>
      map
        .queryRenderedFeatures(point)
        .some(
          (f) =>
            f.layer.id !== FILL_LAYER_ID &&
            f.layer.id !== LINE_LAYER_ID &&
            (f.layer.id.startsWith('clusters-') ||
              f.layer.id.startsWith('unclustered-point-') ||
              f.layer.id.startsWith('cluster-count-') ||
              f.layer.id.startsWith('cluster-hull-') ||
              f.layer.id.startsWith('td-') ||
              f.layer.id.includes('-spiderfy-leaf')),
        )

    const handleClick = (
      e: MapLibreGL.MapMouseEvent & {
        features?: MapLibreGL.MapGeoJSONFeature[]
      },
    ) => {
      if (hasOverlappingFeatures(e.point)) return

      const features = map.queryRenderedFeatures(e.point, {
        layers: [FILL_LAYER_ID],
      })
      if (!features.length) return

      const props = features[0].properties as BoundaryProperties
      setSelected({
        coordinates: [e.lngLat.lng, e.lngLat.lat],
        properties: props,
      })
    }

    const handleMouseMove = (e: MapLibreGL.MapMouseEvent) => {
      if (isExternalCursor()) {
        clearHover()
        return
      }

      const features = map.queryRenderedFeatures(e.point, {
        layers: [FILL_LAYER_ID],
      })

      const overlapping = hasOverlappingFeatures(e.point)

      if (features.length > 0 && !overlapping) {
        const id = features[0].id
        if (id !== hoveredId) {
          clearHover()
          if (id !== undefined) {
            hoveredId = id
            map.setFeatureState({ source: SOURCE_ID, id }, { hover: true })
          }
        }
        map.getCanvas().style.cursor = 'pointer'
      } else {
        clearHover()
        if (!isExternalCursor() && !overlapping)
          map.getCanvas().style.cursor = ''
      }
    }

    const handleMouseLeave = () => {
      clearHover()
      if (!isExternalCursor()) map.getCanvas().style.cursor = ''
    }

    map.on('click', FILL_LAYER_ID, handleClick)
    map.on('mousemove', FILL_LAYER_ID, handleMouseMove)
    map.on('mouseleave', FILL_LAYER_ID, handleMouseLeave)

    return () => {
      clearHover()
      map.off('click', FILL_LAYER_ID, handleClick)
      map.off('mousemove', FILL_LAYER_ID, handleMouseMove)
      map.off('mouseleave', FILL_LAYER_ID, handleMouseLeave)
    }
  }, [isLoaded, map])

  return selected ? (
    <MapPopup
      key={selected.properties.id}
      longitude={selected.coordinates[0]}
      latitude={selected.coordinates[1]}
      onClose={() => setSelected(null)}
      closeButton
      focusAfterOpen={false}
    >
      <div className="flex flex-col gap-1 pr-4">
        <p className="text-sm font-semibold">{selected.properties.name}</p>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Service Area</span>
          <span className="font-medium">
            {selected.properties.contractAreaNumber}
          </span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">District</span>
          <span className="font-medium">{selected.properties.district}</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Region</span>
          <span className="font-medium">{selected.properties.region}</span>
        </div>
      </div>
    </MapPopup>
  ) : null
}
