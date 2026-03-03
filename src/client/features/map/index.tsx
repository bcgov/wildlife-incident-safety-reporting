import type { Incident } from '@schemas/incidents/incidents.schema'
import { useMemo, useRef, useState } from 'react'
import {
  MapClusterLayer,
  MapControls,
  MapPopup,
  Map as MapView,
} from '@/components/ui/map'
import { DrawControls } from './components/draw-controls'
import { IncidentPopup } from './components/incident-popup'
import { ZoomToLocation } from './components/zoom-to-location'
import { useIncidents } from './hooks/use-incidents'
import { speciesIcons } from './lib/species-icons'

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

export function Component() {
  const { data: response } = useIncidents()
  const [selected, setSelected] = useState<SelectedIncident | null>(null)

  const incidents = response?.data
  const prevIncidentsRef = useRef(incidents)
  if (prevIncidentsRef.current !== incidents) {
    prevIncidentsRef.current = incidents
    setSelected(null)
  }

  const geojson = useMemo(() => toGeoJSON(incidents ?? []), [incidents])

  return (
    <MapView className="flex-1" center={[-124.5, 54.5]} zoom={5}>
      <MapControls
        position="top-left"
        showZoom
        showCompass
        showLocate
        showFullscreen
      />
      <ZoomToLocation />
      <DrawControls position="top-right" />
      <MapClusterLayer<IncidentProperties>
        data={geojson}
        icons={speciesIcons}
        iconProperty="speciesGroupName"
        clusterRadius={80}
        clusterMaxZoom={22}
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
    </MapView>
  )
}
