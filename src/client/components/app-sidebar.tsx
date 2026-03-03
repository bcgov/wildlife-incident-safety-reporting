import { format, parseISO } from 'date-fns'
import { CalendarIcon, RotateCcw, X } from 'lucide-react'
import { NavUser } from '@/components/nav-user'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { MultiSelect } from '@/components/ui/multi-select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { useFilters } from '@/features/map/hooks/use-filters'
import { useIncidents } from '@/features/map/hooks/use-incidents'
import { useFilterStore } from '@/features/map/store/filter-store'

function FilterSkeleton() {
  return <Skeleton className="h-10 rounded-md border border-input" />
}

function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder,
}: {
  value: string | null
  onChange: (date: string | null) => void
  minDate?: string | null
  maxDate?: string | null
  placeholder: string
}) {
  const selected = value ? parseISO(value) : undefined
  const fromDate = minDate ? parseISO(minDate) : undefined
  const toDate = maxDate ? parseISO(maxDate) : undefined

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            data-empty={!value}
            className="w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
          />
        }
      >
        <CalendarIcon className="size-3.5" />
        {selected ? format(selected, 'PPP') : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          onSelect={(date) =>
            onChange(date ? format(date, 'yyyy-MM-dd') : null)
          }
          startMonth={fromDate}
          endMonth={toDate}
          disabled={[
            ...(fromDate ? [{ before: fromDate }] : []),
            ...(toDate ? [{ after: toDate }] : []),
          ]}
        />
      </PopoverContent>
    </Popover>
  )
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { data: filters, isLoading } = useFilters()
  const { data: incidents } = useIncidents()
  const store = useFilterStore()

  const hasSelections =
    store.years.length > 0 ||
    store.species.length > 0 ||
    store.serviceAreas.length > 0 ||
    store.sex.length > 0 ||
    store.timeOfKill.length > 0 ||
    store.age.length > 0 ||
    store.startDate !== null ||
    store.endDate !== null ||
    store.geometry !== null

  return (
    <Sidebar variant="inset" collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-between px-2">
          <span className="text-lg font-semibold">Filters</span>
          {hasSelections && (
            <Button
              variant="destructive"
              size="xs"
              onClick={store.clearAll}
              aria-label="Clear all filters"
            >
              <RotateCcw className="size-3" />
              Clear
            </Button>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel>Year</SidebarGroupLabel>
          <SidebarGroupContent>
            {isLoading ? (
              <FilterSkeleton />
            ) : (
              <MultiSelect
                options={(filters?.years ?? []).map((y) => ({
                  value: String(y),
                  label: String(y),
                }))}
                defaultValue={store.years.map(String)}
                onValueChange={(values) => store.setYears(values.map(Number))}
                placeholder="Select years"
                maxCount={2}
              />
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel>Species</SidebarGroupLabel>
          <SidebarGroupContent>
            {isLoading ? (
              <FilterSkeleton />
            ) : (
              <MultiSelect
                options={(filters?.species ?? []).map((s) => ({
                  value: String(s.id),
                  label: s.name,
                }))}
                defaultValue={store.species.map(String)}
                onValueChange={(values) => store.setSpecies(values.map(Number))}
                placeholder="Select species"
                maxCount={2}
              />
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel>Service Area</SidebarGroupLabel>
          <SidebarGroupContent>
            {isLoading ? (
              <FilterSkeleton />
            ) : (
              <MultiSelect
                options={[...(filters?.serviceAreas ?? [])]
                  .sort((a, b) => a.contractAreaNumber - b.contractAreaNumber)
                  .map((sa) => ({
                    value: String(sa.id),
                    label: `${sa.contractAreaNumber} - ${sa.name}`,
                  }))}
                defaultValue={store.serviceAreas.map(String)}
                onValueChange={(values) =>
                  store.setServiceAreas(values.map(Number))
                }
                placeholder="Select service areas"
                maxCount={2}
              />
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel>Sex</SidebarGroupLabel>
          <SidebarGroupContent>
            {isLoading ? (
              <FilterSkeleton />
            ) : (
              <MultiSelect
                options={(filters?.sex ?? []).map((s) => ({
                  value: s,
                  label: s,
                }))}
                defaultValue={store.sex}
                onValueChange={store.setSex}
                placeholder="Select sex"
              />
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel>Time of Kill</SidebarGroupLabel>
          <SidebarGroupContent>
            {isLoading ? (
              <FilterSkeleton />
            ) : (
              <MultiSelect
                options={(filters?.timeOfKill ?? []).map((t) => ({
                  value: t,
                  label: t,
                }))}
                defaultValue={store.timeOfKill}
                onValueChange={store.setTimeOfKill}
                placeholder="Select time of kill"
              />
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel>Age</SidebarGroupLabel>
          <SidebarGroupContent>
            {isLoading ? (
              <FilterSkeleton />
            ) : (
              <MultiSelect
                options={(filters?.age ?? []).map((a) => ({
                  value: a,
                  label: a,
                }))}
                defaultValue={store.age}
                onValueChange={store.setAge}
                placeholder="Select age"
              />
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel>Date Range</SidebarGroupLabel>
          <SidebarGroupContent>
            {isLoading ? (
              <FilterSkeleton />
            ) : (
              <div className="flex flex-col gap-2">
                <DatePicker
                  value={store.startDate}
                  onChange={store.setStartDate}
                  minDate={filters?.dateRange.min}
                  maxDate={store.endDate ?? filters?.dateRange.max}
                  placeholder="From"
                />
                <DatePicker
                  value={store.endDate}
                  onChange={store.setEndDate}
                  minDate={store.startDate ?? filters?.dateRange.min}
                  maxDate={filters?.dateRange.max}
                  placeholder="To"
                />
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
        {store.geometry && (
          <SidebarGroup className="px-2 py-1">
            <SidebarGroupLabel>Spatial Filter</SidebarGroupLabel>
            <SidebarGroupContent>
              <Badge variant="secondary" className="gap-1.5">
                Area filter
                <button
                  type="button"
                  onClick={() => store.setGeometry(null)}
                  className="rounded-full opacity-70 transition-opacity hover:opacity-100"
                  aria-label="Remove spatial filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 text-xs text-muted-foreground">
          {incidents?.total.toLocaleString() ?? '...'} observations match
          current filters
        </p>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
