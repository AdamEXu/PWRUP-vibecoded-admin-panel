"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Gauge,
  Signal,
  Timer,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pwrup/shared-ui/card";
import { Badge } from "@pwrup/shared-ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@pwrup/shared-ui/alert";
import type { MechanismAnalysis, NormalizedTrace, Recommendation, SignalCheck } from "@/lib/analysis/types";
import { mergeTrace } from "@/lib/analysis/analyzeMechanism";

function formatSeconds(value: number | null) {
  return value === null ? "n/a" : `${value.toFixed(2)} s`;
}

function checkBadgeVariant(status: SignalCheck["status"]) {
  switch (status) {
    case "good":
      return "secondary";
    case "warn":
      return "outline";
    case "bad":
      return "destructive";
  }
}

function recommendationTone(recommendation: Recommendation) {
  if (recommendation.direction === "review") return "outline";
  return recommendation.direction === "increase" ? "secondary" : "outline";
}

function chartData(trace: NormalizedTrace) {
  const merged = mergeTrace(trace);
  const step = Math.max(1, Math.floor(merged.length / 240));
  return merged.filter((_, index) => index % step === 0).map((point) => ({
    timeSec: Number(point.timeSec.toFixed(2)),
    setpoint: point.setpoint,
    measurement: point.measurement,
    effort: point.effort,
    current: point.current,
  }));
}

interface AnalysisDashboardProps {
  analysis: MechanismAnalysis | null;
  trace: NormalizedTrace;
  sourceLabel: string;
  emptyStateTitle: string;
  emptyStateDescription: string;
  helperText?: string;
}

export function AnalysisDashboard({
  analysis,
  trace,
  sourceLabel,
  emptyStateTitle,
  emptyStateDescription,
  helperText,
}: AnalysisDashboardProps) {
  const latestRun = analysis?.latestRun ?? null;
  const mergedChartData = chartData(trace);

  if (!analysis) {
    return (
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{emptyStateTitle}</CardTitle>
          <CardDescription>{emptyStateDescription}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-4">
        {[
          {
            label: "Overall score",
            value: analysis.overallScore === null ? "n/a" : `${analysis.overallScore}/100`,
            detail: "Average of scored runs in the current trace window.",
            icon: Gauge,
          },
          {
            label: "Confidence",
            value: `${Math.round(analysis.overallConfidence * 100)}%`,
            detail: "Higher confidence means the trace contains enough movement and context to trust the recommendation.",
            icon: Signal,
          },
          {
            label: "Detected runs",
            value: String(analysis.runs.length),
            detail: "Runs are segmented from setpoint transitions in the current trace.",
            icon: CircleDot,
          },
          {
            label: "Trace window",
            value: `${analysis.traceWindowSec.toFixed(1)} s`,
            detail: sourceLabel,
            icon: Timer,
          },
        ].map((card) => (
          <Card key={card.label} className="border-border/70">
            <CardHeader className="space-y-3">
              <div className="flex size-10 items-center justify-center rounded-md border border-border bg-accent/60">
                <card.icon className="size-5" />
              </div>
              <div>
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="pt-1 text-2xl">{card.value}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{card.detail}</CardContent>
          </Card>
        ))}
      </div>

      <Alert className="border-border/70 bg-card/80">
        {latestRun?.dataSufficient ? (
          <CheckCircle2 className="size-4 text-emerald-400" />
        ) : (
          <AlertTriangle className="size-4 text-amber-400" />
        )}
        <AlertTitle>{analysis.summary}</AlertTitle>
        <AlertDescription>
          {helperText ??
            "All recommendations are advisory only. Use repeated traces before changing gains in robot code."}
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Trace View</CardTitle>
            <CardDescription>
              Setpoint and measurement are plotted on the same axis. Effort overlays below to reveal saturation.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mergedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="timeSec" tick={{ fill: "#b0b8c8", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#b0b8c8", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(21,24,32,0.96)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                  />
                  <Line type="monotone" dataKey="setpoint" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="measurement" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mergedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="timeSec" hide />
                  <YAxis tick={{ fill: "#b0b8c8", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(21,24,32,0.96)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                  />
                  <Area type="monotone" dataKey="effort" stroke="var(--color-chart-4)" fill="color-mix(in oklab, var(--color-chart-4) 35%, transparent)" />
                  <Area type="monotone" dataKey="current" stroke="var(--color-chart-2)" fill="color-mix(in oklab, var(--color-chart-2) 20%, transparent)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Latest Run Scorecard</CardTitle>
              <CardDescription>
                These metrics come from the most recent detected run in the current trace window.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {latestRun ? (
                [
                  ["Rise time", formatSeconds(latestRun.metrics.riseTimeSec)],
                  ["Settling", formatSeconds(latestRun.metrics.settlingTimeSec)],
                  ["Overshoot", latestRun.metrics.overshootPct === null ? "n/a" : `${latestRun.metrics.overshootPct.toFixed(1)}%`],
                  ["Bias", `${latestRun.metrics.steadyStateError.toFixed(3)} ${analysis.mechanism.unit}`],
                  ["Oscillation", latestRun.metrics.oscillationScore.toFixed(2)],
                  ["Saturation", latestRun.metrics.saturationPct === null ? "n/a" : `${latestRun.metrics.saturationPct.toFixed(0)}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border/60 bg-background/50 p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
                    <div className="pt-1 text-lg font-semibold">{value}</div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No completed run is available yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Signal Quality</CardTitle>
              <CardDescription>
                This is where the analyzer explains whether it trusts the current trace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(latestRun?.checks ?? []).map((check) => (
                <div key={check.label} className="rounded-lg border border-border/60 bg-background/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{check.label}</div>
                    <Badge variant={checkBadgeVariant(check.status)}>{check.status}</Badge>
                  </div>
                  <p className="pt-2 text-sm text-muted-foreground">{check.detail}</p>
                </div>
              ))}
              {!latestRun ? <p className="text-sm text-muted-foreground">Run quality checks will appear after a trace has both setpoint and measurement data.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Recommended Next Changes</CardTitle>
            <CardDescription>
              Suggestions are generated from the trace only. They are not applied automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestRun?.recommendations?.length ? (
              latestRun.recommendations.map((recommendation, index) => (
                <div key={`${recommendation.parameter}-${index}`} className="rounded-lg border border-border/60 bg-background/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">
                      {recommendation.direction} {recommendation.parameter}
                    </div>
                    <Badge variant={recommendationTone(recommendation)}>
                      {recommendation.strength}
                    </Badge>
                  </div>
                  <p className="pt-2 text-sm text-muted-foreground">{recommendation.reason}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No recommendation is shown yet. This usually means the trace is either too small to trust or already reasonably controlled.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Run Comparison</CardTitle>
            <CardDescription>
              Compare the detected runs in the current trace window before deciding whether a change helped.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.runs.length > 0 ? (
              analysis.runs.map((run) => (
                <div key={run.id} className="rounded-lg border border-border/60 bg-background/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{run.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {run.startTimeSec.toFixed(2)}s to {run.endTimeSec.toFixed(2)}s
                      </div>
                    </div>
                    <Badge variant={run.score === null ? "outline" : "secondary"}>
                      {run.score === null ? "insufficient" : `${run.score}/100`}
                    </Badge>
                  </div>
                  <div className="grid gap-2 pt-3 text-sm text-muted-foreground sm:grid-cols-2">
                    <div>Rise: {formatSeconds(run.metrics.riseTimeSec)}</div>
                    <div>Settle: {formatSeconds(run.metrics.settlingTimeSec)}</div>
                    <div>Overshoot: {run.metrics.overshootPct === null ? "n/a" : `${run.metrics.overshootPct.toFixed(1)}%`}</div>
                    <div>Confidence: {Math.round(run.confidence * 100)}%</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No run boundaries have been detected yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
