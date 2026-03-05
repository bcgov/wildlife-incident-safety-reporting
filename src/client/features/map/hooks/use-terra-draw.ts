import area from '@turf/area'
import length from '@turf/length'
import type { Feature, Geometry, LineString, Polygon, Position } from 'geojson'
import type { MapMouseEvent } from 'maplibre-gl'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type GeoJSONStoreFeatures,
  type GeoJSONStoreGeometries,
  TerraDraw,
  TerraDrawCircleMode,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawRenderMode,
  TerraDrawSelectMode,
} from 'terra-draw'
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'
import { useMap } from '@/components/ui/map'
import { useFilterStore } from '@/stores/filter-store'

export type DrawMode = 'polygon' | 'rectangle' | 'circle' | 'measure' | 'select'

export type MeasurementPopup = {
  lngLat: [number, number]
  text: string
}

const FILL_COLOR = '#FCBA19' as const // BC Gov Gold-100
const OUTLINE_COLOR = '#F8BA47' as const // BC Gov Gold-90
const CLOSING_POINT_OUTLINE = '#ffffff' as const
const FILL_OPACITY = 0.15
const OUTLINE_WIDTH = 2

// Terra-draw layer IDs (default "td" prefix)
const TD_POLYGON_LAYER = 'td-polygon'
const TD_LINESTRING_LAYER = 'td-linestring'

function formatArea(squareMeters: number): string {
  if (squareMeters >= 1_000_000) {
    return `${(squareMeters / 1_000_000).toFixed(1)} km²`
  }
  return `${(squareMeters / 10_000).toFixed(1)} ha`
}

function formatLength(km: number): string {
  if (km >= 1) {
    return `${km.toFixed(1)} km`
  }
  return `${Math.round(km * 1000)} m`
}

// Combine polygon features into a single Polygon or MultiPolygon geometry
function combinePolygons(
  features: (GeoJSONStoreFeatures<GeoJSONStoreGeometries> | undefined)[],
): { geometry: Geometry; totalArea: number } | null {
  const polygons: Position[][][] = []
  let totalArea = 0

  for (const feature of features) {
    if (!feature) continue
    const geom = feature.geometry
    if (geom.type !== 'Polygon') continue
    polygons.push(geom.coordinates as Position[][])
    totalArea += area(feature as Feature<Polygon>)
  }

  if (polygons.length === 0) return null
  if (polygons.length === 1) {
    return {
      geometry: { type: 'Polygon', coordinates: polygons[0] },
      totalArea,
    }
  }
  return {
    geometry: { type: 'MultiPolygon', coordinates: polygons },
    totalArea,
  }
}

export function useTerraDraw() {
  const { map, isLoaded } = useMap()
  const drawRef = useRef<TerraDraw | null>(null)
  const [activeMode, setActiveMode] = useState<DrawMode | null>(null)
  const [measurementPopup, setMeasurementPopup] =
    useState<MeasurementPopup | null>(null)
  const setGeometry = useFilterStore((s) => s.setGeometry)
  const geometry = useFilterStore((s) => s.geometry)

  // Stored measurement text so clicking the geometry can re-show the popup
  const measurementRef = useRef<string | null>(null)
  const [hasMeasurement, setHasMeasurement] = useState(false)
  // Suppress the click handler right after a drawing finishes
  const justFinishedRef = useRef(false)
  // Track all drawn polygon feature IDs
  const featureIdsRef = useRef<Set<string | number>>(new Set())
  // Preserve drawn features across style changes (theme switch)
  const snapshotRef = useRef<
    GeoJSONStoreFeatures<GeoJSONStoreGeometries>[] | null
  >(null)

  // Sync terra-draw canvas when geometry is cleared externally (sidebar clear button)
  useEffect(() => {
    if (geometry !== null) return
    const draw = drawRef.current
    if (!draw) return

    draw.clear()
    draw.setMode('idle')
    setActiveMode(null)
    featureIdsRef.current.clear()
    measurementRef.current = null
    setHasMeasurement(false)
    setMeasurementPopup(null)
  }, [geometry])

  useEffect(() => {
    if (!map || !isLoaded) return

    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
      modes: [
        new TerraDrawPolygonMode({
          styles: {
            fillColor: FILL_COLOR,
            fillOpacity: FILL_OPACITY,
            outlineColor: OUTLINE_COLOR,
            outlineWidth: OUTLINE_WIDTH,
            closingPointColor: OUTLINE_COLOR,
            closingPointWidth: 6,
            closingPointOutlineColor: CLOSING_POINT_OUTLINE,
            closingPointOutlineWidth: 2,
          },
        }),
        new TerraDrawRectangleMode({
          styles: {
            fillColor: FILL_COLOR,
            fillOpacity: FILL_OPACITY,
            outlineColor: OUTLINE_COLOR,
            outlineWidth: OUTLINE_WIDTH,
          },
        }),
        new TerraDrawCircleMode({
          styles: {
            fillColor: FILL_COLOR,
            fillOpacity: FILL_OPACITY,
            outlineColor: OUTLINE_COLOR,
            outlineWidth: OUTLINE_WIDTH,
          },
        }),
        new TerraDrawLineStringMode({
          styles: {
            lineStringColor: OUTLINE_COLOR,
            lineStringWidth: OUTLINE_WIDTH,
            closingPointColor: OUTLINE_COLOR,
            closingPointWidth: 6,
            closingPointOutlineColor: CLOSING_POINT_OUTLINE,
            closingPointOutlineWidth: 2,
          },
        }),
        new TerraDrawSelectMode({
          flags: {
            polygon: {
              feature: {
                draggable: true,
                coordinates: {
                  midpoints: true,
                  draggable: true,
                  deletable: true,
                },
              },
            },
            rectangle: {
              feature: {
                draggable: true,
                coordinates: {
                  midpoints: true,
                  draggable: true,
                  deletable: true,
                },
              },
            },
            circle: {
              feature: {
                draggable: true,
                scaleable: true,
                coordinates: { midpoints: false, draggable: false },
              },
            },
          },
          styles: {
            selectedPolygonColor: FILL_COLOR,
            selectedPolygonFillOpacity: 0.2,
            selectedPolygonOutlineColor: OUTLINE_COLOR,
            selectedPolygonOutlineWidth: 2,
            selectionPointColor: OUTLINE_COLOR,
            selectionPointWidth: 6,
            selectionPointOutlineColor: CLOSING_POINT_OUTLINE,
            selectionPointOutlineWidth: 2,
          },
        }),
        new TerraDrawRenderMode({ modeName: 'idle', styles: {} }),
      ],
    })

    draw.start()

    // Restore features from before a style change (theme switch)
    if (snapshotRef.current) {
      draw.addFeatures(snapshotRef.current)
      snapshotRef.current = null
    }

    // Move terra-draw layers below cluster/marker layers so drawn shapes
    // sit between the basemap and interactive point layers
    const styleLayers = map.getStyle()?.layers ?? []
    const firstClusterLayer = styleLayers.find(
      (l) =>
        l.id.startsWith('clusters-') ||
        l.id.startsWith('unclustered-point-') ||
        l.id.startsWith('cluster-hull-'),
    )
    if (firstClusterLayer) {
      for (const layer of styleLayers) {
        if (layer.id.startsWith('td-')) {
          map.moveLayer(layer.id, firstClusterLayer.id)
        }
      }
    }

    // Recompute combined geometry from all tracked polygon features
    const recomputeGeometry = () => {
      const features = [...featureIdsRef.current].map((id) =>
        draw.getSnapshotFeature(id),
      )
      const result = combinePolygons(features)
      if (result) {
        measurementRef.current = formatArea(result.totalArea)
        setHasMeasurement(true)
        setGeometry(result.geometry)
      } else {
        measurementRef.current = null
        setHasMeasurement(false)
        setGeometry(null)
      }
    }

    draw.on('finish', (id, context) => {
      // Ignore finish events from select mode (fired after drag/resize)
      if (context.mode === 'select') return

      const feature = draw.getSnapshotFeature(id)
      if (!feature) {
        draw.setMode('idle')
        setActiveMode(null)
        return
      }

      const geom = feature.geometry as Geometry
      if (geom.type === 'Polygon') {
        featureIdsRef.current.add(id)
        recomputeGeometry()
      } else if (geom.type === 'LineString') {
        const km = length(feature as Feature<LineString>, {
          units: 'kilometers',
        })
        measurementRef.current = formatLength(km)
        setHasMeasurement(true)
      }

      draw.setMode('idle')
      setActiveMode(null)

      justFinishedRef.current = true
      requestAnimationFrame(() => {
        justFinishedRef.current = false
      })
    })

    // Sync store when shapes are edited or deleted in select mode
    draw.on('change', (ids, type) => {
      if (type.includes('delete')) {
        let changed = false
        for (const id of ids) {
          if (featureIdsRef.current.delete(id)) changed = true
        }
        if (changed) recomputeGeometry()
        return
      }

      if (!type.includes('update')) return

      for (const id of ids) {
        if (!featureIdsRef.current.has(id)) continue

        const feature = draw.getSnapshotFeature(id)
        if (!feature) continue
        if (feature.properties.mode === 'select') continue

        recomputeGeometry()
        break
      }
    })

    // Show measurement popup when clicking drawn geometry
    const getTdLayers = () =>
      [TD_POLYGON_LAYER, TD_LINESTRING_LAYER].filter((id) => map.getLayer(id))

    // Check if any cluster or marker features exist at a point
    const hasClusterFeatures = (point: MapMouseEvent['point']) => {
      const all = map.queryRenderedFeatures(point)
      return all.some(
        (f) =>
          f.layer.id.startsWith('clusters-') ||
          f.layer.id.startsWith('unclustered-point-') ||
          f.layer.id.startsWith('cluster-count-'),
      )
    }

    const handleClick = (e: MapMouseEvent) => {
      if (!measurementRef.current || justFinishedRef.current) return
      if (draw.getMode() !== 'idle') return

      const layers = getTdLayers()
      if (layers.length === 0) return

      const features = map.queryRenderedFeatures(e.point, { layers })
      if (features.length > 0 && !hasClusterFeatures(e.point)) {
        setMeasurementPopup({
          lngLat: [e.lngLat.lng, e.lngLat.lat],
          text: measurementRef.current,
        })
      }
    }

    const handleMouseMove = (e: MapMouseEvent) => {
      if (!measurementRef.current) return
      // Don't override cursor during drawing or select mode
      if (draw.getMode() !== 'idle') return

      const layers = getTdLayers()
      if (layers.length === 0) return

      const features = map.queryRenderedFeatures(e.point, { layers })
      map.getCanvas().style.cursor = features.length > 0 ? 'pointer' : ''
    }

    map.on('click', handleClick)
    map.on('mousemove', handleMouseMove)
    drawRef.current = draw

    return () => {
      map.off('click', handleClick)
      map.off('mousemove', handleMouseMove)
      map.getCanvas().style.cursor = ''
      // Snapshot features before teardown so they survive style changes
      const snapshot = draw.getSnapshot()
      snapshotRef.current = snapshot.length > 0 ? snapshot : null
      // Style changes (e.g. Google basemap theme swap) can remove td-* sources
      // before terra-draw's adapter tries to clear them, so guard the teardown
      try {
        draw.stop()
      } catch {
        // Sources already removed by style change - safe to ignore
      }
      drawRef.current = null
    }
  }, [map, isLoaded, setGeometry])

  const activeModeRef = useRef(activeMode)
  activeModeRef.current = activeMode

  const startDrawing = useCallback((mode: DrawMode) => {
    const draw = drawRef.current
    if (!draw) return

    // Toggle off if clicking the already-active mode
    if (mode === activeModeRef.current) {
      draw.setMode('idle')
      setActiveMode(null)
      return
    }

    if (mode === 'select') {
      draw.setMode('select')
      setActiveMode('select')
      return
    }

    setMeasurementPopup(null)

    if (mode === 'measure') {
      // Clear any previous measurement linestring but keep polygon features
      const snapshot = draw.getSnapshot()
      const lineIds = snapshot
        .filter((f) => f.geometry.type === 'LineString' && f.id != null)
        .map((f) => f.id as string | number)
      if (lineIds.length > 0) draw.removeFeatures(lineIds)
      measurementRef.current = null
      setHasMeasurement(false)
      draw.setMode('linestring')
    } else {
      draw.setMode(mode)
    }
    setActiveMode(mode)
  }, [])

  const clearDrawing = useCallback(() => {
    const draw = drawRef.current
    if (!draw) return

    draw.clear()
    draw.setMode('idle')
    setActiveMode(null)
    featureIdsRef.current.clear()
    measurementRef.current = null
    setHasMeasurement(false)
    setMeasurementPopup(null)
    setGeometry(null)
  }, [setGeometry])

  const dismissMeasurement = useCallback(() => {
    setMeasurementPopup(null)
  }, [])

  return {
    activeMode,
    measurementPopup,
    hasDrawing: geometry !== null || hasMeasurement,
    startDrawing,
    clearDrawing,
    dismissMeasurement,
  }
}
