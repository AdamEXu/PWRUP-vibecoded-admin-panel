"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Clapperboard, Route } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CompetitionTabId = "video" | "paths";

function activeTabFromPath(pathname: string): CompetitionTabId {
  if (pathname.startsWith("/comp/paths")) return "paths";
  return "video";
}

export default function CompetitionLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const activeTab = activeTabFromPath(pathname);

  return (
    <div className="flex h-[100dvh] min-h-screen w-full overflow-hidden bg-black text-zinc-100">
      <div className="mx-auto flex h-full w-full max-w-[1600px] min-w-0 flex-col p-3 sm:p-4">
        <header className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black px-4 py-2">
          <div>
            <h1 className="text-base font-semibold text-zinc-100">Operator Console</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="border-white/20 bg-black">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back To Admin
              </Link>
            </Button>
          </div>
        </header>

        <Tabs value={activeTab} className="mt-3 flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList className="h-10 w-fit border border-white/10 bg-zinc-950">
              <TabsTrigger
                value="video"
                asChild
                className="min-w-[150px] data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
              >
                <Link href="/comp/video" prefetch>
                  <Clapperboard className="h-4 w-4" />
                  Video Viewer
                </Link>
              </TabsTrigger>
              <TabsTrigger
                value="paths"
                asChild
                className="min-w-[150px] data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100"
              >
                <Link href="/comp/paths" prefetch>
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
