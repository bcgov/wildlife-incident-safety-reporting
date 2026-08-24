import { HttpResponse, http } from 'msw'

export const ROUTE_PLANNER_URL = 'https://router.api.gov.bc.ca/route.json'

export const ROUTE_COORDINATES: [number, number][] = [
  [-123.36, 48.42],
  [-123.35, 48.43],
  [-123.34, 48.44],
]

export function routeFoundBody(coordinates = ROUTE_COORDINATES) {
  return {
    routeFound: true,
    distance: 12.345,
    distanceUnit: 'km',
    time: 900.5,
    timeText: '15 minutes',
    route: coordinates,
  }
}

export function noRouteBody() {
  return {
    routeFound: false,
    distance: -1,
    distanceUnit: 'km',
    time: -1,
    timeText: '-1 seconds',
    route: [],
  }
}

export const routePlannerHandlers = [
  http.get(ROUTE_PLANNER_URL, () => HttpResponse.json(routeFoundBody())),
]
