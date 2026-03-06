import { lazy, Suspense, useEffect } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Component as MapView } from '@/features/map'
import { useAuthStore } from '@/stores/auth-store'

const DataPage = lazy(() =>
  import('@/features/charts').then((m) => ({ default: m.Component })),
)

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
    <div className="[--header-height:calc(--spacing(14))]">
      <Tabs defaultValue="map" className="gap-0">
        <SidebarProvider
          className="flex flex-col"
          style={
            {
              '--sidebar-width': '18rem',
            } as React.CSSProperties
          }
        >
          <SiteHeader />
          <div className="flex flex-1">
            <AppSidebar />
            <SidebarInset>
              <TabsContent
                value="map"
                keepMounted
                className="[&:not([hidden])]:flex flex-1 overflow-hidden"
              >
                <MapView />
              </TabsContent>
              <TabsContent
                value="data"
                keepMounted
                className="[&:not([hidden])]:flex flex-1 overflow-hidden"
              >
                <Suspense
                  fallback={
                    <div className="flex flex-1 items-center justify-center">
                      <div className="text-muted-foreground text-sm">
                        Loading...
                      </div>
                    </div>
                  }
                >
                  <DataPage />
                </Suspense>
              </TabsContent>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </Tabs>
    </div>
  )
}

Component.displayName = 'AppLayout'
