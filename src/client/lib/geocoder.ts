import type { GeocoderResponse } from '@/types/geocoder'

const GEOCODER_BASE = 'https://geocoder.api.gov.bc.ca/addresses.json'

export async function searchAddresses(
  query: string,
): Promise<GeocoderResponse> {
  const params = new URLSearchParams({
    addressString: query,
    minScore: '50',
    maxResults: '5',
    autoComplete: 'true',
    locationDescriptor: 'parcelPoint',
    brief: 'true',
  })

  const response = await fetch(`${GEOCODER_BASE}?${params}`, {
    signal: AbortSignal.timeout(5_000),
  })

  if (!response.ok) {
    throw new Error(
      `Geocoder request failed: ${response.status} ${response.statusText}`.trimEnd(),
    )
  }

  return response.json() as Promise<GeocoderResponse>
}
