import type MapLibreGL from 'maplibre-gl'
import { useEffect } from 'react'
import { useMap } from '@/components/ui/map'
import type { IncidentProperties } from '../index'

const SOURCE_ID = 'incident-heatmap-source'
const LAYER_ID = 'incident-heatmap'

type Props = {
  data: GeoJSON.FeatureCollection<GeoJSON.Point, IncidentProperties>
}

export function IncidentHeatmapLayer({ data }: Props) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!isLoaded || !map) return

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })

    map.addLayer({
      id: LAYER_ID,
      type: 'heatmap',
      source: SOURCE_ID,
      maxzoom: 16,
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'quantity'], 1],
          0,
          0,
          5,
          1,
        ],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 16, 3],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(33, 102, 172, 0)',
          0.2,
          'rgb(103, 169, 207)',
          0.4,
          'rgb(166, 217, 106)',
          0.6,
          'rgb(253, 219, 39)',
          0.8,
          'rgb(244, 109, 67)',
          1,
          'rgb(178, 24, 43)',
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          2,
          9,
          20,
          16,
          40,
        ],
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7,
          0.9,
          16,
          0.5,
        ],
      },
    })

    return () => {
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
      } catch {
        // Map may already be removed
      }
    }
  }, [isLoaded, map])

  useEffect(() => {
    if (!isLoaded || !map) return

    const source = map.getSource(SOURCE_ID) as MapLibreGL.GeoJSONSource
    if (source) source.setData(data)
  }, [isLoaded, map, data])

  return null
}
