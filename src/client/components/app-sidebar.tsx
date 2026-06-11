import {
  MAX_SELECTED_YEARS,
  YearSelectionSchema,
} from '@schemas/common/incident-query.schema'
import { format, parseISO } from 'date-fns'
import { CalendarIcon, RotateCcw, X } from 'lucide-react'
import { useMemo } from 'react'
import { FieldError } from '@/components/field-error'
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
import { NavUser } from '@/components/user-menu'
import { useFilters } from '@/hooks/use-filters'
import { useIncidents } from '@/hooks/use-incidents'
import { useFilterStore } from '@/stores/filter-store'

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

  const yearValidation = useMemo(
    () => YearSelectionSchema.safeParse(store.years),
    [store.years],
  )

  const speciesGroupMap = useMemo(() => {
    const map = new Map<string, number[]>()
    for (const s of filters?.species ?? []) {
      const ids = map.get(s.groupName) ?? []
      ids.push(s.id)
      map.set(s.groupName, ids)
    }
    return map
  }, [filters?.species])

  const speciesOptions = useMemo(
    () => [...speciesGroupMap.keys()].map((g) => ({ value: g, label: g })),
    [speciesGroupMap],
  )

  const selectedSpeciesGroups = useMemo(() => {
    const idToGroup = new Map<number, string>()
    for (const s of filters?.species ?? []) {
      idToGroup.set(s.id, s.groupName)
    }
    return [
      ...new Set(
        store.species
          .map((id) => idToGroup.get(id))
          .filter((g): g is string => g !== undefined),
      ),
    ]
  }, [filters?.species, store.species])

  const serviceAreaOptions = useMemo(() => {
    const sorted = [...(filters?.serviceAreas ?? [])].sort(
      (a, b) => a.contractAreaNumber - b.contractAreaNumber,
    )
    const grouped = new Map<string, { value: string; label: string }[]>()
    for (const sa of sorted) {
      const items = grouped.get(sa.region) ?? []
      items.push({
        value: String(sa.id),
        label: `${sa.contractAreaNumber} - ${sa.name}`,
      })
      grouped.set(sa.region, items)
    }
    return [...grouped.entries()].map(([region, options]) => ({
      heading: region,
      options,
    }))
  }, [filters?.serviceAreas])

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
    <Sidebar
      variant="sidebar"
      collapsible="offcanvas"
      className="inset-y-auto! top-[calc(var(--header-height)+9px)]! h-[calc(100svh-var(--header-height)-9px)]!"
      {...props}
    >
      <SidebarHeader className="flex h-14 flex-row items-center justify-between border-b px-4 py-0">
        <span className="text-base font-bold">Filters</span>
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
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <SidebarGroup className="px-2 py-1">
          <SidebarGroupLabel>Year</SidebarGroupLabel>
          <SidebarGroupContent>
            {isLoading ? (
              <FilterSkeleton />
            ) : (
              <>
                <MultiSelect
                  options={(filters?.years ?? []).map((y) => ({
                    value: String(y),
                    label: String(y),
                  }))}
                  defaultValue={store.years.map(String)}
                  selectAllValues={(filters?.years ?? [])
                    .slice(0, MAX_SELECTED_YEARS)
                    .map(String)}
                  selectAllLabel={`(Most recent ${MAX_SELECTED_YEARS} years)`}
                  onValueChange={(values) => store.setYears(values.map(Number))}
                  placeholder="Select years"
                  maxCount={2}
                  className={
                    !yearValidation.success && store.years.length > 0
                      ? 'border-destructive'
                      : undefined
                  }
                />
                {!yearValidation.success &&
                  (store.years.length === 0 ? (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {yearValidation.error.issues[0]?.message}
                    </p>
                  ) : (
                    <FieldError>
                      {yearValidation.error.issues[0]?.message}
                    </FieldError>
                  ))}
              </>
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
                options={speciesOptions}
                defaultValue={selectedSpeciesGroups}
                onValueChange={(groups) =>
                  store.setSpecies(
                    groups.flatMap((g) => speciesGroupMap.get(g) ?? []),
                  )
                }
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
                options={serviceAreaOptions}
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
      <SidebarFooter className="gap-2.5 border-t bg-card px-4 py-3">
        {incidents?.total !== undefined && (
          <p className="text-xs text-muted-foreground">
            <span className="font-bold text-primary">
              {incidents.total.toLocaleString()}
            </span>{' '}
            observations match current filters
          </p>
        )}
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
