import bbox from '@turf/bbox'
import buffer from '@turf/buffer'
import type * as MapLibreGL from 'maplibre-gl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPopup, useMap } from '@/components/ui/map'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useRoute } from '@/hooks/use-route'
import { useRouteStore } from '@/stores/route-store'
import { ensureSlots, SLOTS } from '../lib/layer-slots'
import { hasOverlappingAppFeatures } from '../lib/map-interactions'
import {
  ROUTE_CASING_COLOR,
  ROUTE_CASING_HOVER_COLOR,
  ROUTE_LINE_COLOR,
  ROUTE_LINE_HOVER_COLOR,
} from '../lib/route-style'
import {
  SPATIAL_FILTER_FILL_COLOR,
  SPATIAL_FILTER_FILL_OPACITY,
  SPATIAL_FILTER_OUTLINE_COLOR,
  SPATIAL_FILTER_OUTLINE_WIDTH,
} from '../lib/spatial-filter-style'

const SOURCE_ID = 'route-source'
const CORRIDOR_SOURCE_ID = 'route-corridor-source'
const CORRIDOR_LAYER_ID = 'route-corridor-fill'
const CORRIDOR_OUTLINE_LAYER_ID = 'route-corridor-outline'
const CASING_LAYER_ID = 'route-line-casing'
const LINE_LAYER_ID = 'route-line'

const LAYER_IDS = [
  CORRIDOR_LAYER_ID,
  CORRIDOR_OUTLINE_LAYER_ID,
  CASING_LAYER_ID,
  LINE_LAYER_ID,
]
const INTERACTIVE_LAYER_IDS = [CORRIDOR_LAYER_ID, LINE_LAYER_ID]

const ROUTE_FEATURE_ID = 0

const hoverCase = <T,>(hovered: T, base: T) =>
  [
    'case',
    ['boolean', ['feature-state', 'hover'], false],
    hovered,
    base,
  ] as MapLibreGL.DataDrivenPropertyValueSpecification<T>

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

function asFeatureCollection(
  geometry: GeoJSON.Geometry | null,
): GeoJSON.FeatureCollection {
  if (!geometry) return EMPTY_FC
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', id: ROUTE_FEATURE_ID, geometry, properties: {} },
    ],
  }
}

type PopupState = {
  coordinates: [number, number]
}

export function RouteLayer() {
  const { map, isLoaded } = useMap()
  const { data } = useRoute()
  const start = useRouteStore((s) => s.start)
  const end = useRouteStore((s) => s.end)
  const corridorMeters = useRouteStore((s) => s.corridorMeters)
  const [popup, setPopup] = useState<PopupState | null>(null)

  const debouncedMeters = useDebouncedValue(corridorMeters, 400)

  // Display only - the server filters with ST_DWithin against the same route
  const corridor = useMemo(() => {
    const line = data?.line
    if (!line || debouncedMeters <= 0) return null
    const buffered = buffer(
      { type: 'Feature', geometry: line, properties: {} },
      debouncedMeters,
      { units: 'meters' },
    )
    return buffered?.geometry ?? null
  }, [data, debouncedMeters])

  useEffect(() => {
    if (!data?.line) setPopup(null)
  }, [data])

  const fittedLineRef = useRef<typeof data | null>(null)

  useEffect(() => {
    if (!isLoaded || !map) return
    const line = data?.line ?? null
    if (!line) {
      fittedLineRef.current = null
      return
    }
    if (fittedLineRef.current === data) return
    fittedLineRef.current = data

    const [minLng, minLat, maxLng, maxLat] = bbox(line)
    map.fitBounds([minLng, minLat, maxLng, maxLat], {
      padding: 60,
      duration: 1000,
    })
  }, [isLoaded, map, data])

  useEffect(() => {
    if (!isLoaded || !map) return

    ensureSlots(map)

    map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY_FC })
    map.addSource(CORRIDOR_SOURCE_ID, { type: 'geojson', data: EMPTY_FC })

    map.addLayer(
      {
        id: CORRIDOR_LAYER_ID,
        type: 'fill',
        source: CORRIDOR_SOURCE_ID,
        paint: {
          'fill-color': SPATIAL_FILTER_FILL_COLOR,
          'fill-opacity': SPATIAL_FILTER_FILL_OPACITY,
        },
      },
      SLOTS.draw,
    )

    map.addLayer(
      {
        id: CORRIDOR_OUTLINE_LAYER_ID,
        type: 'line',
        source: CORRIDOR_SOURCE_ID,
        paint: {
          'line-color': SPATIAL_FILTER_OUTLINE_COLOR,
          'line-width': SPATIAL_FILTER_OUTLINE_WIDTH,
        },
      },
      SLOTS.draw,
    )

    map.addLayer(
      {
        id: CASING_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': hoverCase(ROUTE_CASING_HOVER_COLOR, ROUTE_CASING_COLOR),
          'line-width': 8,
        },
      },
      SLOTS.draw,
    )

    map.addLayer(
      {
        id: LINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': hoverCase(ROUTE_LINE_HOVER_COLOR, ROUTE_LINE_COLOR),
          'line-width': 5,
        },
      },
      SLOTS.draw,
    )

    return () => {
      try {
        for (const id of LAYER_IDS) {
          if (map.getLayer(id)) map.removeLayer(id)
        }
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
        if (map.getSource(CORRIDOR_SOURCE_ID))
          map.removeSource(CORRIDOR_SOURCE_ID)
      } catch {
        // Map may already be removed
      }
    }
  }, [isLoaded, map])

  useEffect(() => {
    if (!isLoaded || !map) return

    let lineHovered = false

    const setLineHover = (hover: boolean) => {
      if (hover === lineHovered) return
      lineHovered = hover
      if (map.getSource(SOURCE_ID)) {
        map.setFeatureState(
          { source: SOURCE_ID, id: ROUTE_FEATURE_ID },
          { hover },
        )
      }
    }

    const isExternalCursor = () => {
      const c = map.getCanvas().style.cursor
      return c === 'crosshair' || c === 'grab' || c === 'grabbing'
    }

    const hasOverlapping = (point: MapLibreGL.PointLike) =>
      hasOverlappingAppFeatures(map, point, LAYER_IDS)

    const isOverLine = (point: MapLibreGL.PointLike) =>
      map.queryRenderedFeatures(point, { layers: [LINE_LAYER_ID] }).length > 0

    const handleClick = (e: MapLibreGL.MapMouseEvent) => {
      if (hasOverlapping(e.point)) return
      setPopup({ coordinates: [e.lngLat.lng, e.lngLat.lat] })
    }

    const handleMouseMove = (e: MapLibreGL.MapMouseEvent) => {
      if (isExternalCursor() || hasOverlapping(e.point)) {
        setLineHover(false)
        return
      }
      setLineHover(isOverLine(e.point))
      map.getCanvas().style.cursor = 'pointer'
    }

    const handleMouseLeave = () => {
      setLineHover(false)
      if (!isExternalCursor()) map.getCanvas().style.cursor = ''
    }

    for (const id of INTERACTIVE_LAYER_IDS) {
      map.on('click', id, handleClick)
      map.on('mousemove', id, handleMouseMove)
      map.on('mouseleave', id, handleMouseLeave)
    }

    return () => {
      setLineHover(false)
      for (const id of INTERACTIVE_LAYER_IDS) {
        map.off('click', id, handleClick)
        map.off('mousemove', id, handleMouseMove)
        map.off('mouseleave', id, handleMouseLeave)
      }
    }
  }, [isLoaded, map])

  useEffect(() => {
    if (!isLoaded || !map) return

    const source = map.getSource(SOURCE_ID) as
      | MapLibreGL.GeoJSONSource
      | undefined
    if (!source) return

    source.setData(asFeatureCollection(data?.line ?? null))
  }, [isLoaded, map, data])

  useEffect(() => {
    if (!isLoaded || !map) return

    const source = map.getSource(CORRIDOR_SOURCE_ID) as
      | MapLibreGL.GeoJSONSource
      | undefined
    if (!source) return

    source.setData(asFeatureCollection(corridor))
  }, [isLoaded, map, corridor])

  return popup && data ? (
    <MapPopup
      longitude={popup.coordinates[0]}
      latitude={popup.coordinates[1]}
      onClose={() => setPopup(null)}
      closeButton
      focusAfterOpen={false}
    >
      <div className="flex flex-col gap-1 pr-4">
        <p className="text-sm font-semibold">Route corridor</p>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Start</span>
          <span className="text-right font-medium">{start?.address}</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">End</span>
          <span className="text-right font-medium">{end?.address}</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Distance</span>
          <span className="font-medium">
            {data.distance.toFixed(1)} {data.distanceUnit}
          </span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Corridor width</span>
          <span className="font-medium">{corridorMeters} m</span>
        </div>
      </div>
    </MapPopup>
  ) : null
}
