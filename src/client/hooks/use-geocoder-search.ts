import { useQuery } from '@tanstack/react-query'
import { type LocationDescriptor, searchAddresses } from '@/lib/geocoder'

export function useGeocoderSearch(
  query: string,
  locationDescriptor: LocationDescriptor = 'parcelPoint',
) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: ['geocoder', locationDescriptor, trimmed],
    queryFn: () => searchAddresses(trimmed, locationDescriptor),
    enabled: trimmed.length >= 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (prev) => prev,
  })
}
