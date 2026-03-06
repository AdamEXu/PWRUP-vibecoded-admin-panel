// src/app/page.tsx - Purpose: home page with quick navigation
import Link from "next/link";
import { AppLayout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@pwrup/shared-ui/card";
import { Button } from "@pwrup/shared-ui/button";
import { LayoutDashboard, Gamepad2, Video, Settings } from "lucide-react";

const navCards = [
  {
    title: "Dashboard",
    description: "Monitor Pi systems and manage watchdog hosts",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Robot Controls",
    description: "Configure PID and feedforward gains",
    href: "/robot-controls",
    icon: Gamepad2,
  },
  {
    title: "Video Feed",
    description: "View multiple live camera streams",
    href: "/video",
    icon: Video,
  },
  {
    title: "Settings",
    description: "Configure connection settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Home() {
  return (
    <AppLayout title="Home">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome to PWRUP Admin</h2>
          <p className="text-muted-foreground">
            Control your Raspberry Pi fleet from one place.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {navCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card className="h-full transition-colors hover:bg-accent/50 cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <card.icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                  </div>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>
              Get started by opening the Dashboard to monitor your Pi systems, or go to Settings to configure your connection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/dashboard">Open Dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/settings">Settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
