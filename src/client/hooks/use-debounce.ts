import { useCallback, useEffect, useRef } from 'react'

/**
 * Returns a debounced version of the provided callback that delays execution
 * until after the specified delay has elapsed since the last call.
 */
export function useDebounce<TArgs extends readonly unknown[]>(
  callback: (...args: TArgs) => void,
  delay: number,
): (...args: TArgs) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const debouncedCallback = useCallback(
    (...args: TArgs) => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        callbackRef.current(...args)
      }, delay)
    },
    [delay],
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}
