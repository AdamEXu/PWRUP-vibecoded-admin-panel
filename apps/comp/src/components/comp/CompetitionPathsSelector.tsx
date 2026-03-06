"use client";

import NextImage from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { usePathNetworkTable } from "@/lib/hooks/usePathNetworkTable";
import { usePathLibrary } from "@/lib/hooks/usePathLibrary";
import { findMatchingPathName } from "@/lib/pathLibrary";
import { Card, CardContent } from "@pwrup/shared-ui/card";

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

export function CompetitionPathsSelector() {
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

  const handleSelectPath = useCallback(async (pathName: string | null) => {
    const valueToPublish = pathName ?? "NONE";
    setSelectedPathName(pathName);
    setStoredPath(pathName);
    setPendingPublish(valueToPublish);
    try {
      await publishSelectedAuto(valueToPublish);
    } finally {
      setPendingPublish(null);
    }
  }, [publishSelectedAuto]);

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

  const selectedPathEntry = useMemo(
    () => paths.find((entry) => entry.name === selectedPathName) ?? null,
    [paths, selectedPathName],
  );
  const previewImageSrc = selectedPathEntry?.imageUrl ?? null;
  const robotMatchedPath = findMatchingPathName(selectedAutoFromRobot, paths);
  const isRobotSelectionUnavailable = !isConnected || selectedAutoFromRobot === null;
  const lastUpdatedText =
    typeof lastUpdatedMs === "number" ? new Date(lastUpdatedMs).toLocaleTimeString() : "No updates yet";
  const lastPublishText =
    typeof lastPublishMs === "number" ? new Date(lastPublishMs).toLocaleTimeString() : "No publish yet";

  return (
    <section className="flex h-full min-h-0 flex-col gap-3">
      <Card className="flex-1 min-h-0 border-white/10 bg-black/50 shadow-none">
        <CardContent className="flex h-full min-h-0 flex-col p-3">
          <div className="mb-3 rounded-md border border-white/10 bg-black/70 px-3 py-2 text-xs">
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
              {robotMatchedPath && (
                <span className="text-zinc-500">Matched and selected for preview.</span>
              )}
              {selectedAutoFromRobot && !robotMatchedPath && (
                <span className="text-amber-300">Robot path is not present in screenshot folder.</span>
              )}
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

          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="min-h-0 rounded-md border border-white/10 bg-black/70 p-3">
              <div className="mb-2">
                <h2 className="text-sm font-medium text-zinc-100">Path Selector</h2>
                <p className="text-xs text-zinc-500">
                  Loaded from <span className="font-mono text-zinc-400">{directoryLabel}</span>.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  type="button"
                  onClick={() => handleSelectPath(null)}
                  disabled={pendingPublish === "NONE"}
                  className={
                    selectedPathName === null
                      ? "flex h-11 items-center rounded-md border border-amber-500/60 bg-amber-500/15 px-3 text-left text-sm font-semibold text-amber-100"
                      : isRobotSelectionUnavailable
                        ? "flex h-11 items-center rounded-md border border-amber-500/40 bg-amber-500/10 px-3 text-left text-sm font-medium text-amber-200 transition hover:border-amber-500/70"
                        : "flex h-11 items-center rounded-md border border-white/15 bg-black px-3 text-left text-sm font-medium text-zinc-300 transition hover:border-white/30 hover:text-zinc-100"
                  }
                >
                  {pendingPublish === "NONE"
                    ? "Publishing OFFLINE / NONE..."
                    : isRobotSelectionUnavailable
                      ? "OFFLINE / NONE (Robot unavailable)"
                      : "NONE (Clear Selection)"}
                </button>
                {paths.map((pathEntry) => {
                  const isSelected = selectedPathName === pathEntry.name;
                  return (
                    <button
                      key={pathEntry.fileName}
                      type="button"
                      onClick={() => handleSelectPath(pathEntry.name)}
                      disabled={pendingPublish === pathEntry.name}
                      className={
                        isSelected
                          ? "flex h-11 items-center rounded-md border border-white/55 bg-zinc-900 px-3 text-left text-sm font-medium text-white"
                          : "flex h-11 items-center rounded-md border border-white/15 bg-black px-3 text-left text-sm font-medium text-zinc-300 transition hover:border-white/30 hover:text-zinc-100"
                      }
                    >
                      <span
                        className={
                          isSelected
                            ? "mr-2 h-2 w-2 rounded-full bg-white"
                            : "mr-2 h-2 w-2 rounded-full bg-transparent"
                        }
                      />
                      {pendingPublish === pathEntry.name ? `Publishing ${pathEntry.name}...` : pathEntry.name}
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
            </div>

            <div className="min-h-0 rounded-md border border-white/10 bg-black/70 p-3">
              <div className="mb-2">
                <h2 className="text-sm font-medium text-zinc-100">Path Overview</h2>
                <p className="text-xs text-zinc-500">{selectedPathName ?? "NONE"}</p>
              </div>
              <div className="relative flex h-[60vh] min-h-[280px] w-full items-center justify-center overflow-hidden rounded-md bg-zinc-950">
                {previewImageSrc ? (
                  <NextImage
                    src={previewImageSrc}
                    alt={`${selectedPathName} path preview`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    unoptimized
                    className="object-contain"
                  />
                ) : (
                  <div className="px-5 text-center text-xs text-zinc-500">
                    {selectedPathName
                      ? "No screenshot available for the selected path."
                      : "No path selected."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
