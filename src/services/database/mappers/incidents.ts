import type { Incident } from '@schemas/incidents/incidents.schema.js'
import type { IncidentRow } from '../types/incident-row.js'

export function toIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    year: row.year,
    accidentDate: row.accident_date?.toISOString().slice(0, 10) ?? null,
    speciesId: row.species_id,
    speciesName: row.species_name,
    speciesColor: row.species_color,
    speciesGroupName: row.species_group_name,
    serviceAreaId: row.service_area_id,
    serviceAreaName: row.service_area_name,
    contractAreaNumber: row.contract_area_number,
    sex: row.sex,
    timeOfKill: row.time_of_kill,
    age: row.age,
    quantity: row.quantity,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    nearestTown: row.nearest_town,
  }
}
