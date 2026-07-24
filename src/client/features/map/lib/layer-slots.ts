import type MapLibreGL from 'maplibre-gl'

const SOURCE_ID = 'layer-slots'

// MapLibre has no z-index, so these empty anchors give each tier a fixed
// insertion point. Pass a tier's anchor as beforeId to land inside that tier.
export const SLOTS = {
  boundaries: 'slot-boundaries',
  boundaryHighlight: 'slot-boundary-highlight',
  density: 'slot-density',
  draw: 'slot-draw',
  incidents: 'slot-incidents',
} as const

const SLOT_ORDER = [
  SLOTS.boundaries,
  SLOTS.boundaryHighlight,
  SLOTS.density,
  SLOTS.draw,
  SLOTS.incidents,
]

// A style swap drops these, so whichever layer mounts first rebuilds them
export function ensureSlots(map: MapLibreGL.Map) {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }

  for (const id of SLOT_ORDER) {
    if (!map.getLayer(id)) {
      map.addLayer({ id, type: 'symbol', source: SOURCE_ID })
    }
  }
}
