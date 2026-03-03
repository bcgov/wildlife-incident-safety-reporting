import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <TooltipProvider>
      <div className="h-screen bg-background">
        {children}
        <Toaster />
      </div>
    </TooltipProvider>
  )
}
