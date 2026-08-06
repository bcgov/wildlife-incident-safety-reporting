import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { CommandEmpty, CommandItem } from '@/components/ui/command'
import { cn } from '@/lib/utils'

type LocationSearchStatusProps = {
  isFetching: boolean
  isError: boolean
  hasData: boolean
  hasResults: boolean
  emptyMessage: string
}

export function LocationSearchStatus({
  isFetching,
  isError,
  hasData,
  hasResults,
  emptyMessage,
}: LocationSearchStatusProps) {
  if (isError) {
    return (
      <CommandEmpty>Failed to fetch addresses. Please try again.</CommandEmpty>
    )
  }
  if (isFetching && !hasData) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Searching...
      </div>
    )
  }
  if (!isFetching && !hasResults) {
    return <CommandEmpty>{emptyMessage}</CommandEmpty>
  }
  return null
}

type LocationOptionProps = {
  value: string
  selected: boolean
  onSelect: () => void
  children: ReactNode
}

export function LocationOption({
  value,
  selected,
  onSelect,
  children,
}: LocationOptionProps) {
  return (
    <CommandItem value={value} onSelect={onSelect}>
      <Check
        className={cn('mr-2 size-4', selected ? 'opacity-100' : 'opacity-0')}
      />
      {children}
    </CommandItem>
  )
}
