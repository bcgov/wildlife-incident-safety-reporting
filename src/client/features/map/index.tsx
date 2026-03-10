import type { Incident } from '@schemas/incidents/incidents.schema'
import bbox from '@turf/bbox'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DensityLegend } from '@/components/density-legend'
import {
  MapClusterLayer,
  MapControls,
  MapPopup,
  Map as MapView,
  useMap,
} from '@/components/ui/map'
import { useIncidents } from '@/hooks/use-incidents'
import { speciesIcons } from '@/lib/species-icons'
import { useIncidentLocateStore } from '@/stores/incident-locate-store'
import { useSegmentLocateStore } from '@/stores/segment-locate-store'
import { BasemapDarkener } from './components/basemap-darkener'
import { BoundaryLayer } from './components/boundary-layer'
import { DensityLayer } from './components/density-layer'
import { DrawControls } from './components/draw-controls'
import { IncidentPopup } from './components/incident-popup'
import { LayerControls } from './components/layer-controls'
import { ZoomToLocation } from './components/zoom-to-location'
import { createGoogleMapStyle } from './lib/google-styles'
import { useLayerStore } from './store/layer-store'

export type IncidentProperties = {
  id: number
  speciesName: string
  speciesColor: string
  speciesGroupName: string
  year: number
  accidentDate: string | null
  sex: string | null
  timeOfKill: string | null
  age: string | null
  quantity: number
  nearestTown: string | null
  serviceAreaName: string | null
  contractAreaNumber: number | null
  comments: string
}

type SelectedIncident = {
  coordinates: [number, number]
  properties: IncidentProperties
}

function toGeoJSON(
  incidents: Incident[],
): GeoJSON.FeatureCollection<GeoJSON.Point, IncidentProperties> {
  return {
    type: 'FeatureCollection',
    features: incidents
      .filter(
        (i): i is Incident & { latitude: number; longitude: number } =>
          i.latitude != null && i.longitude != null,
      )
      .map((i) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [i.longitude, i.latitude],
        },
        properties: {
          id: i.id,
          speciesName: i.speciesName,
          speciesColor: i.speciesColor,
          speciesGroupName: i.speciesGroupName,
          year: i.year,
          accidentDate: i.accidentDate,
          sex: i.sex,
          timeOfKill: i.timeOfKill,
          age: i.age,
          quantity: i.quantity,
          nearestTown: i.nearestTown,
          serviceAreaName: i.serviceAreaName,
          contractAreaNumber: i.contractAreaNumber,
          comments: i.comments,
        },
      })),
  }
}

const CLUSTER_MAX_ZOOM = 22

function LocateIncident({
  onLocate,
}: {
  onLocate: (target: SelectedIncident) => void
}) {
  const { map, isLoaded } = useMap()
  const target = useIncidentLocateStore((s) => s.target)
  const clear = useIncidentLocateStore((s) => s.clear)

  useEffect(() => {
    if (!target || !map || !isLoaded) return

    const { coordinates, properties } = target

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>

    const onMoveEnd = () => {
      if (cancelled) return
      // Simulate a click at the target to trigger spiderfy on any cluster
      const point = map.project(coordinates)
      const canvas = map.getCanvas()
      const rect = canvas.getBoundingClientRect()
      canvas.dispatchEvent(
        new MouseEvent('click', {
          clientX: rect.left + point.x,
          clientY: rect.top + point.y,
          bubbles: true,
        }),
      )
      // Open the popup after spiderfy animation completes
      timeoutId = setTimeout(() => {
        if (cancelled) return
        onLocate({ coordinates, properties })
        clear()
      }, 400)
    }

    // Wait a frame for the tab to become visible so the map container
    // has correct dimensions before flying
    const rafId = requestAnimationFrame(() => {
      if (cancelled) return
      map.resize()
      // Zoom to clusterMaxZoom - 1 so spiderfy activates on click
      map.flyTo({
        center: coordinates,
        zoom: CLUSTER_MAX_ZOOM - 1,
        duration: 1500,
      })
      map.once('moveend', onMoveEnd)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      clearTimeout(timeoutId)
      map.off('moveend', onMoveEnd)
    }
  }, [target, map, isLoaded, clear, onLocate])

  return null
}

function LocateSegment() {
  const { map, isLoaded } = useMap()
  const target = useSegmentLocateStore((s) => s.target)
  const clear = useSegmentLocateStore((s) => s.clear)

  useEffect(() => {
    if (!target || !map || !isLoaded) return

    let cancelled = false

    const onMoveEnd = () => {
      if (!cancelled) clear()
    }

    const rafId = requestAnimationFrame(() => {
      if (cancelled) return
      map.resize()

      const [minLng, minLat, maxLng, maxLat] = bbox({
        type: 'Feature',
        geometry: target.geometry,
        properties: {},
      })

      if (!Number.isFinite(minLng) || !Number.isFinite(maxLng)) {
        clear()
        return
      }

      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 80, duration: 1500 },
      )
      map.once('moveend', onMoveEnd)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      map.off('moveend', onMoveEnd)
    }
  }, [target, map, isLoaded, clear])

  return null
}

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

export function Component() {
  const { data: response } = useIncidents()
  const [selected, setSelected] = useState<SelectedIncident | null>(null)
  const basemap = useLayerStore((s) => s.basemap)
  const densityVisible = useLayerStore((s) => s.layers.density)

  const incidents = response?.data
  const prevIncidentsRef = useRef(incidents)
  if (prevIncidentsRef.current !== incidents) {
    prevIncidentsRef.current = incidents
    setSelected(null)
  }

  const geojson = useMemo(() => toGeoJSON(incidents ?? []), [incidents])

  const styles = useMemo(() => {
    if (!googleMapsApiKey) return undefined
    const style = createGoogleMapStyle(basemap, googleMapsApiKey)
    return { light: style, dark: style }
  }, [basemap])

  return (
    <MapView
      className="flex-1"
      center={[-124.5, 54.5]}
      zoom={5}
      styles={styles}
    >
      <MapControls
        position="top-left"
        showZoom
        showCompass
        showLocate
        showFullscreen
        showFitBounds
        fitBoundsData={geojson}
        showResetView
        resetViewCenter={[-124.5, 54.5]}
        resetViewZoom={5}
      />
      <ZoomToLocation />
      <LayerControls position="top-right" />
      <DrawControls position="top-right" className="!top-12" />
      <BasemapDarkener />
      <LocateIncident onLocate={setSelected} />
      <LocateSegment />
      <DensityLayer />
      <BoundaryLayer />
      <MapClusterLayer<IncidentProperties>
        data={geojson}
        icons={speciesIcons}
        iconProperty="speciesGroupName"
        clusterRadius={80}
        clusterMaxZoom={CLUSTER_MAX_ZOOM}
        clusterThresholds={[50, 200]}
        spiderfy
        clusterHull
        onPointClick={(feature, coordinates) =>
          setSelected({ coordinates, properties: feature.properties })
        }
      />
      {selected && (
        <MapPopup
          key={selected.properties.id}
          longitude={selected.coordinates[0]}
          latitude={selected.coordinates[1]}
          onClose={() => setSelected(null)}
        >
          <IncidentPopup
            properties={selected.properties}
            coordinates={selected.coordinates}
            onClose={() => setSelected(null)}
          />
        </MapPopup>
      )}
      {densityVisible && (
        <div className="border-border bg-background absolute bottom-2 left-2 z-10 flex h-8 items-center overflow-hidden rounded-md border px-3 shadow-sm">
          <DensityLegend />
        </div>
      )}
    </MapView>
  )
}
