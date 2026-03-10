import { MapPin } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  MapMarker,
  MarkerContent,
  MarkerPopup,
  useMap,
} from '@/components/ui/map'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocationStore } from '@/stores/location-store'
import { getStreetViewUrl } from '../lib/street-view'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

type DetailRowProps = {
  label: string
  value: string | number | null | undefined
}

function DetailRow({ label, value }: DetailRowProps) {
  if (value == null || value === '') return null
  return (
    <div className="flex justify-between gap-4 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{String(value)}</span>
    </div>
  )
}

export function ZoomToLocation() {
  const { map } = useMap()
  const location = useLocationStore((s) => s.location)
  const clearLocation = useLocationStore((s) => s.clearLocation)
  const prevLocationRef = useRef<typeof location>(null)
  const [view, setView] = useState<'details' | 'streetview'>('details')
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const cachedUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!map || !location) return
    if (
      prevLocationRef.current?.longitude === location.longitude &&
      prevLocationRef.current?.latitude === location.latitude
    ) {
      return
    }
    prevLocationRef.current = location

    setView('details')
    cachedUrlRef.current = null
    setEmbedUrl(null)
    setIframeLoaded(false)

    map.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 14,
      duration: 1500,
    })
  }, [map, location])

  const handleToggle = useCallback(async () => {
    if (!location) return

    if (view === 'streetview') {
      setView('details')
      return
    }

    setView('streetview')

    if (cachedUrlRef.current) {
      setEmbedUrl(cachedUrlRef.current)
      return
    }

    setLoading(true)
    setIframeLoaded(false)
    const url = await getStreetViewUrl(
      location.latitude,
      location.longitude,
      GOOGLE_MAPS_API_KEY,
    )
    cachedUrlRef.current = url
    setEmbedUrl(url)
    setLoading(false)
  }, [view, location])

  if (!location) return null

  return (
    <MapMarker longitude={location.longitude} latitude={location.latitude}>
      <MarkerContent>
        <MapPin className="size-8 -translate-y-1/2 fill-red-500 text-red-700" />
      </MarkerContent>
      <MarkerPopup>
        <div className="flex w-96 flex-col gap-2">
          <p className="text-sm font-semibold">{location.address}</p>

          {view === 'details' ? (
            <div className="flex flex-col gap-1">
              <DetailRow
                label="Coordinates"
                value={`${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
              />
              {location.serviceArea && (
                <>
                  <DetailRow
                    label="Service Area"
                    value={`${location.serviceArea.contractAreaNumber} - ${location.serviceArea.name}`}
                  />
                  <DetailRow
                    label="District"
                    value={location.serviceArea.district}
                  />
                  <DetailRow
                    label="Region"
                    value={location.serviceArea.region}
                  />
                </>
              )}
            </div>
          ) : (
            <div className="relative h-[280px] w-full overflow-hidden rounded-sm">
              {(loading || !iframeLoaded) && (
                <Skeleton className="absolute inset-0 h-full w-full" />
              )}
              {embedUrl && (
                <iframe
                  title="Street View"
                  src={embedUrl}
                  className="h-full w-full border-0"
                  onLoad={() => setIframeLoaded(true)}
                  referrerPolicy="no-referrer-when-downgrade"
                  loading="lazy"
                  allowFullScreen
                />
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <Button size="sm" onClick={handleToggle}>
              {view === 'details' ? 'Street View' : 'Details'}
            </Button>
            <Button variant="outline" size="sm" onClick={clearLocation}>
              Clear
            </Button>
          </div>
        </div>
      </MarkerPopup>
    </MapMarker>
  )
}
