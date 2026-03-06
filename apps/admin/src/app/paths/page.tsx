"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pwrup/shared-ui/card";
import { usePathNetworkTable } from "@/lib/hooks/usePathNetworkTable";
import { usePathLibrary } from "@/lib/hooks/usePathLibrary";
import { findMatchingPathName } from "@/lib/pathLibrary";

const SELECTED_PATH_STORAGE_KEY = "blitz.paths.selected";

function getStoredPath(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(SELECTED_PATH_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function setStoredPath(pathName: string | null): void {
  try {
    if (!pathName || pathName.trim().length === 0) {
      localStorage.removeItem(SELECTED_PATH_STORAGE_KEY);
      return;
    }
    localStorage.setItem(SELECTED_PATH_STORAGE_KEY, pathName);
  } catch {
    // Ignore storage errors.
  }
}

export default function PathsPage() {
  const {
    robotIp,
    requestTopic,
    stateTopic,
    isConnected,
    selectedAutoFromRobot,
    lastUpdatedMs,
    publishSelectedAuto,
    lastPublishMs,
    publishError,
  } = usePathNetworkTable();
  const { paths, isLoading, error, directoryLabel, reload } = usePathLibrary();
  const [selectedPathName, setSelectedPathName] = useState<string | null>(() => {
    const stored = getStoredPath().trim();
    return stored.length > 0 ? stored : null;
  });
  const [pendingPublish, setPendingPublish] = useState<string | null>(null);

  useEffect(() => {
    if (selectedAutoFromRobot === null) {
      setSelectedPathName(null);
      setStoredPath(null);
      return;
    }

    const matchedPath = findMatchingPathName(selectedAutoFromRobot, paths);
    if (!matchedPath) {
      setSelectedPathName(null);
      return;
    }
    setSelectedPathName(matchedPath);
    setStoredPath(matchedPath);
  }, [paths, selectedAutoFromRobot]);

  const robotMatchedPath = findMatchingPathName(selectedAutoFromRobot, paths);
  const isRobotSelectionUnavailable = !isConnected || selectedAutoFromRobot === null;
  const lastUpdatedText =
    typeof lastUpdatedMs === "number" ? new Date(lastUpdatedMs).toLocaleTimeString() : "No updates yet";
  const lastPublishText =
    typeof lastPublishMs === "number" ? new Date(lastPublishMs).toLocaleTimeString() : "No publish yet";

  return (
    <AppLayout title="Path Selection">
      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>NetworkTables Path Sync</CardTitle>
            <CardDescription>
              Reads the robot&apos;s current path from WPILib NetworkTables (read-only from this app).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className={isConnected ? "text-emerald-400" : "text-zinc-500"}>
                  {isConnected ? "NT Connected" : "NT Disconnected"}
                </span>
                <span className="text-zinc-400">
                  NT Host: <span className="font-mono text-zinc-200">{robotIp || "(not set)"}</span>
                </span>
                <span className="text-zinc-400">
                  Request Topic: <span className="font-mono text-zinc-200">{requestTopic || "(not set)"}</span>
                </span>
                <span className="text-zinc-400">
                  State Topic: <span className="font-mono text-zinc-200">{stateTopic || "(not set)"}</span>
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-zinc-400">
                  Robot Selected Auto: <span className="font-medium text-zinc-200">{selectedAutoFromRobot ?? "NONE"}</span>
                </span>
                <span className="text-zinc-500">
                  App Selected Path: <span className="font-medium text-zinc-300">{selectedPathName ?? "NONE"}</span>
                </span>
                <span className="text-zinc-500">Updated: {lastUpdatedText}</span>
                <span className="text-zinc-500">Last publish: {lastPublishText}</span>
                {publishError && <span className="text-rose-300">Publish error: {publishError}</span>}
              </div>
              {isRobotSelectionUnavailable && (
                <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Robot selected auto is unavailable (offline/restarting). Active state is OFFLINE / NONE.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-zinc-500">
                Loaded from <span className="font-mono text-zinc-400">{directoryLabel}</span>.
              </p>
              <button
                type="button"
                onClick={async () => {
                  setSelectedPathName(null);
                  setStoredPath(null);
                  setPendingPublish("NONE");
                  try {
                    await publishSelectedAuto("NONE");
                  } finally {
                    setPendingPublish(null);
                  }
                }}
                disabled={pendingPublish === "NONE"}
                className={
                  selectedPathName === null
                    ? "flex w-full items-center justify-between rounded-md border border-amber-500/60 bg-amber-500/15 px-3 py-2 text-left text-sm font-semibold text-amber-100"
                    : isRobotSelectionUnavailable
                      ? "flex w-full items-center justify-between rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-left text-sm font-medium text-amber-200 transition hover:border-amber-500/70"
                      : "flex w-full items-center justify-between rounded-md border border-white/15 bg-black px-3 py-2 text-left text-sm font-medium text-zinc-300 transition hover:border-white/30 hover:text-zinc-100"
                }
              >
                <span>
                  {pendingPublish === "NONE"
                    ? "Publishing OFFLINE / NONE..."
                    : isRobotSelectionUnavailable
                      ? "OFFLINE / NONE (Robot unavailable)"
                      : "NONE (Clear Selection)"}
                </span>
              </button>
              {paths.map((pathEntry) => {
                const isSelected = selectedPathName === pathEntry.name;
                const isRobotPath = robotMatchedPath === pathEntry.name;
                return (
                  <button
                    key={pathEntry.fileName}
                    type="button"
                    onClick={async () => {
                      setSelectedPathName(pathEntry.name);
                      setStoredPath(pathEntry.name);
                      setPendingPublish(pathEntry.name);
                      try {
                        await publishSelectedAuto(pathEntry.name);
                      } finally {
                        setPendingPublish(null);
                      }
                    }}
                    disabled={pendingPublish === pathEntry.name}
                    className={
                      isSelected
                        ? "flex w-full items-center justify-between rounded-md border border-white/55 bg-zinc-900 px-3 py-2 text-left text-sm font-medium text-white"
                        : "flex w-full items-center justify-between rounded-md border border-white/15 bg-black px-3 py-2 text-left text-sm font-medium text-zinc-300 transition hover:border-white/30 hover:text-zinc-100"
                    }
                  >
                    <span>{pendingPublish === pathEntry.name ? `Publishing ${pathEntry.name}...` : pathEntry.name}</span>
                    {isRobotPath && (
                      <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-emerald-300">
                        Robot Active
                      </span>
                    )}
                  </button>
                );
              })}
              {isLoading && (
                <div className="rounded-md border border-dashed border-white/15 px-3 py-2 text-xs text-zinc-400">
                  Loading path screenshots...
                </div>
              )}
              {!isLoading && paths.length === 0 && (
                <div className="rounded-md border border-dashed border-white/15 px-3 py-2 text-xs text-zinc-400">
                  No path screenshots found.
                </div>
              )}
              {error && (
                <button
                  type="button"
                  onClick={() => void reload()}
                  className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-left text-xs text-rose-200"
                >
                  Failed to load path screenshots. Click to retry.
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
