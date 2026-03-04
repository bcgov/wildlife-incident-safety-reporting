import type { StyleSpecification } from 'maplibre-gl'
import type { Basemap } from '../store/layer-store'

const tileUrls: Record<Basemap, (key: string) => string> = {
  roadmap: (key) => `google://roadmap/{z}/{x}/{y}?key=${key}`,
  satellite: (key) => `google://satellite/{z}/{x}/{y}?key=${key}`,
  hybrid: (key) =>
    `google://satellite/{z}/{x}/{y}?key=${key}&layerType=layerRoadmap`,
  traffic: (key) =>
    `google://roadmap/{z}/{x}/{y}?key=${key}&layerType=layerTraffic`,
}

export function createGoogleMapStyle(
  basemap: Basemap,
  key: string,
): StyleSpecification {
  return {
    version: 8,
    sources: {
      google: {
        type: 'raster',
        tiles: [tileUrls[basemap](key)],
        tileSize: 256,
        attribution: '&copy; Google Maps',
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: 'google',
        type: 'raster',
        source: 'google',
      },
    ],
  }
}
