// src/components/dashboard/PingStatus.tsx - Purpose: ping/pong latency display and controls
"use client";
import { usePing } from "@/lib/hooks/usePing";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@pwrup/shared-ui/card";
import { Button } from "@pwrup/shared-ui/button";
import { Badge } from "@pwrup/shared-ui/badge";
import { useMemo, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PingStatusProps {
  piNames: string[];
}

type PingTestPoint = {
  seq: number;
  ping: number | null;
};

export function PingStatus({ piNames }: PingStatusProps) {
  const { pingResults, sendPing, pingAll, isConnected, runPingTest } =
    usePing();
  const [isTesting, setIsTesting] = useState(false);
  const [testPiName, setTestPiName] = useState<string | null>(null);
  const [testSeries, setTestSeries] = useState<PingTestPoint[] | null>(null);

  const testStats = useMemo(() => {
    if (!testSeries) return null;
    const valid = testSeries
      .map((p) => p.ping)
      .filter((x): x is number => typeof x === "number");
    if (valid.length === 0) {
      return {
        count: testSeries.length,
        ok: 0,
        avg: null,
        min: null,
        max: null,
      };
    }
    const sum = valid.reduce((a, b) => a + b, 0);
    return {
      count: testSeries.length,
      ok: valid.length,
      avg: Math.round(sum / valid.length),
      min: Math.round(Math.min(...valid)),
      max: Math.round(Math.max(...valid)),
    };
  }, [testSeries]);

  const runTest = useCallback(async () => {
    const piName = piNames[0];
    if (!piName) return;
    if (!isConnected) return;
    if (isTesting) return;

    setIsTesting(true);
    setTestPiName(piName);
    setTestSeries(null);
    try {
      const samples = await runPingTest(piName, 20, 50);
      setTestSeries(
        samples.map((ping, idx) => ({
          seq: idx + 1,
          ping,
        }))
      );
    } finally {
      setIsTesting(false);
    }
  }, [isConnected, isTesting, piNames, runPingTest]);

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return "text-emerald-400";
    if (latency < 100) return "text-yellow-400";
    if (latency < 200) return "text-orange-400";
    return "text-red-400";
  };

  const getLatencyLabel = (latency: number) => {
    if (latency < 50) return "Excellent";
    if (latency < 100) return "Good";
    if (latency < 200) return "Fair";
    return "Poor";
  };

  const getLatencyBadgeClass = (latency: number) => {
    if (latency < 50)
      return "bg-emerald-900/30 text-emerald-400 border-emerald-700/50";
    if (latency < 100)
      return "bg-yellow-900/30 text-yellow-400 border-yellow-700/50";
    if (latency < 200)
      return "bg-orange-900/30 text-orange-400 border-orange-700/50";
    return "bg-red-900/30 text-red-400 border-red-700/50";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Ping Status</CardTitle>
          <CardDescription>
            Note: this is client-side RTT; real one-way latency is often ~½ of
            this. JS/TS timing + message handling can inflate spikes.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => pingAll(piNames)}
            disabled={!isConnected || piNames.length === 0}
          >
            Ping All
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={runTest}
            disabled={!isConnected || piNames.length === 0 || isTesting}
          >
            {isTesting ? "Testing..." : "Test (20x)"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {piNames.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No Pi systems to ping. Add systems above to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {piNames.map((piName) => {
              const result = pingResults.get(piName);
              const hasResult = result !== undefined;
              const timeSincePing = result
                ? Date.now() - result.timestamp.getTime()
                : null;

              return (
                <div
                  key={piName}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border hover:border-emerald-500/50 transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{piName}</div>
                      {hasResult && timeSincePing !== null && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {timeSincePing < 1000
                            ? `Updated ${Math.round(timeSincePing)}ms ago`
                            : `Updated ${Math.round(timeSincePing / 1000)}s ago`}
                        </div>
                      )}
                    </div>
                    {hasResult ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div
                          className={`text-lg font-bold font-mono ${getLatencyColor(
                            result.latency
                          )}`}
                        >
                          {result.latency.toFixed(0)}ms
                        </div>
                        <Badge className={getLatencyBadgeClass(result.latency)}>
                          {getLatencyLabel(result.latency)}
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground flex-shrink-0">
                        No ping data
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendPing(piName)}
                    disabled={!isConnected}
                    className="ml-3"
                  >
                    Ping
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {testSeries && testPiName ? (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold">
                  Ping Test: {testPiName} (20× @ 50ms)
                </div>
                {testStats ? (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    ok {testStats.ok}/{testStats.count}
                    {testStats.avg !== null
                      ? ` · avg ${testStats.avg}ms · min ${testStats.min}ms · max ${testStats.max}ms`
                      : " · no successful samples"}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={testSeries}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <defs>
                    <linearGradient
                      id="pingTestGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="seq"
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={{ stroke: "#4b5563" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#9ca3af" }}
                    axisLine={{ stroke: "#4b5563" }}
                    label={{
                      value: "ms",
                      angle: -90,
                      position: "insideLeft",
                      fill: "#9ca3af",
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                      color: "#f3f4f6",
                    }}
                    formatter={(value) => {
                      const n = typeof value === "number" ? value : null;
                      return [
                        n === null ? "timeout" : `${Math.round(n)}ms`,
                        "Ping",
                      ];
                    }}
                    labelFormatter={(label) => `#${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="ping"
                    stroke="#a855f7"
                    fillOpacity={1}
                    fill="url(#pingTestGradient)"
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
