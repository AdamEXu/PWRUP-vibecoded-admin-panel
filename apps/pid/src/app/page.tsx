import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Database,
  Eye,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pwrup/shared-ui/card";
import { Badge } from "@pwrup/shared-ui/badge";
import { Button } from "@pwrup/shared-ui/button";
import { Alert, AlertDescription, AlertTitle } from "@pwrup/shared-ui/alert";
import { AppLayout } from "@/components/layout";
import { MECHANISM_GROUPS } from "@/lib/analysis/mechanisms";

const entryCards = [
  {
    title: "Live Monitor",
    description: "Watch NT4 telemetry in real time and score the current loop response without sending commands.",
    href: "/live",
    icon: Activity,
  },
  {
    title: "Offline Review",
    description: "Open replay databases, extract relevant traces, and compare multiple runs side by side.",
    href: "/offline",
    icon: Database,
  },
  {
    title: "Settings",
    description: "Reuse the shared connection settings and tune local analyzer preferences for replay review.",
    href: "/settings",
    icon: Gauge,
  },
];

export default function HomePage() {
  return (
    <AppLayout
      title="PID Analyzer"
      subtitle="Read-only loop analysis for live NT4 telemetry and replay review."
    >
      <Alert className="border-primary/20 bg-card/80">
        <ShieldCheck className="size-4" />
        <AlertTitle>Read-only by design</AlertTitle>
        <AlertDescription>
          This app never starts tests, moves mechanisms, publishes motor commands, or writes gains
          back to robot code. It only reads telemetry and suggests what to try next.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Where to start</CardTitle>
            <CardDescription>
              Pick a workflow based on how you already gather data. Live mode is best for field or
              bench observation. Offline review is best when you already have replay logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {entryCards.map((card) => (
              <Card key={card.href} className="border-border/60 bg-background/50 shadow-none">
                <CardHeader className="space-y-3">
                  <div className="flex size-10 items-center justify-center rounded-md border border-border bg-accent/60">
                    <card.icon className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <CardDescription className="pt-1 text-sm leading-6">
                      {card.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full justify-between">
                    <Link href={card.href}>
                      Open
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Coverage in v1</CardTitle>
            <CardDescription>
              Mechanisms are grouped so the operator can stay oriented while still reaching each
              direct motor loop quickly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {MECHANISM_GROUPS.map((group) => (
              <div key={group.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium">{group.label}</h3>
                  <Badge variant="outline">{group.mechanismIds.length} loops</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{group.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 lg:col-span-2">
          <CardHeader>
            <CardTitle>What the analyzer scores</CardTitle>
            <CardDescription>
              Every run is converted into a consistent scorecard so you can compare mechanisms or
              traces without guessing at what a plot means.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {[
              "Rise time and settling time to show how quickly the loop reaches target.",
              "Overshoot, steady-state error, and oscillation score to flag instability.",
              "Saturation hints, feedforward clues, and confidence so recommendations stay grounded in actual data.",
            ].map((item) => (
              <div key={item} className="rounded-lg border border-border/60 bg-background/50 p-4 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Operator expectations</CardTitle>
            <CardDescription>
              The analyzer works best when the trace already contains a meaningful setpoint change or
              sustained motion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <Eye className="mt-0.5 size-4 text-primary" />
              <p>Watch for a real excitation event instead of a flat trace. Small movements produce low-confidence advice.</p>
            </div>
            <div className="flex gap-3">
              <Gauge className="mt-0.5 size-4 text-primary" />
              <p>Prefer stable telemetry rates. Missing samples and long stalls will lower confidence instead of inventing results.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
