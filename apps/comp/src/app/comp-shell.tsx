"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Route } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@pwrup/shared-ui/tabs";

type CompetitionTabId = "video" | "paths";

function activeTabFromPath(pathname: string): CompetitionTabId {
  if (pathname.startsWith("/paths")) return "paths";
  return "video";
}

export function CompShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeTab = activeTabFromPath(pathname);

  return (
    <div className="flex h-[100dvh] min-h-screen w-full overflow-hidden bg-black text-zinc-100">
      <div className="mx-auto flex h-full w-full max-w-[1600px] min-w-0 flex-col p-3 sm:p-4">
        <Tabs value={activeTab} className="mt-1 flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList className="h-10 w-fit border border-white/10 bg-zinc-950">
              <TabsTrigger
                value="video"
                asChild
                className="min-w-[150px] data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
              >
                <Link href="/video" prefetch>
                  <Clapperboard className="h-4 w-4" />
                  Video Viewer
                </Link>
              </TabsTrigger>
              <TabsTrigger
                value="paths"
                asChild
                className="min-w-[150px] data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
              >
                <Link href="/paths" prefetch>
                  <Route className="h-4 w-4" />
                  Paths Selector
                </Link>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="mt-3 min-h-0 flex-1">{children}</div>
        </Tabs>
      </div>
    </div>
  );
}
