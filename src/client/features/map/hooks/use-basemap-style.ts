import { useQuery } from '@tanstack/react-query'
import type { StyleSpecification } from 'maplibre-gl'
import { config } from '@/lib/config'

const basemapStyleQueryKey = ['basemap-style', config.baseMapStyleUrl] as const

async function fetchBcBasemapStyle(): Promise<StyleSpecification> {
  const res = await fetch(config.baseMapStyleUrl, {
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    throw new Error(
      `Failed to load BC Basemap style: ${res.status} ${res.statusText}`,
    )
  }
  return (await res.json()) as StyleSpecification
}

export function useBcBasemapStyle() {
  return useQuery({
    queryKey: basemapStyleQueryKey,
    queryFn: fetchBcBasemapStyle,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })
}
