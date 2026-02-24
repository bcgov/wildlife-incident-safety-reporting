import { MapControls, Map as MapView } from '@/components/ui/map'

export function MainContent() {
  return (
    <MapView className="flex-1" center={[-124.5, 54.5]} zoom={5}>
      <MapControls position="top-left" showZoom showCompass showLocate showFullscreen />
    </MapView>
  )
}
