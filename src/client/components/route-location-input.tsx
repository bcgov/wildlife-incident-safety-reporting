import { Check, ChevronDown } from 'lucide-react'
import { useCallback, useState } from 'react'
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
import {
  matchRoutableLocations,
  type RoutableLocation,
} from '@/lib/routable-locations'
import { cn } from '@/lib/utils'
import type { RoutePoint } from '@/stores/route-store'
import type { GeocoderFeature } from '@/types/geocoder'

type RouteLocationInputProps = {
  placeholder: string
  value: RoutePoint | null
  onSelect: (point: RoutePoint) => void
}

export function RouteLocationInput({
  placeholder,
  value,
  onSelect,
}: RouteLocationInputProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const debouncedSetQuery = useDebounce(
    useCallback((next: string) => setDebouncedQuery(next), []),
    300,
  )

  const { data, isFetching, isError } = useGeocoderSearch(
    debouncedQuery,
    'routingPoint',
  )

  const handleInputChange = (next: string) => {
    setQuery(next)
    debouncedSetQuery(next)
  }

  const handleSelect = (feature: GeocoderFeature) => {
    const [longitude, latitude] = feature.geometry.coordinates
    onSelect({ longitude, latitude, address: feature.properties.fullAddress })
    setOpen(false)
  }

  const handleSelectRoutable = (location: RoutableLocation) => {
    onSelect({
      longitude: location.longitude,
      latitude: location.latitude,
      address: location.name,
    })
    setOpen(false)
  }

  const routableMatches = matchRoutableLocations(debouncedQuery)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex min-h-10 w-full min-w-0 items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-[color,box-shadow] hover:bg-muted dark:bg-input/30">
        <span className={cn('truncate', !value && 'text-muted-foreground')}>
          {value ? value.address : placeholder}
        </span>
        <ChevronDown className="ml-2 h-4 shrink-0 cursor-pointer text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
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
                {!isError &&
                  !isFetching &&
                  !data?.features.length &&
                  routableMatches.length === 0 && (
                    <CommandEmpty>No locations found.</CommandEmpty>
                  )}
                {routableMatches.length > 0 && (
                  <CommandGroup heading="Destinations & Crossings">
                    {routableMatches.map((location) => (
                      <CommandItem
                        key={location.name}
                        value={location.name}
                        onSelect={() => handleSelectRoutable(location)}
                      >
                        <Check
                          className={cn(
                            'mr-2 size-4',
                            value?.address === location.name
                              ? 'opacity-100'
                              : 'opacity-0',
                          )}
                        />
                        {location.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {data?.features.length ? (
                  <CommandGroup heading="Addresses">
                    {data.features.map((feature) => (
                      <CommandItem
                        key={feature.properties.fullAddress}
                        value={feature.properties.fullAddress}
                        onSelect={() => handleSelect(feature)}
                      >
                        <Check
                          className={cn(
                            'mr-2 size-4',
                            value?.address === feature.properties.fullAddress
                              ? 'opacity-100'
                              : 'opacity-0',
                          )}
                        />
                        {feature.properties.fullAddress}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
