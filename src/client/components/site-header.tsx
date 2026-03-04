import warsIcon from '@/assets/images/wars-icon.png'
import { ModeToggle } from '@/components/mode-toggle'
import { SearchAddress } from '@/components/search-address'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 flex w-full items-center border-b bg-background">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4! self-center!" />
        <img src={warsIcon} alt="WARS" className="h-7" />
        <h1 className="text-base font-medium">WARS</h1>
        <TabsList variant="line" className="ml-2">
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>
        <SearchAddress />
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
