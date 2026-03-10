import '@tanstack/react-query'

declare global {
  const __APP_VERSION__: string
}

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      suppressGlobalError?: boolean
    }
  }
}
