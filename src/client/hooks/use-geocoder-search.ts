import { useQuery } from '@tanstack/react-query'
import { searchAddresses } from '@/lib/geocoder'

export function useGeocoderSearch(query: string) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: ['geocoder', trimmed],
    queryFn: () => searchAddresses(trimmed),
    enabled: trimmed.length >= 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (prev) => prev,
  })
}
