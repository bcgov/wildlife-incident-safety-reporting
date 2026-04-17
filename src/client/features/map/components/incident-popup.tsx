import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { config } from '@/lib/config'
import type { IncidentProperties } from '../index'
import { getStreetViewUrl } from '../lib/street-view'

const GOOGLE_MAPS_API_KEY = config.googleMapsApiKey

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

type IncidentPopupProps = {
  properties: IncidentProperties
  coordinates: [number, number]
  onClose: () => void
}

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

export function IncidentPopup({
  properties,
  coordinates,
  onClose,
}: IncidentPopupProps) {
  const [view, setView] = useState<'details' | 'streetview'>('details')
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const cachedUrlRef = useRef<string | null>(null)

  const [lng, lat] = coordinates

  const formattedDate = properties.accidentDate
    ? new Date(properties.accidentDate).toLocaleDateString(undefined, {
        timeZone: 'UTC',
      })
    : null

  const handleToggle = useCallback(async () => {
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
    const url = await getStreetViewUrl(lat, lng, GOOGLE_MAPS_API_KEY)
    cachedUrlRef.current = url
    setEmbedUrl(url)
    setLoading(false)
  }, [view, lat, lng])

  return (
    <div className="flex w-96 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{properties.speciesGroupName}</p>
        <span className="text-xs text-muted-foreground">#{properties.id}</span>
      </div>

      {view === 'details' ? (
        <div className="flex flex-col gap-1">
          <DetailRow label="Date" value={formattedDate} />
          <DetailRow label="Nearest Town" value={properties.nearestTown} />
          <DetailRow
            label="Sex"
            value={properties.sex && titleCase(properties.sex)}
          />
          <DetailRow
            label="Age"
            value={properties.age && titleCase(properties.age)}
          />
          <DetailRow
            label="Time of Kill"
            value={properties.timeOfKill && titleCase(properties.timeOfKill)}
          />
          <DetailRow label="Quantity" value={properties.quantity} />
          <DetailRow
            label="Service Area"
            value={
              properties.contractAreaNumber && properties.serviceAreaName
                ? `${properties.contractAreaNumber} - ${properties.serviceAreaName}`
                : properties.serviceAreaName
            }
          />
          {properties.comments && (
            <div className="mt-1 border-t pt-1">
              <p className="text-xs text-muted-foreground">Comments</p>
              <p className="text-xs">{properties.comments}</p>
            </div>
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
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}
