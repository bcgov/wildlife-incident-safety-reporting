import { ChevronDown, ChevronsUpDown, LogOut } from 'lucide-react'
import { type ComponentProps, useState } from 'react'
import { LogoutAlert } from '@/components/logout-alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { keycloak } from '@/lib/keycloak'
import { cn } from '@/lib/utils'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function shortenName(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  return `${parts[0][0]}. ${parts[parts.length - 1]}`
}

function UserAvatar({ size = 'default' }: { size?: 'default' | 'sm' | 'lg' }) {
  const { displayName } = useCurrentUser()
  return (
    <Avatar size={size}>
      <AvatarFallback
        className={cn(
          'bg-primary text-primary-foreground font-bold',
          size === 'sm' && 'text-[10px]',
        )}
      >
        {getInitials(displayName)}
      </AvatarFallback>
    </Avatar>
  )
}

function useCurrentUser() {
  const displayName =
    keycloak.tokenParsed?.display_name ??
    keycloak.tokenParsed?.name ??
    keycloak.tokenParsed?.preferred_username ??
    'User'
  const email =
    keycloak.tokenParsed?.email ?? keycloak.tokenParsed?.preferred_username
  return { displayName, email }
}

type DropdownContentProps = ComponentProps<typeof DropdownMenuContent>

function UserMenuContent(contentProps: DropdownContentProps) {
  const [showLogout, setShowLogout] = useState(false)
  const { displayName, email } = useCurrentUser()

  return (
    <>
      <DropdownMenuContent {...contentProps}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <UserAvatar />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                {email && (
                  <span className="truncate text-xs text-muted-foreground">
                    {email}
                  </span>
                )}
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setShowLogout(true)}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
      <LogoutAlert open={showLogout} onOpenChange={setShowLogout} />
    </>
  )
}

export function UserMenu() {
  const { displayName } = useCurrentUser()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border bg-background py-1 pr-3 pl-1 text-sm outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=open]:bg-muted">
        <UserAvatar size="sm" />
        <span className="truncate font-medium">{shortenName(displayName)}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <UserMenuContent className="min-w-56" align="end" sideOffset={6} />
    </DropdownMenu>
  )
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const { displayName, email } = useCurrentUser()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <UserAvatar />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              {email && (
                <span className="truncate text-xs text-muted-foreground">
                  {email}
                </span>
              )}
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <UserMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          />
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
