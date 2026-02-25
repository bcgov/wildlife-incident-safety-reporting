import { ModeToggle } from '@/components/mode-toggle'
import { SearchAddress } from '@/components/search-address'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4! self-center!" />
      <h1 className="text-base font-medium">WARS</h1>
      <SearchAddress />
      <div className="ml-auto">
        <ModeToggle />
      </div>
    </header>
  )
}
