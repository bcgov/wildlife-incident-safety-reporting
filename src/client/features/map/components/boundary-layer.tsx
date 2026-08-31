import type * as MapLibreGL from 'maplibre-gl'
import { useEffect, useState } from 'react'
import { MapPopup, useMap } from '@/components/ui/map'
import type { components } from '@/types/api'
import { useBoundaries } from '../hooks/use-boundaries'
import { ensureSlots, SLOTS } from '../lib/layer-slots'
import { hasOverlappingAppFeatures } from '../lib/map-interactions'
import { useLayerStore } from '../store/layer-store'

type BoundaryProperties = components['schemas']['BoundaryFeature']['properties']

const SOURCE_ID = 'boundaries-source'
const FILL_LAYER_ID = 'boundaries-fill'
const LINE_LAYER_ID = 'boundaries-line'
const HIGHLIGHT_LINE_LAYER_ID = 'boundaries-highlight-line'

const BOUNDARY_COLOR = '#42814A'
const HIGHLIGHT_LINE_COLOR = '#ffffff'

const MATCH_NONE: MapLibreGL.FilterSpecification = [
  'in',
  ['get', 'id'],
  ['literal', []],
]

const LAYER_IDS = [FILL_LAYER_ID, LINE_LAYER_ID, HIGHLIGHT_LINE_LAYER_ID]

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

    ensureSlots(map)

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'id',
    })

    map.addLayer(
      {
        id: FILL_LAYER_ID,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': BOUNDARY_COLOR,
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.18,
            0.1,
          ],
        },
      },
      SLOTS.boundaries,
    )

    map.addLayer(
      {
        id: LINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        paint: { 'line-color': BOUNDARY_COLOR, 'line-width': 1 },
      },
      SLOTS.boundaries,
    )

    // Neighbours clip a shared border, so the hovered outline needs its own layer
    map.addLayer(
      {
        id: HIGHLIGHT_LINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        filter: MATCH_NONE,
        paint: {
          'line-color': HIGHLIGHT_LINE_COLOR,
          'line-width': 2,
          'line-opacity': 0.9,
        },
      },
      SLOTS.boundaryHighlight,
    )

    return () => {
      try {
        for (const id of LAYER_IDS) {
          if (map.getLayer(id)) map.removeLayer(id)
        }
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

    for (const id of LAYER_IDS) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', visibility)
      }
    }
  }, [isLoaded, map, visible])

  useEffect(() => {
    if (!isLoaded || !map) return

    let hoveredId: string | number | null = null

    // Filtering the base layers would break the mousemove binding they carry
    const setHighlight = (id: string | number | null) => {
      if (!map.getLayer(HIGHLIGHT_LINE_LAYER_ID)) return
      map.setFilter(
        HIGHLIGHT_LINE_LAYER_ID,
        id === null ? MATCH_NONE : ['==', ['get', 'id'], id],
      )
    }

    const clearHover = () => {
      if (hoveredId !== null) {
        map.setFeatureState(
          { source: SOURCE_ID, id: hoveredId },
          { hover: false },
        )
        setHighlight(null)
        hoveredId = null
      }
    }

    const isExternalCursor = () => {
      const c = map.getCanvas().style.cursor
      return c === 'crosshair' || c === 'grab' || c === 'grabbing'
    }

    const hasOverlappingFeatures = (point: MapLibreGL.PointLike) =>
      hasOverlappingAppFeatures(map, point, LAYER_IDS)

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
            setHighlight(id)
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
