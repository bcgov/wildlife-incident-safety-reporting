// BC Geocoder API response types (addresses.json endpoint)
// Docs: https://bcgov.github.io/ols-geocoder/geocoder-developer-guide.html

export type GeocoderFeature = {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [longitude: number, latitude: number]
  }
  properties: {
    fullAddress: string
    score: number
    matchPrecision: string
    localityType: string
  }
}

export type GeocoderResponse = {
  type: 'FeatureCollection'
  features: GeocoderFeature[]
}
