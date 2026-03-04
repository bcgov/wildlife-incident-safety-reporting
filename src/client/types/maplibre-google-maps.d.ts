declare module 'maplibre-google-maps' {
  export const googleProtocol: import('maplibre-gl').AddProtocolAction
  export function createGoogleStyle(
    id: string,
    mapType: string,
    key: string,
  ): import('maplibre-gl').StyleSpecification
}
