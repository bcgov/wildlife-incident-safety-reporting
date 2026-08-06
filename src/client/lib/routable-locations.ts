// Routing anchors the BC Geocoder cannot serve; border exits stand in for
// out-of-province cities the Route Planner's BC-only network cannot reach
export type RoutableLocation = {
  name: string
  longitude: number
  latitude: number
}

export const ROUTABLE_LOCATIONS: RoutableLocation[] = [
  {
    name: 'BC border to US (via Highway 11)',
    longitude: -122.2652,
    latitude: 49.0047,
  },
  {
    name: 'BC border to US (via Highway 13)',
    longitude: -122.485,
    latitude: 49.0004,
  },
  {
    name: 'BC border to US (via Highway 15)',
    longitude: -122.7353,
    latitude: 49.0041,
  },
  {
    name: 'BC border to US (via Highway 97)',
    longitude: -119.4633,
    latitude: 49.0017,
  },
  {
    name: 'BC border to US (via Highway 99)',
    longitude: -122.7571,
    latitude: 49.0021,
  },
  {
    name: 'Seattle, US (via Highway 15)',
    longitude: -122.7353,
    latitude: 49.0041,
  },
  {
    name: 'Seattle, US (via Highway 99)',
    longitude: -122.7572,
    latitude: 49.0023,
  },
  {
    name: 'Alice Lake Park, BC',
    longitude: -123.1337,
    latitude: 49.7872,
  },
  {
    name: 'Bridal Veil Falls Park, BC',
    longitude: -121.745,
    latitude: 49.1858,
  },
  {
    name: 'Cultus Lake Park, BC',
    longitude: -121.9662,
    latitude: 49.0575,
  },
  {
    name: 'Cypress Park, BC',
    longitude: -123.1797,
    latitude: 49.3538,
  },
  {
    name: 'E.C. Manning Park (East Gate Entrance), BC',
    longitude: -120.6225,
    latitude: 49.1317,
  },
  {
    name: 'E.C. Manning Park (Visitor Centre), BC',
    longitude: -120.7699,
    latitude: 49.0611,
  },
  {
    name: 'E.C. Manning Park (West Gate Entrance), BC',
    longitude: -121.1898,
    latitude: 49.2549,
  },
  {
    name: 'Golden Ears Park, BC',
    longitude: -122.5454,
    latitude: 49.2422,
  },
  {
    name: 'Goldstream Park (Visitor Centre), BC',
    longitude: -123.5486,
    latitude: 48.4781,
  },
  {
    name: 'Juan de Fuca Park (Botanical Beach), BC',
    longitude: -124.4429,
    latitude: 48.5338,
  },
  {
    name: 'Juan de Fuca Park (China Beach), BC',
    longitude: -124.0891,
    latitude: 48.439,
  },
  {
    name: 'Kalamalka Lake Park, BC',
    longitude: -119.278,
    latitude: 50.2081,
  },
  {
    name: 'Kokanee Creek Park, BC',
    longitude: -117.1212,
    latitude: 49.6064,
  },
  {
    name: 'Lakelse Lake Park (Furlong Bay), BC',
    longitude: -128.5245,
    latitude: 54.3778,
  },
  {
    name: "Lakelse Lake Park (Gruchy's Beach), BC",
    longitude: -128.5327,
    latitude: 54.4229,
  },
  {
    name: 'Little Qualicum Falls Park, BC',
    longitude: -124.5425,
    latitude: 49.3083,
  },
  {
    name: 'MacMillan Park, BC',
    longitude: -124.6633,
    latitude: 49.2911,
  },
  {
    name: 'Mount Seymour Park, BC',
    longitude: -122.9703,
    latitude: 49.3224,
  },
  {
    name: 'Murrin Park, BC',
    longitude: -123.2034,
    latitude: 49.6462,
  },
  {
    name: 'Porteau Cove Park, BC',
    longitude: -123.2329,
    latitude: 49.5604,
  },
  {
    name: 'Rathtrevor Beach Park, BC',
    longitude: -124.2749,
    latitude: 49.3138,
  },
  {
    name: 'Sasquatch Park, BC',
    longitude: -121.7443,
    latitude: 49.3417,
  },
  {
    name: 'Shannon Falls Park, BC',
    longitude: -123.1627,
    latitude: 49.6706,
  },
  {
    name: 'Stawamus Chief Park, BC',
    longitude: -123.1564,
    latitude: 49.6782,
  },
  {
    name: 'Banff, AB (via Highway 1)',
    longitude: -116.2844,
    latitude: 51.4535,
  },
  {
    name: 'Banff, AB (via Highway 93)',
    longitude: -116.0503,
    latitude: 51.2285,
  },
  {
    name: 'BC border to AB (via Highway 1)',
    longitude: -116.2844,
    latitude: 51.4535,
  },
  {
    name: 'BC border to AB (via Highway 16)',
    longitude: -118.4489,
    latitude: 52.882,
  },
  {
    name: 'BC border to AB (via Highway 3)',
    longitude: -114.6919,
    latitude: 49.6325,
  },
  {
    name: 'BC border to AB (via Highway 93)',
    longitude: -116.0517,
    latitude: 51.2273,
  },
  {
    name: 'BC border to YT (via Highway 37)',
    longitude: -129.0526,
    latitude: 60,
  },
  {
    name: 'BC border to YT (via Highway 97, Watson Lake)',
    longitude: -128.5457,
    latitude: 60,
  },
  {
    name: 'Calgary, AB (via Highway 1)',
    longitude: -116.2844,
    latitude: 51.4535,
  },
  {
    name: 'Calgary, AB (via Highway 93)',
    longitude: -116.0503,
    latitude: 51.2285,
  },
  {
    name: 'Edmonton, AB (via Highway 16)',
    longitude: -118.4486,
    latitude: 52.8821,
  },
  {
    name: 'Grande Prairie, AB (via Highway 2)',
    longitude: -120.0032,
    latitude: 55.481,
  },
  {
    name: 'Jasper, AB (via Highway 16)',
    longitude: -118.4486,
    latitude: 52.8821,
  },
  {
    name: 'Lethbridge, AB (via Highway 3)',
    longitude: -114.6919,
    latitude: 49.6325,
  },
  {
    name: 'Whitehorse, YT (via Highway 97)',
    longitude: -132.1171,
    latitude: 59.9998,
  },
  {
    name: 'Yellowknife, NT (via Highway 77)',
    longitude: -122.9328,
    latitude: 60,
  },
]

export function matchRoutableLocations(
  query: string,
  limit = 5,
): RoutableLocation[] {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  return ROUTABLE_LOCATIONS.filter((l) =>
    l.name.toLowerCase().includes(q),
  ).slice(0, limit)
}
