import { useEffect } from 'react'
import { useMap } from '@/components/ui/map'

const LAYER_ID = 'google'
const DARK_BRIGHTNESS = 0.75
const DARK_SATURATION = -0.3

function isDark() {
  return document.documentElement.classList.contains('dark')
}

export function BasemapDarkener() {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded) return

    const apply = () => {
      if (!map.getLayer(LAYER_ID)) return
      const dark = isDark()
      map.setPaintProperty(
        LAYER_ID,
        'raster-brightness-max',
        dark ? DARK_BRIGHTNESS : 1,
      )
      map.setPaintProperty(
        LAYER_ID,
        'raster-saturation',
        dark ? DARK_SATURATION : 0,
      )
    }

    // Apply on mount and after style changes (basemap switch)
    apply()
    map.on('styledata', apply)

    // Watch for theme class changes on <html>
    const observer = new MutationObserver(apply)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => {
      map.off('styledata', apply)
      observer.disconnect()
    }
  }, [map, isLoaded])

  return null
}
