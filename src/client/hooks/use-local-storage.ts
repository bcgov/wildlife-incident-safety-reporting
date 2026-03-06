import { useCallback, useState } from 'react'

// Key must remain stable across renders (no dynamic keys)
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        return JSON.parse(stored) as T
      }
    } catch {
      // Corrupted or unavailable, fall through to default
    }
    return defaultValue
  })

  const set = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          newValue instanceof Function ? newValue(prev) : newValue
        try {
          localStorage.setItem(key, JSON.stringify(resolved))
        } catch {
          // localStorage unavailable, still update state
        }
        return resolved
      })
    },
    [key],
  )

  return [value, set] as const
}
