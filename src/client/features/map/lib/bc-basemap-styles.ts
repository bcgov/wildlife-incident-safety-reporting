import type {
  BackgroundLayerSpecification,
  LayerSpecification,
  RasterSourceSpecification,
  SourceSpecification,
  StyleSpecification,
} from 'maplibre-gl'
import type { Basemap } from '../store/layer-store'

type Theme = 'light' | 'dark'

const CANVAS_COLOR = '#ffffff'

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

// ArcGIS ships no Bold Italic atlas, so Bold+Italic collapses to Bold.
function rewriteTextFonts(layers: LayerSpecification[]): LayerSpecification[] {
  return layers.map((l) => {
    if (l.type !== 'symbol') return l
    const original = l.layout?.['text-font']
    if (!Array.isArray(original)) return l
    const hasBold = original.some(
      (f) => typeof f === 'string' && /bold/i.test(f),
    )
    const hasItalic = original.some(
      (f) => typeof f === 'string' && /italic/i.test(f),
    )
    const font = hasBold
      ? 'BC Sans Bold'
      : hasItalic
        ? 'BC Sans Italic'
        : 'BC Sans Regular'
    return { ...l, layout: { ...l.layout, 'text-font': [font] } }
  })
}

// Upstream sometimes emits layer-id paths (with '/') as icon-image values;
// real sprite keys never contain '/'. Remap known ones, strip the rest.
const ICON_IMAGE_REMAP: Record<string, string> = {
  'POLITICAL/Natural & Historic Sites/National Historic Site':
    'Historic Site Point',
  'POLITICAL/Populated Places/Cities': 'Cities Point',
  'POLITICAL/Populated Places/Towns Villages': 'Towns and Villages Point',
  'TRANSPORTATION/DRA Overpasses/Trail FO': 'Trail Overpass (FO)',
  'TRANSPORTATION/DRA Overpasses/Trail OO': 'Trail Overpass (OO)',
  'TRANSPORTATION/DRA Overpasses/Trail TO': 'Trail Overpass (TO)',
}

function fixIconImages(layers: LayerSpecification[]): LayerSpecification[] {
  return layers.map((l) => {
    if (l.type !== 'symbol') return l
    const ii = l.layout?.['icon-image']
    if (typeof ii !== 'string' || !ii.includes('/')) return l
    const remap = ICON_IMAGE_REMAP[ii]
    if (remap) {
      return { ...l, layout: { ...l.layout, 'icon-image': remap } }
    }
    const { 'icon-image': _stripped, ...layout } = l.layout ?? {}
    return { ...l, layout }
  })
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

function buildStandardStyle(bcStyle: StyleSpecification): StyleSpecification {
  const base = transformEsriSources(bcStyle)
  const background: BackgroundLayerSpecification = {
    id: 'wisr-canvas-background',
    type: 'background',
    paint: { 'background-color': CANVAS_COLOR },
  }
  return { ...base, layers: [background, ...base.layers] }
}

export function buildBasemapStyle(
  basemap: Basemap,
  bcStyle: StyleSpecification,
  theme: Theme,
): StyleSpecification {
  const style = (() => {
    switch (basemap) {
      case 'standard':
        return buildStandardStyle(bcStyle)
      case 'satellite':
        return buildSatelliteStyle()
      case 'hybrid':
        return buildHybridStyle(bcStyle)
    }
  })()
  return withDarkOverlay(
    { ...style, layers: fixIconImages(rewriteTextFonts(style.layers)) },
    theme,
  )
}
