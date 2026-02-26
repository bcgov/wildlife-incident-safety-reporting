import { ModeToggle } from '@/components/mode-toggle'
import { SearchAddress } from '@/components/search-address'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { keycloak } from '@/lib/keycloak'
import { useAuthStore } from '@/stores/auth-store'

export function SiteHeader() {
  const { authenticated, logout } = useAuthStore()
  const displayName =
    keycloak.tokenParsed?.display_name ??
    keycloak.tokenParsed?.name ??
    keycloak.tokenParsed?.preferred_username

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4! self-center!" />
      <h1 className="text-base font-medium">WARS</h1>
      <SearchAddress />
      <div className="ml-auto flex items-center gap-2">
        {authenticated && displayName && (
          <span className="text-sm text-muted-foreground">{displayName}</span>
        )}
        {authenticated && (
          <Button variant="ghost" size="sm" onClick={logout}>
            Log out
          </Button>
        )}
        <ModeToggle />
      </div>
    </header>
  )
}
