import type MapLibreGL from 'maplibre-gl'
import { useEffect, useMemo, useState } from 'react'
import { MapPopup, useMap } from '@/components/ui/map'
import { useDensityData } from '@/hooks/use-density-data'
import type { DensitySegment } from '@/lib/density-api'
import { DENSITY_COLORS } from '@/lib/density-colors'
import type { DensityMode } from '../store/layer-store'
import { useLayerStore } from '../store/layer-store'

const SOURCE_ID = 'density-source'
const LINE_LAYER_ID = 'density-line'

type DensityProperties = Omit<DensitySegment, 'geometry'> & {
  rawDensityPerKm: number | null
}

type SelectedSegment = {
  coordinates: [number, number]
  properties: DensityProperties
}

// queryRenderedFeatures serializes all GeoJSON properties to strings
function parseProperties(raw: Record<string, string>): DensityProperties {
  return {
    segmentId: Number(raw.segmentId),
    segmentName: raw.segmentName,
    segmentDescription: raw.segmentDescription || null,
    highwayNumber: raw.highwayNumber || null,
    segmentLengthKm: raw.segmentLengthKm ? Number(raw.segmentLengthKm) : null,
    small: Number(raw.small),
    medium: Number(raw.medium),
    large: Number(raw.large),
    totalAnimals: Number(raw.totalAnimals),
    weighted: Number(raw.weighted),
    densityPerKm: raw.densityPerKm ? Number(raw.densityPerKm) : null,
    rawDensityPerKm: raw.rawDensityPerKm ? Number(raw.rawDensityPerKm) : null,
  }
}

// Breakpoints aligned to percentile distribution of segments with data:
// weighted/km: P25=7, P50=25, P75=72, P90=155
// raw/km:      P25=2.3, P50=7, P75=16, P90=31
const [GREEN, YELLOW, ORANGE, RED] = DENSITY_COLORS

const COLOR_RAMPS: Record<DensityMode, MapLibreGL.ExpressionSpecification> = {
  weighted: [
    'interpolate',
    ['linear'],
    ['get', 'densityPerKm'],
    0,
    'rgba(34, 197, 94, 0.15)',
    7,
    GREEN,
    25,
    YELLOW,
    50,
    ORANGE,
    72,
    RED,
  ],
  raw: [
    'interpolate',
    ['linear'],
    ['get', 'rawDensityPerKm'],
    0,
    'rgba(34, 197, 94, 0.15)',
    2.3,
    GREEN,
    7,
    YELLOW,
    12,
    ORANGE,
    16,
    RED,
  ],
}

function toGeoJSON(
  segments: DensitySegment[],
): GeoJSON.FeatureCollection<GeoJSON.Geometry, DensityProperties> {
  return {
    type: 'FeatureCollection',
    features: segments.map((s) => ({
      type: 'Feature' as const,
      geometry: s.geometry,
      properties: {
        segmentId: s.segmentId,
        segmentName: s.segmentName,
        segmentDescription: s.segmentDescription,
        highwayNumber: s.highwayNumber,
        segmentLengthKm: s.segmentLengthKm,
        small: s.small,
        medium: s.medium,
        large: s.large,
        totalAnimals: s.totalAnimals,
        weighted: s.weighted,
        densityPerKm: s.densityPerKm,
        rawDensityPerKm:
          s.segmentLengthKm && s.segmentLengthKm > 0
            ? Math.round((s.totalAnimals / s.segmentLengthKm) * 100) / 100
            : null,
      },
    })),
  }
}

export function DensityLayer() {
  const { map, isLoaded } = useMap()
  const visible = useLayerStore((s) => s.layers.density)
  const { data } = useDensityData({ enabled: visible })
  const densityMode = useLayerStore((s) => s.densityMode)
  const [selected, setSelected] = useState<SelectedSegment | null>(null)

  const geojson = useMemo(() => toGeoJSON(data ?? []), [data])

  useEffect(() => {
    if (!visible) setSelected(null)
  }, [visible])

  useEffect(() => {
    if (!isLoaded || !map) return

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'segmentId',
    })

    map.addLayer({
      id: LINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': COLOR_RAMPS.weighted,
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          5,
          3,
        ],
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          1,
          0.85,
        ],
      },
    })

    return () => {
      try {
        if (map.getLayer(LINE_LAYER_ID)) map.removeLayer(LINE_LAYER_ID)
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
      } catch {
        // Map may already be removed
      }
    }
  }, [isLoaded, map])

  useEffect(() => {
    if (!isLoaded || !map) return

    const source = map.getSource(SOURCE_ID) as MapLibreGL.GeoJSONSource
    if (source) {
      source.setData(geojson)
    }
  }, [isLoaded, map, geojson])

  useEffect(() => {
    if (!isLoaded || !map) return

    if (map.getLayer(LINE_LAYER_ID)) {
      map.setPaintProperty(
        LINE_LAYER_ID,
        'line-color',
        COLOR_RAMPS[densityMode],
      )
    }
  }, [isLoaded, map, densityMode])

  useEffect(() => {
    if (!isLoaded || !map) return

    const visibility = visible ? 'visible' : 'none'

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

    const hasOverlappingFeatures = (point: MapLibreGL.PointLike) =>
      map
        .queryRenderedFeatures(point)
        .some(
          (f) =>
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
        layers: [LINE_LAYER_ID],
      })
      if (!features.length) return

      setSelected({
        coordinates: [e.lngLat.lng, e.lngLat.lat],
        properties: parseProperties(
          features[0].properties as Record<string, string>,
        ),
      })
    }

    const handleMouseMove = (e: MapLibreGL.MapMouseEvent) => {
      if (isExternalCursor()) {
        clearHover()
        return
      }

      const features = map.queryRenderedFeatures(e.point, {
        layers: [LINE_LAYER_ID],
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

    map.on('click', LINE_LAYER_ID, handleClick)
    map.on('mousemove', LINE_LAYER_ID, handleMouseMove)
    map.on('mouseleave', LINE_LAYER_ID, handleMouseLeave)

    return () => {
      clearHover()
      map.off('click', LINE_LAYER_ID, handleClick)
      map.off('mousemove', LINE_LAYER_ID, handleMouseMove)
      map.off('mouseleave', LINE_LAYER_ID, handleMouseLeave)
    }
  }, [isLoaded, map])

  return selected ? (
    <MapPopup
      key={selected.properties.segmentId}
      longitude={selected.coordinates[0]}
      latitude={selected.coordinates[1]}
      onClose={() => setSelected(null)}
      closeButton
      focusAfterOpen={false}
    >
      <div className="flex flex-col gap-1 pr-4">
        <p className="text-sm font-semibold">
          {selected.properties.segmentName}
        </p>
        {selected.properties.highwayNumber && (
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-muted-foreground">Highway</span>
            <span className="font-medium">
              {selected.properties.highwayNumber}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Total animals</span>
          <span className="font-medium">
            {selected.properties.totalAnimals}
          </span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Weighted score</span>
          <span className="font-medium">{selected.properties.weighted}</span>
        </div>
        {selected.properties.densityPerKm != null && (
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-muted-foreground">Weighted/km</span>
            <span className="font-medium">
              {selected.properties.densityPerKm}
            </span>
          </div>
        )}
        {selected.properties.rawDensityPerKm != null && (
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-muted-foreground">Animals/km</span>
            <span className="font-medium">
              {selected.properties.rawDensityPerKm}
            </span>
          </div>
        )}
      </div>
    </MapPopup>
  ) : null
}
