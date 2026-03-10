import type { LookupResponse } from '@schemas/service-areas/lookup.schema'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useDebounce } from '@/hooks/use-debounce'
import { useGeocoderSearch } from '@/hooks/use-geocoder-search'
import { apiClient } from '@/lib/apiClient'
import { cn } from '@/lib/utils'
import { useLocationStore } from '@/stores/location-store'
import type { GeocoderFeature } from '@/types/geocoder'

export function SearchAddress() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const location = useLocationStore((s) => s.location)
  const setLocation = useLocationStore((s) => s.setLocation)

  const debouncedSetQuery = useDebounce(
    useCallback((value: string) => setDebouncedQuery(value), []),
    300,
  )

  const { data, isFetching, isError } = useGeocoderSearch(debouncedQuery)

  const handleInputChange = (value: string) => {
    setQuery(value)
    debouncedSetQuery(value)
  }

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
      <PopoverTrigger className="ml-auto flex min-w-0 flex-1 items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/40 md:flex-none md:w-80">
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
            {debouncedQuery.length >= 3 && (
              <>
                {isFetching && !data && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Searching...
                  </div>
                )}
                {isError && (
                  <CommandEmpty>
                    Failed to fetch addresses. Please try again.
                  </CommandEmpty>
                )}
                {!isError && !isFetching && !data?.features.length && (
                  <CommandEmpty>No addresses found.</CommandEmpty>
                )}
                {grouped &&
                  Array.from(grouped.entries()).map(([type, features]) => (
                    <CommandGroup key={type} heading={type}>
                      {features.map((feature) => (
                        <CommandItem
                          key={feature.properties.fullAddress}
                          value={feature.properties.fullAddress}
                          onSelect={() => handleSelect(feature)}
                        >
                          <Check
                            className={cn(
                              'mr-2 size-4',
                              location?.address ===
                                feature.properties.fullAddress
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          {feature.properties.fullAddress}
                        </CommandItem>
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
