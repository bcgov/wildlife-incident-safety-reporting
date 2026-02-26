import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores/auth-store'

export function Component() {
  const { initialized, authenticated, login } = useAuthStore()

  useEffect(() => {
    if (initialized && !authenticated) {
      login()
    }
  }, [initialized, authenticated, login])

  if (!initialized || !authenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': '18rem',
          '--header-height': '3rem',
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 overflow-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

Component.displayName = 'AppLayout'
