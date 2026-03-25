"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@pwrup/shared-ui/sidebar";
import { Separator } from "@pwrup/shared-ui/separator";
import { PidConnectionBadge } from "@/components/pid/PidConnectionBadge";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="surface-grid">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className="ml-auto">
            <PidConnectionBadge />
          </div>
        </header>
        <main className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col gap-4 p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
