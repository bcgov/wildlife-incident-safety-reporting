import type {
  RouteLine,
  RouteQuery,
  RouteResponse,
} from '@schemas/route-planner/route.schema.js'
import { createServiceLogger } from '@utils/logger.js'
import type { FastifyBaseLogger, FastifyInstance } from 'fastify'
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

export interface RouteFilterParams {
  routeStartLng?: number
  routeStartLat?: number
  routeEndLng?: number
  routeEndLat?: number
}

export class RoutePlannerService {
  private readonly log: FastifyBaseLogger
  private readonly fastify: FastifyInstance
  // Corridor-filtered incident queries re-resolve the same route on every
  // filter tweak, so identical lookups must not re-hit the rate-limited API
  private readonly cache = new LRUCache<string, RouteResponse>({
    max: 50,
    ttl: 60 * 60 * 1000,
  })

  constructor(baseLog: FastifyBaseLogger, fastify: FastifyInstance) {
    this.log = createServiceLogger(baseLog, 'ROUTE_PLANNER')
    this.fastify = fastify
  }

  async getRoute(query: RouteQuery): Promise<RouteResponse> {
    const cacheKey = [
      query.criteria,
      query.startLng,
      query.startLat,
      query.endLng,
      query.endLat,
    ].join(':')
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    const result = await this.fetchRoute(query)
    this.cache.set(cacheKey, result)
    return result
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
      criteria: 'fastest',
    })

    if (!route.line) {
      throw new Error('No route found between the route filter points')
    }
    return route.line
  }

  private async fetchRoute(query: RouteQuery): Promise<RouteResponse> {
    const { bcRoutePlannerUrl, bcRoutePlannerApiKey } = this.fastify.config

    const params = new URLSearchParams({
      points: [query.startLng, query.startLat, query.endLng, query.endLat].join(
        ',',
      ),
      criteria: query.criteria,
      outputSRS: '4326',
      distanceUnit: 'km',
    })

    const response = await fetch(`${bcRoutePlannerUrl}/route.json?${params}`, {
      headers: { apiKey: bcRoutePlannerApiKey },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      this.log.error(
        { status: response.status, criteria: query.criteria },
        'Route Planner request failed',
      )
      throw new Error(`Route Planner responded with ${response.status}`)
    }

    const data = (await response.json()) as RoutePlannerApiResponse

    return {
      routeFound: data.routeFound,
      distance: data.distance,
      distanceUnit: data.distanceUnit,
      time: data.time,
      timeText: data.timeText,
      line:
        data.routeFound && data.route.length > 1
          ? { type: 'LineString', coordinates: data.route }
          : null,
    }
  }
}
