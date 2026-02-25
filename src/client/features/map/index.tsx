import type { Incident } from '@schemas/incidents/incidents.schema'
import { useMemo, useState } from 'react'
import {
  MapClusterLayer,
  MapControls,
  MapPopup,
  Map as MapView,
} from '@/components/ui/map'
import { ZoomToLocation } from './components/zoom-to-location'
import { useIncidents } from './hooks/use-incidents'

type IncidentProperties = {
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
        },
      })),
  }
}

export function MapPage() {
  const { data: response } = useIncidents()
  const [selected, setSelected] = useState<SelectedIncident | null>(null)

  const geojson = useMemo(
    () => toGeoJSON(response?.data ?? []),
    [response?.data],
  )

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
      <MapClusterLayer<IncidentProperties>
        data={geojson}
        clusterRadius={50}
        clusterMaxZoom={14}
        clusterThresholds={[50, 200]}
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
          closeButton
        >
          <div className="flex flex-col gap-1 pr-4">
            <p className="font-medium text-sm">
              {selected.properties.speciesName}
            </p>
            {selected.properties.nearestTown && (
              <p className="text-xs text-muted-foreground">
                Near {selected.properties.nearestTown}
              </p>
            )}
            {selected.properties.accidentDate && (
              <p className="text-xs text-muted-foreground">
                {new Date(selected.properties.accidentDate).toLocaleDateString(
                  undefined,
                  { timeZone: 'UTC' },
                )}
              </p>
            )}
            <div className="flex gap-2 text-xs text-muted-foreground">
              {selected.properties.sex && (
                <span>{selected.properties.sex}</span>
              )}
              {selected.properties.age && (
                <span>{selected.properties.age}</span>
              )}
              {selected.properties.timeOfKill && (
                <span>{selected.properties.timeOfKill}</span>
              )}
            </div>
            {selected.properties.serviceAreaName && (
              <p className="text-xs text-muted-foreground">
                {selected.properties.serviceAreaName}
              </p>
            )}
          </div>
        </MapPopup>
      )}
    </MapView>
  )
}
