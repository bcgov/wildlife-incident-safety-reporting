import type { IncidentProperties } from '../index'
import { formatIncidentDate } from '../lib/incident-date'

type IncidentTooltipProps = {
  properties: IncidentProperties
}

export function IncidentTooltip({ properties }: IncidentTooltipProps) {
  const formattedDate = formatIncidentDate(properties.accidentDate)

  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-semibold">{properties.speciesGroupName}</p>
      {formattedDate && (
        <p className="text-muted-foreground text-xs">{formattedDate}</p>
      )}
      {properties.nearestTown && (
        <p className="text-muted-foreground text-xs">
          {properties.nearestTown}
        </p>
      )}
    </div>
  )
}
