import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { build } from '../helpers/app.js'
import { getTestDatabase, resetDatabase } from '../helpers/database.js'

const YEAR = 2021

const SEG_A = 5001
const SEG_B = 5002
const SEG_C = 5003

const NEAR_A = { latitude: 48.431, longitude: -123.35 }
const NEAR_B = { latitude: 48.431, longitude: -123.34 }
const NEAR_C = { latitude: 48.431, longitude: -123.3 }
const FAR_ONE = { latitude: 48.5, longitude: -123.5 }
const FAR_TWO = { latitude: 48.51, longitude: -123.52 }

interface Point {
  latitude: number
  longitude: number
}

describe('Sync Upserts', () => {
  let app: FastifyInstance
  let speciesId: number

  beforeAll(async () => {
    app = await build()
    await app.ready()

    const species = await getTestDatabase()
      .selectFrom('species')
      .select('id')
      .orderBy('id')
      .executeTakeFirstOrThrow()
    speciesId = species.id
  })

  afterAll(async () => {
    await app?.close()
  })

  beforeEach(async () => {
    await resetDatabase()
  })

  function segment(
    id: number,
    lng: number,
    lat = 48.43,
    name = 'Test Segment',
  ) {
    return {
      chris_lki_segment_id: id,
      lki_segment_name: name,
      lki_segment_description: null,
      lki_segment_direction: null,
      lki_segment_length: null,
      lki_route_id: null,
      highway_number: null,
      geom: JSON.stringify({
        type: 'LineString',
        coordinates: [
          [lng, lat],
          [lng, lat + 0.002],
        ],
      }),
      feature_length_m: null,
      objectid: null,
    }
  }

  function hmcrRow(id: number, point: Point) {
    return {
      hmcr_record_id: id,
      accident_date: '2021-05-04',
      time_of_kill: 'DAY',
      nearest_town: 'Victoria',
      sex: 'MALE',
      age: 'ADULT',
      comments: 'collision',
      quantity: 1,
      latitude: point.latitude,
      longitude: point.longitude,
      species_id: speciesId,
      year: YEAR,
    }
  }

  async function seedSegments() {
    await app.db.upsertLkiSegments([
      segment(SEG_A, -123.35),
      segment(SEG_B, -123.34),
    ])
  }

  async function seedIncident(point: Point): Promise<number> {
    const row = await getTestDatabase()
      .insertInto('incidents')
      .values({
        year: YEAR,
        species_id: speciesId,
        latitude: String(point.latitude),
        longitude: String(point.longitude),
      })
      .returning('id')
      .executeTakeFirstOrThrow()
    return row.id
  }

  async function readIncident(id: number) {
    return await getTestDatabase()
      .selectFrom('incidents')
      .select(['lki_segment_id', 'updated_at'])
      .where('id', '=', id)
      .executeTakeFirstOrThrow()
  }

  async function readHmcrIncidents() {
    return await getTestDatabase()
      .selectFrom('incidents')
      .select(['hmcr_record_id', 'geom', 'lki_segment_id', 'updated_at'])
      .orderBy('hmcr_record_id')
      .execute()
  }

  describe('HMCR incidents', () => {
    it('creates every new row and assigns the nearby segment', async () => {
      await seedSegments()

      const result = await app.db.upsertHmcrIncidents([
        hmcrRow(1001, NEAR_A),
        hmcrRow(1002, FAR_ONE),
        hmcrRow(1003, FAR_TWO),
      ])

      expect(result).toEqual({ created: 3, updated: 0 })

      const rows = await readHmcrIncidents()
      expect(rows).toHaveLength(3)
      for (const row of rows) {
        expect(row.geom).not.toBeNull()
      }
      expect(rows[0].lki_segment_id).toBe(SEG_A)
      expect(rows[1].lki_segment_id).toBeNull()
      expect(rows[2].lki_segment_id).toBeNull()
    })

    it('proposes nothing when the incoming rows are identical', async () => {
      await seedSegments()
      const rows = [
        hmcrRow(1001, NEAR_A),
        hmcrRow(1002, FAR_ONE),
        hmcrRow(1003, FAR_TWO),
      ]
      await app.db.upsertHmcrIncidents(rows)
      const before = await readHmcrIncidents()

      const result = await app.db.upsertHmcrIncidents(rows)

      expect(result).toEqual({ created: 0, updated: 0 })
      const after = await readHmcrIncidents()
      expect(after.map((r) => r.updated_at)).toEqual(
        before.map((r) => r.updated_at),
      )
    })

    it('updates only the row whose coordinates moved', async () => {
      await seedSegments()
      await app.db.upsertHmcrIncidents([
        hmcrRow(1001, NEAR_A),
        hmcrRow(1002, FAR_ONE),
        hmcrRow(1003, FAR_TWO),
      ])
      const before = await readHmcrIncidents()

      const result = await app.db.upsertHmcrIncidents([
        hmcrRow(1001, NEAR_A),
        hmcrRow(1002, NEAR_B),
        hmcrRow(1003, FAR_TWO),
      ])

      expect(result).toEqual({ created: 0, updated: 1 })
      const after = await readHmcrIncidents()
      expect(after[1].lki_segment_id).toBe(SEG_B)
      expect(after[0].updated_at).toEqual(before[0].updated_at)
      expect(after[2].updated_at).toEqual(before[2].updated_at)
    })
  })

  describe('LKI segments', () => {
    it('leaves incidents untouched when only a segment name changes', async () => {
      await seedSegments()
      const nearA = await seedIncident(NEAR_A)
      const nearB = await seedIncident(NEAR_B)
      const beforeA = await readIncident(nearA)
      const beforeB = await readIncident(nearB)

      await app.db.upsertLkiSegments([
        segment(SEG_A, -123.35, 48.43, 'Renamed Segment'),
        segment(SEG_B, -123.34),
      ])

      expect(await readIncident(nearA)).toEqual(beforeA)
      expect(await readIncident(nearB)).toEqual(beforeB)
    })

    it('nulls assignments near a segment that moved away', async () => {
      await seedSegments()
      const nearA = await seedIncident(NEAR_A)
      const nearB = await seedIncident(NEAR_B)
      const beforeB = await readIncident(nearB)

      await app.db.upsertLkiSegments([
        segment(SEG_A, -123.35, 48.6),
        segment(SEG_B, -123.34),
      ])

      expect((await readIncident(nearA)).lki_segment_id).toBeNull()
      expect(await readIncident(nearB)).toEqual(beforeB)
    })

    it('deletes an omitted segment and nulls its incidents', async () => {
      await seedSegments()
      const nearA = await seedIncident(NEAR_A)

      const result = await app.db.upsertLkiSegments([segment(SEG_B, -123.34)])

      expect(result.deleted).toBe(1)
      expect((await readIncident(nearA)).lki_segment_id).toBeNull()
    })

    it('assigns incidents when a new segment appears nearby', async () => {
      await seedSegments()
      const nearC = await seedIncident(NEAR_C)
      expect((await readIncident(nearC)).lki_segment_id).toBeNull()

      await app.db.upsertLkiSegments([
        segment(SEG_A, -123.35),
        segment(SEG_B, -123.34),
        segment(SEG_C, -123.3),
      ])

      expect((await readIncident(nearC)).lki_segment_id).toBe(SEG_C)
    })
  })
})
