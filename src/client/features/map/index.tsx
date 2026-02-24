import { MapControls, Map as MapView } from '@/components/ui/map'
import { ZoomToLocation } from './components/zoom-to-location'

export function MapPage() {
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
    </MapView>
  )
}
