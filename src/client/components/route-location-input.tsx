import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
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
  const {
    query,
    debouncedQuery,
    handleInputChange,
    data,
    isFetching,
    isError,
  } = useLocationSearch('routingPoint')

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
            {debouncedQuery.length >= MIN_QUERY_LENGTH && (
              <>
                <LocationSearchStatus
                  isFetching={isFetching}
                  isError={isError}
                  hasData={Boolean(data)}
                  hasResults={
                    Boolean(data?.features.length) || routableMatches.length > 0
                  }
                  emptyMessage="No locations found."
                />
                {routableMatches.length > 0 && (
                  <CommandGroup heading="Destinations & Crossings">
                    {routableMatches.map((location) => (
                      <LocationOption
                        key={location.name}
                        value={location.name}
                        selected={value?.address === location.name}
                        onSelect={() => handleSelectRoutable(location)}
                      >
                        {location.name}
                      </LocationOption>
                    ))}
                  </CommandGroup>
                )}
                {data?.features.length ? (
                  <CommandGroup heading="Addresses">
                    {data.features.map((feature) => (
                      <LocationOption
                        key={feature.properties.fullAddress}
                        value={feature.properties.fullAddress}
                        selected={
                          value?.address === feature.properties.fullAddress
                        }
                        onSelect={() => handleSelect(feature)}
                      >
                        {feature.properties.fullAddress}
                      </LocationOption>
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
