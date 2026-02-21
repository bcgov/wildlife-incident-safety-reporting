import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'

interface RootLayoutProps {
  children: ReactNode
}

/**
 * Root application layout with content area and toast notifications.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <div className="h-screen relative overflow-hidden bg-background">
      <div className="relative h-full flex items-center justify-center">
        <main className="z-10 w-full h-full flex items-center justify-center">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  )
}
