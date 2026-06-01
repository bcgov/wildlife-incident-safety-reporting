import { useEffect, useState } from 'react'
import { useDebounce } from '@/hooks/use-debounce'

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  const update = useDebounce(setDebounced, delay)

  useEffect(() => {
    update(value)
  }, [value, update])

  return debounced
}
