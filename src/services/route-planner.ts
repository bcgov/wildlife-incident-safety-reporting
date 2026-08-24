import type {
  RouteLine,
  RouteQuery,
  RouteResponse,
} from '@schemas/route-planner/route.schema.js'
import type { FastifyInstance } from 'fastify'
import { LRUCache } from 'lru-cache'

interface RoutePlannerApiResponse {
  routeFound: boolean
  distance: number
  distanceUnit: string
  time: number
  timeText: string
  route: number[][]
}

const REQUEST_TIMEOUT_MS = 10_000
const ROUTE_TTL_MS = 60 * 60 * 1000
const NOT_FOUND_TTL_MS = 60 * 1000

const RESOURCE_ROAD_PENALTY = 'resource:2.0'

export class RouteCorridorError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RouteCorridorError'
  }
}

export class RouteNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RouteNotFoundError'
  }
}

export interface RouteFilterParams {
  routeStartLng?: number
  routeStartLat?: number
  routeEndLng?: number
  routeEndLat?: number
}

export class RoutePlannerService {
  private readonly fastify: FastifyInstance
  // Corridor-filtered incident queries re-resolve the same route on every
  // filter tweak, so identical lookups must not re-hit the rate-limited API
  private readonly cache = new LRUCache<string, RouteResponse>({
    max: 50,
    ttl: ROUTE_TTL_MS,
  })
  private readonly inFlight = new Map<string, Promise<RouteResponse>>()

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify
  }

  async getRoute(query: RouteQuery): Promise<RouteResponse> {
    const cacheKey = [
      query.startLng,
      query.startLat,
      query.endLng,
      query.endLat,
    ].join(':')
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    // Incident and density queries resolve the same route concurrently
    const pending = this.inFlight.get(cacheKey)
    if (pending) return pending

    const request = this.fetchRoute(query)
      .then((result) => {
        this.cache.set(cacheKey, result, {
          ttl: result.routeFound ? ROUTE_TTL_MS : NOT_FOUND_TTL_MS,
        })
        return result
      })
      .finally(() => {
        this.inFlight.delete(cacheKey)
      })
    this.inFlight.set(cacheKey, request)
    return request
  }

  clearCache(): void {
    this.cache.clear()
  }

  async resolveRouteLine(params: RouteFilterParams): Promise<RouteLine | null> {
    const { routeStartLng, routeStartLat, routeEndLng, routeEndLat } = params
    if (
      routeStartLng === undefined ||
      routeStartLat === undefined ||
      routeEndLng === undefined ||
      routeEndLat === undefined
    ) {
      return null
    }

    const route = await this.getRoute({
      startLng: routeStartLng,
      startLat: routeStartLat,
      endLng: routeEndLng,
      endLat: routeEndLat,
    })

    if (!route.line) {
      throw new RouteNotFoundError(
        'No route found between the route filter points',
      )
    }
    return route.line
  }

  private async fetchRoute(query: RouteQuery): Promise<RouteResponse> {
    const { bcRoutePlannerUrl, bcRoutePlannerApiKey } = this.fastify.config

    const params = new URLSearchParams({
      points: [query.startLng, query.startLat, query.endLng, query.endLat].join(
        ',',
      ),
      criteria: 'fastest',
      gdf: RESOURCE_ROAD_PENALTY,
      outputSRS: '4326',
      distanceUnit: 'km',
    })

    // Handlers map RouteCorridorError to 502, so every upstream failure must become one
    const response = await fetch(`${bcRoutePlannerUrl}/route.json?${params}`, {
      headers: { apiKey: bcRoutePlannerApiKey },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch(() => {
      throw new RouteCorridorError('Route Planner unreachable or timed out')
    })

    if (!response.ok) {
      throw new RouteCorridorError(
        `Route Planner responded with ${response.status}`,
      )
    }

    const data = (await response.json().catch(() => {
      throw new RouteCorridorError('Route Planner returned invalid JSON')
    })) as RoutePlannerApiResponse

    // The API returns HTTP 200 with -1 distance and time when no route exists
    if (!data.routeFound) {
      return {
        routeFound: false,
        distance: 0,
        distanceUnit: data.distanceUnit,
        time: 0,
        timeText: '',
        line: null,
      }
    }

    return {
      routeFound: true,
      distance: data.distance,
      distanceUnit: data.distanceUnit,
      time: data.time,
      timeText: data.timeText,
      line:
        data.route.length > 1
          ? { type: 'LineString', coordinates: data.route }
          : null,
    }
  }
}
