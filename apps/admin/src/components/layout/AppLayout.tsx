"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@pwrup/shared-ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { ConnectionBadge } from "@/components/ConnectionBadge"
import { Separator } from "@pwrup/shared-ui/separator"

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {title && <h1 className="text-lg font-semibold">{title}</h1>}
          <div className="ml-auto">
            <ConnectionBadge />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
