import type * as MapLibreGL from 'maplibre-gl'

// Layers that own their own pointer handling; anything rendered beneath
// them defers so a single click never opens two popups
const APP_FEATURE_MATCHERS: Array<(layerId: string) => boolean> = [
  (id) => id === 'density-line',
  (id) => id.startsWith('clusters-'),
  (id) => id.startsWith('unclustered-point-'),
  (id) => id.startsWith('cluster-count-'),
  (id) => id.startsWith('cluster-hull-'),
  (id) => id.startsWith('td-'),
  (id) => id.startsWith('route-'),
  (id) => id.includes('-spiderfy-leaf'),
]

export function hasOverlappingAppFeatures(
  map: MapLibreGL.Map,
  point: MapLibreGL.PointLike,
  ownLayerIds: string[],
): boolean {
  return map
    .queryRenderedFeatures(point)
    .some(
      (f) =>
        !ownLayerIds.includes(f.layer.id) &&
        APP_FEATURE_MATCHERS.some((matches) => matches(f.layer.id)),
    )
}
