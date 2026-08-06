import type { LookupResponse } from '@schemas/service-areas/lookup.schema'
import { ChevronsUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  LocationOption,
  LocationSearchStatus,
} from '@/components/location-search'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  MIN_QUERY_LENGTH,
  useLocationSearch,
} from '@/hooks/use-location-search'
import { apiClient } from '@/lib/apiClient'
import { useLocationStore } from '@/stores/location-store'
import type { GeocoderFeature } from '@/types/geocoder'

export function SearchAddress() {
  const [open, setOpen] = useState(false)
  const location = useLocationStore((s) => s.location)
  const setLocation = useLocationStore((s) => s.setLocation)

  const {
    query,
    debouncedQuery,
    handleInputChange,
    data,
    isFetching,
    isError,
  } = useLocationSearch()

  const handleSelect = (feature: GeocoderFeature) => {
    const [longitude, latitude] = feature.geometry.coordinates
    const address = feature.properties.fullAddress
    const isAlreadySelected = location?.address === address
    if (isAlreadySelected) {
      useLocationStore.getState().clearLocation()
    } else {
      setLocation({ longitude, latitude, address })
      // Fire-and-forget: enrich with service area data after map flies
      apiClient
        .get<LookupResponse>(
          `/v1/service-areas/lookup?lng=${longitude}&lat=${latitude}`,
        )
        .then((data) => {
          // Re-read current state to avoid overwriting a cleared location
          const current = useLocationStore.getState().location
          if (
            current?.longitude === longitude &&
            current.latitude === latitude
          ) {
            setLocation({ ...current, serviceArea: data })
          }
        })
        .catch(() => {
          // Graceful - leave serviceArea undefined on failure
        })
    }
    setOpen(false)
  }

  const grouped = useMemo(() => {
    if (!data?.features.length) return null

    const groups = new Map<string, GeocoderFeature[]>()
    for (const feature of data.features) {
      const type = feature.properties.localityType || 'Other'
      const existing = groups.get(type)
      if (existing) {
        existing.push(feature)
      } else {
        groups.set(type, [feature])
      }
    }
    return groups
  }, [data])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex w-80 min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/40">
        <span className="truncate">
          {location ? location.address : 'Search for a place...'}
        </span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search for location in BC..."
            value={query}
            onValueChange={handleInputChange}
          />
          <CommandList>
            {debouncedQuery.length >= MIN_QUERY_LENGTH && (
              <>
                <LocationSearchStatus
                  isFetching={isFetching}
                  isError={isError}
                  hasData={Boolean(data)}
                  hasResults={Boolean(data?.features.length)}
                  emptyMessage="No addresses found."
                />
                {grouped &&
                  Array.from(grouped.entries()).map(([type, features]) => (
                    <CommandGroup key={type} heading={type}>
                      {features.map((feature) => (
                        <LocationOption
                          key={feature.properties.fullAddress}
                          value={feature.properties.fullAddress}
                          selected={
                            location?.address === feature.properties.fullAddress
                          }
                          onSelect={() => handleSelect(feature)}
                        >
                          {feature.properties.fullAddress}
                        </LocationOption>
                      ))}
                    </CommandGroup>
                  ))}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
