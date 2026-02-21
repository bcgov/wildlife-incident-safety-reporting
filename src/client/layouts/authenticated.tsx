import type { ReactNode } from 'react'

interface AuthenticatedLayoutProps {
  children: ReactNode
}

/**
 * Authenticated layout wrapper.
 * TODO: Add Keycloak JWT auth checks once integrated.
 */
export default function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  return <>{children}</>
}
