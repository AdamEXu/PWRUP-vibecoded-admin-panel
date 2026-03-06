"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Address, AutobahnClient } from "autobahn-client";
import { useSettings } from "@/lib/settings";
import { PIDFFUpdateMessage } from "@pwrup/shared-proto/status/Frontend";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@pwrup/shared-ui/card";
import { Input } from "@pwrup/shared-ui/input";
import { Label } from "@pwrup/shared-ui/label";
import { Button } from "@pwrup/shared-ui/button";
import { Slider } from "@pwrup/shared-ui/slider";
import { Badge } from "@pwrup/shared-ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@pwrup/shared-ui/collapsible";

type PidGains = {
  p: number;
  i: number;
  d: number;
  ff: number;
};

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function toNumberOr(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function RobotControlsPage() {
  const { settings } = useSettings();
  const client = useMemo(
    () => new AutobahnClient(new Address(settings.host, settings.port)),
    [settings.host, settings.port]
  );

  const [isConnected, setIsConnected] = useState(false);
  const [pidPublishTopic, setPidPublishTopic] = useState<string>("");
  const [gains, setGains] = useState<PidGains>({
    p: 0,
    i: 0,
    d: 0,
    ff: 0,
  });
  const [publishMode, setPublishMode] = useState<"apply" | "live">("apply");
  const [lastPublish, setLastPublish] = useState<{
    atMs: number;
    topic: string;
    bytes: number;
    ok: boolean;
    message?: string;
  } | null>(null);
  const [isPidOpen, setIsPidOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;

    try {
      client.begin();
    } catch {
      // ignore begin failures (server may be down)
    }

    const pollId = window.setInterval(() => {
      if (cancelled) return;
      try {
        setIsConnected(client.isConnected());
      } catch {
        setIsConnected(false);
      }
    }, 750);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
    };
  }, [client]);

  const canPublish =
    isConnected && client.isConnected() && pidPublishTopic.trim().length > 0;

  const publishPid = useCallback(async () => {
    const topic = pidPublishTopic.trim();
    if (!topic) {
      setLastPublish({
        atMs: Date.now(),
        topic,
        bytes: 0,
        ok: false,
        message: "Missing publish topic.",
      });
      return;
    }

    if (!client.isConnected()) {
      setLastPublish({
        atMs: Date.now(),
        topic,
        bytes: 0,
        ok: false,
        message: "Not connected.",
      });
      return;
    }

    try {
      const bytes = PIDFFUpdateMessage.encode({
        p: gains.p,
        i: gains.i,
        d: gains.d,
        ff: gains.ff,
      }).finish();
      client.publish(topic, bytes);
      setLastPublish({
        atMs: Date.now(),
        topic,
        bytes: bytes.length,
        ok: true,
      });
    } catch (e) {
      setLastPublish({
        atMs: Date.now(),
        topic,
        bytes: 0,
        ok: false,
        message: (e as Error).message,
      });
    }
  }, [client, gains, pidPublishTopic]);

  useEffect(() => {
    if (publishMode !== "live") return;
    if (!canPublish) return;

    const id = window.setTimeout(() => {
      void publishPid();
    }, 200);

    return () => window.clearTimeout(id);
  }, [canPublish, gains, publishMode, publishPid]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Publishing Setup</CardTitle>
          <CardDescription>
            Configure the topic and mode for publishing PID gains
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="pid-topic">PID publish topic</Label>
              <Input
                id="pid-topic"
                type="text"
                placeholder='e.g. "robot/control/pid/set"'
                value={pidPublishTopic}
                onChange={(e) => setPidPublishTopic(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Payload is protobuf bytes:{" "}
                <code className="text-foreground">
                  PIDFFUpdateMessage {"{ p, i, d, ff }"}
                </code>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Publish mode</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant={publishMode === "apply" ? "default" : "outline"}
                  onClick={() => setPublishMode("apply")}
                >
                  Apply button
                </Button>
                <Button
                  variant={publishMode === "live" ? "default" : "outline"}
                  onClick={() => setPublishMode("live")}
                >
                  Live publish
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Connected to {settings.host}:{settings.port} •{" "}
                {isConnected ? (
                  <Badge variant="default" className="ml-1">
                    connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="ml-1">
                    disconnected
                  </Badge>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Collapsible open={isPidOpen} onOpenChange={setIsPidOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer select-none">
              <div className="flex items-center justify-between">
                <CardTitle>PID Tuning (P / I / D / FF)</CardTitle>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${
                    isPidOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
              <CardDescription>
                Adjust gains independently, then{" "}
                {publishMode === "apply"
                  ? "click Apply"
                  : "they auto-publish"}
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(
                  [
                    ["p", "P gain"],
                    ["i", "I gain"],
                    ["d", "D gain"],
                    ["ff", "FF factor"],
                  ] as const
                ).map(([key, label]) => (
                  <div
                    key={key}
                    className="rounded-lg border bg-muted/50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Label>{label}</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="w-28 font-mono text-sm"
                        value={String(gains[key])}
                        step={0.001}
                        onChange={(e) => {
                          const n = toNumberOr(e.target.value, gains[key]);
                          setGains((prev) => ({ ...prev, [key]: n }));
                        }}
                      />
                    </div>
                    <Slider
                      min={0}
                      max={10}
                      step={0.001}
                      value={[clampNumber(gains[key], 0, 10)]}
                      onValueChange={([val]) => {
                        setGains((prev) => ({ ...prev, [key]: val }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground font-mono">
                      {key.toUpperCase()}={gains[key]}
                    </p>
                  </div>
                ))}
              </div>

              {publishMode === "apply" && (
                <div className="flex items-center gap-3">
                  <Button onClick={() => void publishPid()} disabled={!canPublish}>
                    Apply
                  </Button>
                  {!pidPublishTopic.trim() && (
                    <span className="text-xs text-muted-foreground">
                      Provide a publish topic to enable Apply.
                    </span>
                  )}
                </div>
              )}

              {lastPublish && (
                <div
                  className={`text-xs rounded-md border px-3 py-2 font-mono ${
                    lastPublish.ok
                      ? "border-green-600 bg-green-900/20 text-green-400"
                      : "border-red-600 bg-red-900/20 text-red-400"
                  }`}
                >
                  {lastPublish.ok ? "Published" : "Publish failed"} • topic=
                  <span className="text-foreground">{lastPublish.topic}</span> •
                  bytes={lastPublish.bytes}
                  {lastPublish.message ? ` • ${lastPublish.message}` : ""}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
