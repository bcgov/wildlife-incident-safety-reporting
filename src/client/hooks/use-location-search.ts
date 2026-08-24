import { useCallback, useState } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { useGeocoderSearch } from '@/hooks/use-geocoder-search'
import type { LocationDescriptor } from '@/lib/geocoder'

export const MIN_QUERY_LENGTH = 3

export function useLocationSearch(locationDescriptor?: LocationDescriptor) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const debouncedSetQuery = useDebounce(
    useCallback((next: string) => setDebouncedQuery(next), []),
    300,
  )

  const handleInputChange = (next: string) => {
    setQuery(next)
    debouncedSetQuery(next)
  }

  const { data, isFetching, isError } = useGeocoderSearch(
    debouncedQuery,
    locationDescriptor,
  )

  return {
    query,
    debouncedQuery,
    handleInputChange,
    data,
    isFetching,
    isError,
  }
}
