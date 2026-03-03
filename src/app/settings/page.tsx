"use client";

import { useEffect, useState } from "react";
import {
  ntSelectedPathTopics,
  useSettings,
} from "@/lib/settings";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout";

function SettingsContent() {
  const { settings, setSettings, resetDefaults } = useSettings();
  const [host, setHost] = useState(settings.host);
  const [port, setPort] = useState<number>(settings.port);
  const [ntHost, setNtHost] = useState<string>(settings.networkTables.host);
  const [ntPort, setNtPort] = useState<number>(settings.networkTables.port);
  const [sharedTable, setSharedTable] = useState<string>(settings.networkTables.sharedTable);
  const [selectedPathTopic, setSelectedPathTopic] = useState<string>(settings.networkTables.selectedPathTopic);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setHost(settings.host);
    setPort(settings.port);
    setNtHost(settings.networkTables.host);
    setNtPort(settings.networkTables.port);
    setSharedTable(settings.networkTables.sharedTable);
    setSelectedPathTopic(settings.networkTables.selectedPathTopic);
  }, [
    settings.host,
    settings.networkTables.host,
    settings.networkTables.port,
    settings.networkTables.selectedPathTopic,
    settings.networkTables.sharedTable,
    settings.port,
  ]);

  const nextHost = host.trim();
  const nextPort = Number(port);
  const nextNtHost = ntHost.trim();
  const nextNtPort = Number(ntPort);
  const nextSharedTable = sharedTable.trim();
  const nextSelectedPathTopic = selectedPathTopic.trim();
  const canSave =
    nextHost.length > 0 &&
    Number.isFinite(nextPort) &&
    nextPort > 0 &&
    nextPort <= 65535 &&
    nextNtHost.length > 0 &&
    Number.isFinite(nextNtPort) &&
    nextNtPort > 0 &&
    nextNtPort <= 65535 &&
    nextSharedTable.length > 0 &&
    nextSelectedPathTopic.length > 0;
  const hasChanges =
    nextHost !== settings.host ||
    Math.round(nextPort) !== settings.port ||
    nextNtHost !== settings.networkTables.host ||
    Math.round(nextNtPort) !== settings.networkTables.port ||
    nextSharedTable !== settings.networkTables.sharedTable ||
    nextSelectedPathTopic !== settings.networkTables.selectedPathTopic;
  const previewTopics = ntSelectedPathTopics(nextSharedTable, nextSelectedPathTopic);

  function onSave() {
    if (!canSave) {
      setSaved(false);
      return;
    }

    setSettings({
      host: nextHost,
      port: Math.round(nextPort),
      networkTables: {
        host: nextNtHost,
        port: Math.round(nextNtPort),
        sharedTable: nextSharedTable,
        selectedPathTopic: nextSelectedPathTopic,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function onReset() {
    resetDefaults();
    setSaved(false);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="sticky top-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-zinc-950/95 px-3 py-2 backdrop-blur">
        <span className="text-sm text-zinc-400">
          {hasChanges ? "Unsaved changes" : "All changes saved"}
        </span>
        <div className="flex items-center gap-3">
          <Button onClick={onSave} disabled={!canSave || !hasChanges}>
            Save changes
          </Button>
          <Button variant="outline" onClick={onReset}>
            Reset defaults
          </Button>
          {saved && <span className="text-sm text-emerald-400">Saved</span>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Autobahn Connection</CardTitle>
          <CardDescription>
            Configure the host and port for the Autobahn WebSocket connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              type="text"
              placeholder="e.g. 10.47.65.7"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="text"
              inputMode="numeric"
              placeholder="8080"
              value={String(port)}
              onChange={(e) => {
                const v = e.target.value.replace(/\D+/g, "");
                setPort(v === "" ? 0 : Number(v));
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>NetworkTables (Paths)</CardTitle>
          <CardDescription>
            Path sync uses WPILib NT4 and connects to your configured robot host/IP. No &quot;/Shared&quot; prefix is added automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nt-host">Robot NT Host / IP</Label>
            <Input
              id="nt-host"
              type="text"
              placeholder="10.47.65.2 or roborio-4765-frc.local"
              value={ntHost}
              onChange={(e) => setNtHost(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nt-port">NT Port</Label>
            <Input
              id="nt-port"
              type="text"
              inputMode="numeric"
              placeholder="5810"
              value={String(ntPort)}
              onChange={(e) => {
                const v = e.target.value.replace(/\D+/g, "");
                setNtPort(v === "" ? 0 : Number(v));
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nt-shared-table">Dashboard-Robot Shared Table</Label>
            <Input
              id="nt-shared-table"
              type="text"
              placeholder="Shared/PathPlanner"
              value={sharedTable}
              onChange={(e) => setSharedTable(e.target.value)}
            />
            <p className="text-xs text-zinc-500">
              Examples: Shared/PathPlanner or PathPlanner.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nt-selected-topic">Request Topic Base</Label>
            <Input
              id="nt-selected-topic"
              type="text"
              placeholder="SelectedPath"
              value={selectedPathTopic}
              onChange={(e) => setSelectedPathTopic(e.target.value)}
            />
            <p className="text-xs text-zinc-500">
              This is the request/state base. Do not include /Request or /State.
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
            NetworkTables target host:{" "}
            <span className="font-mono text-zinc-100">
              {ntHost || "(not set)"}
            </span>
            <br />
            Request topic (app to robot):{" "}
            <span className="font-mono text-zinc-100">
              {previewTopics.requestTopic}
            </span>
            <br />
            State topic (robot to app):{" "}
            <span className="font-mono text-zinc-100">
              {previewTopics.stateTopic}
            </span>
            <br />
            Robot-side constants style (no leading slash):{" "}
            <span className="font-mono text-zinc-100">
              {previewTopics.requestTopicWithoutLeadingSlash} / {previewTopics.stateTopicWithoutLeadingSlash}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppLayout title="Settings">
      <SettingsContent />
    </AppLayout>
  );
}
