import type {
  BackgroundLayerSpecification,
  RasterSourceSpecification,
  SourceSpecification,
  StyleSpecification,
} from 'maplibre-gl'
import type { Basemap } from '../store/layer-store'

type Theme = 'light' | 'dark'

const CANVAS_COLOR: Record<Theme, string> = {
  light: '#ffffff',
  dark: '#25221f',
}

const DARK_OVERLAY: BackgroundLayerSpecification = {
  id: 'wisr-dark-overlay',
  type: 'background',
  paint: { 'background-color': 'rgba(0, 0, 0, 0.25)' },
}

function withDarkOverlay(
  style: StyleSpecification,
  theme: Theme,
): StyleSpecification {
  if (theme !== 'dark') return style
  return { ...style, layers: [...style.layers, DARK_OVERLAY] }
}

const ESRI_WORLD_IMAGERY_URL =
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

const ESRI_IMAGERY_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'

const BC_BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www2.gov.bc.ca/gov/content/data/geographic-data-services">GeoBC</a>, OpenStreetMap, US Census Bureau, Government of Canada'

const SATELLITE_LAYER_ID = 'imagery'

// MapLibre can't resolve Esri's VectorTileServer `url` form; rewrite each
// source to an explicit XYZ `tiles` array.
function transformEsriSources(style: StyleSpecification): StyleSpecification {
  const sources: Record<string, SourceSpecification> = {}
  for (const [name, source] of Object.entries(style.sources)) {
    if (
      source.type === 'vector' &&
      'url' in source &&
      typeof source.url === 'string' &&
      source.url.includes('/VectorTileServer')
    ) {
      const base = source.url.replace(/\/$/, '')
      sources[name] = {
        type: 'vector',
        tiles: [`${base}/tile/{z}/{y}/{x}.pbf`],
        attribution: BC_BASEMAP_ATTRIBUTION,
      }
    } else {
      sources[name] = source
    }
  }
  return { ...style, sources }
}

function buildSatelliteStyle(): StyleSpecification {
  const imagery: RasterSourceSpecification = {
    type: 'raster',
    tiles: [ESRI_WORLD_IMAGERY_URL],
    tileSize: 256,
    maxzoom: 19,
    attribution: ESRI_IMAGERY_ATTRIBUTION,
  }
  return {
    version: 8,
    sources: { imagery },
    layers: [{ id: SATELLITE_LAYER_ID, type: 'raster', source: 'imagery' }],
  }
}

function buildHybridStyle(bcStyle: StyleSpecification): StyleSpecification {
  const base = transformEsriSources(bcStyle)
  const imagery: RasterSourceSpecification = {
    type: 'raster',
    tiles: [ESRI_WORLD_IMAGERY_URL],
    tileSize: 256,
    maxzoom: 19,
    attribution: ESRI_IMAGERY_ATTRIBUTION,
  }
  const overlayLayers = base.layers.filter((l) => {
    if (l.type === 'symbol') return true
    if (l.type === 'background') return false
    return (
      l.id.startsWith('TRANSPORTATION/') ||
      l.id.startsWith('POLITICAL/') ||
      l.id.startsWith('WATER/')
    )
  })
  return {
    ...base,
    sources: { ...base.sources, imagery },
    layers: [
      { id: SATELLITE_LAYER_ID, type: 'raster', source: 'imagery' },
      ...overlayLayers,
    ],
  }
}

function buildStandardStyle(
  bcStyle: StyleSpecification,
  theme: Theme,
): StyleSpecification {
  const base = transformEsriSources(bcStyle)
  const background: BackgroundLayerSpecification = {
    id: 'wisr-canvas-background',
    type: 'background',
    paint: { 'background-color': CANVAS_COLOR[theme] },
  }
  return { ...base, layers: [background, ...base.layers] }
}

export function buildBasemapStyle(
  basemap: Basemap,
  bcStyle: StyleSpecification,
  theme: Theme,
): StyleSpecification {
  switch (basemap) {
    case 'standard':
      return withDarkOverlay(buildStandardStyle(bcStyle, theme), theme)
    case 'satellite':
      return withDarkOverlay(buildSatelliteStyle(), theme)
    case 'hybrid':
      return withDarkOverlay(buildHybridStyle(bcStyle), theme)
  }
}
