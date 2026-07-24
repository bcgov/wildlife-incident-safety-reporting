// Accident dates are calendar dates, so render them in UTC to stop local
// timezones shifting them to the previous day.
export function formatIncidentDate(value: string | null): string | null {
  if (!value) return null
  return new Date(value).toLocaleDateString(undefined, { timeZone: 'UTC' })
}
