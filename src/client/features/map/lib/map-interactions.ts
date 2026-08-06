import type * as MapLibreGL from 'maplibre-gl'

// Layers that own their own pointer handling; anything rendered beneath
// them defers so a single click never opens two popups
const APP_LAYER_PREFIXES = [
  'density-line',
  'clusters-',
  'unclustered-point-',
  'cluster-count-',
  'cluster-hull-',
  'td-',
  'route-',
]

const isAppFeatureLayer = (id: string) =>
  APP_LAYER_PREFIXES.some((prefix) => id.startsWith(prefix)) ||
  id.includes('-spiderfy-leaf')

export function hasOverlappingAppFeatures(
  map: MapLibreGL.Map,
  point: MapLibreGL.PointLike,
  ownLayerIds: string[],
): boolean {
  return map
    .queryRenderedFeatures(point)
    .some(
      (f) => !ownLayerIds.includes(f.layer.id) && isAppFeatureLayer(f.layer.id),
    )
}
