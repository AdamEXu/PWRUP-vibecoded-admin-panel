"use client";

import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathLibrary } from "@/lib/hooks/usePathLibrary";
import { usePathNetworkTable } from "@/lib/hooks/usePathNetworkTable";
import { findMatchingPathName } from "@/lib/pathLibrary";
import { PathDetailPane } from "./auto-selector/components/PathDetailPane";
import { PathListPane } from "./auto-selector/components/PathListPane";
import type { AutoPathMetadata } from "./auto-selector/types";

const SELECTED_AUTO_STORAGE_KEY = "blitz.touchscreen.auto.selected";
const SYNC_THROTTLE_MS = 700;
const FLICKER_WINDOW_MS = 10_000;
const FLICKER_THRESHOLD = 10;

function getStoredSelectedAuto(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SELECTED_AUTO_STORAGE_KEY)?.trim() ?? "";
    return stored.length > 0 ? stored : null;
  } catch {
    return null;
  }
}

function setStoredSelectedAuto(pathName: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!pathName || pathName.trim().length === 0) {
      localStorage.removeItem(SELECTED_AUTO_STORAGE_KEY);
      return;
    }
    localStorage.setItem(SELECTED_AUTO_STORAGE_KEY, pathName);
  } catch {
    // Ignore storage errors.
  }
}

export function AutoSelector() {
  const { paths, isLoading, error, reload } = usePathLibrary();
  const { isConnected, selectedAutoFromRobot, publishSelectedAuto } = usePathNetworkTable();

  const [viewingPathName, setViewingPathName] = useState<string | null>(null);
  const [localSelectedPath, setLocalSelectedPath] = useState<string | null>(() => getStoredSelectedAuto());
  const [pendingPublish, setPendingPublish] = useState<string | null>(null);
  const [metadataByPathName, setMetadataByPathName] = useState<Record<string, AutoPathMetadata>>({});
  const [showConflictPopup, setShowConflictPopup] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasConnectedRef = useRef(false);
  const syncInFlightRef = useRef(false);
  const lastSyncAttemptMsRef = useRef(0);
  const previousRobotAutoRef = useRef<string>("NONE");
  const mismatchTimestampsRef = useRef<number[]>([]);

  const robotMatchedPath = useMemo(
    () => findMatchingPathName(selectedAutoFromRobot, paths),
    [selectedAutoFromRobot, paths],
  );
  const localMatchedPath = useMemo(
    () => findMatchingPathName(localSelectedPath, paths),
    [localSelectedPath, paths],
  );
  const normalizedRobotAuto = useMemo(() => {
    const trimmed = selectedAutoFromRobot?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : "NONE";
  }, [selectedAutoFromRobot]);

  const activePathName = localMatchedPath ?? robotMatchedPath;

  useEffect(() => {
    if (viewingPathName) {
      return;
    }
    if (activePathName) {
      setViewingPathName(activePathName);
    } else if (paths.length > 0) {
      setViewingPathName(paths[0].name);
    }
  }, [activePathName, paths, viewingPathName]);

  const viewingEntry = useMemo(
    () => paths.find((entry) => entry.name === viewingPathName) ?? null,
    [paths, viewingPathName],
  );
  const viewingMetadata = useMemo(
    () => (viewingEntry ? metadataByPathName[viewingEntry.name] : undefined),
    [metadataByPathName, viewingEntry],
  );

  const isViewingActive = viewingPathName !== null && viewingPathName === activePathName;

  useEffect(() => {
    let disposed = false;

    const names = Array.from(new Set(paths.map((entry) => entry.name.trim()).filter(Boolean)));
    if (names.length === 0) {
      setMetadataByPathName({});
      return;
    }

    void (async () => {
      const loaded = await Promise.all(
        names.map(async (name): Promise<[string, AutoPathMetadata | null]> => {
          try {
            const response = await fetch(`/path-overview/meta/${encodeURIComponent(name)}.json`, {
              cache: "no-store",
            });
            if (!response.ok) {
              return [name, null];
            }

            const parsed = (await response.json()) as {
              name?: unknown;
              description?: unknown;
            };
            const metadataName =
              typeof parsed.name === "string" && parsed.name.trim().length > 0
                ? parsed.name.trim()
                : undefined;
            const description =
              typeof parsed.description === "string" && parsed.description.trim().length > 0
                ? parsed.description.trim()
                : undefined;
            if (!metadataName && !description) {
              return [name, null];
            }
            return [name, { name: metadataName, description }];
          } catch {
            return [name, null];
          }
        }),
      );

      if (disposed) {
        return;
      }

      const nextMetadataByPathName: Record<string, AutoPathMetadata> = {};
      for (const [name, metadata] of loaded) {
        if (metadata) {
          nextMetadataByPathName[name] = metadata;
        }
      }
      setMetadataByPathName(nextMetadataByPathName);
    })();

    return () => {
      disposed = true;
    };
  }, [paths]);

  useEffect(() => {
    setStoredSelectedAuto(localSelectedPath);
  }, [localSelectedPath]);

  useEffect(() => {
    if (paths.length === 0 || !localSelectedPath) {
      return;
    }
    if (!localMatchedPath) {
      setLocalSelectedPath(null);
    }
  }, [localMatchedPath, localSelectedPath, paths.length]);

  const publishDesiredAuto = useCallback(
    (pathName: string, throttle: boolean) => {
      if (throttle) {
        const now = Date.now();
        if (syncInFlightRef.current || now - lastSyncAttemptMsRef.current < SYNC_THROTTLE_MS) {
          return;
        }
        lastSyncAttemptMsRef.current = now;
        syncInFlightRef.current = true;
      }

      setPendingPublish(pathName);
      publishSelectedAuto(pathName)
        .catch(() => {})
        .finally(() => {
          if (throttle) {
            syncInFlightRef.current = false;
          }
          setPendingPublish((current) => (current === pathName ? null : current));
        });
    },
    [publishSelectedAuto],
  );

  const handleSelect = useCallback(
    (pathName: string) => {
      setLocalSelectedPath(pathName);
      publishDesiredAuto(pathName, false);
    },
    [publishDesiredAuto],
  );

  useEffect(() => {
    const justConnected = isConnected && !wasConnectedRef.current;
    wasConnectedRef.current = isConnected;

    if (!isConnected || !localSelectedPath) {
      return;
    }

    const robotAligned =
      (robotMatchedPath !== null && robotMatchedPath === localSelectedPath) ||
      normalizedRobotAuto.toLowerCase() === localSelectedPath.toLowerCase();

    if (justConnected || !robotAligned) {
      publishDesiredAuto(localSelectedPath, true);
    }
  }, [isConnected, localSelectedPath, normalizedRobotAuto, publishDesiredAuto, robotMatchedPath]);

  useEffect(() => {
    if (!isConnected || !localSelectedPath) {
      previousRobotAutoRef.current = normalizedRobotAuto;
      mismatchTimestampsRef.current = [];
      return;
    }

    const previousRobotAuto = previousRobotAutoRef.current;
    const changed = previousRobotAuto !== normalizedRobotAuto;
    const matchesDashboard = normalizedRobotAuto.toLowerCase() === localSelectedPath.toLowerCase();

    if (changed && !matchesDashboard) {
      const now = Date.now();
      const recent = mismatchTimestampsRef.current.filter(
        (timestamp) => now - timestamp <= FLICKER_WINDOW_MS,
      );
      recent.push(now);
      mismatchTimestampsRef.current = recent;
      if (recent.length >= FLICKER_THRESHOLD) {
        setShowConflictPopup(true);
        mismatchTimestampsRef.current = [];
      }
    }

    previousRobotAutoRef.current = normalizedRobotAuto;
  }, [isConnected, localSelectedPath, normalizedRobotAuto]);

  return (
    <div className="relative flex h-full w-full bg-[#272727]">
      {!isConnected && (
        <div className="pointer-events-none absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded border border-rose-500/60 bg-black/85 px-3 py-1 text-[18px] text-rose-300">
          NT disconnected
        </div>
      )}

      {showConflictPopup && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-[860px] border-2 border-rose-500/70 bg-[#1f1f1f] p-6 text-white shadow-2xl">
            <div className="flex items-start gap-4">
              <AlertTriangle className="mt-1 h-8 w-8 shrink-0 text-rose-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[40px] leading-[1] font-semibold">Auto Sync Conflict Detected</p>
                <p className="mt-3 text-[26px] leading-[1.25] text-zinc-100">
                  Robot auto changed too many times in a short window while this dashboard was
                  trying to enforce
                  {" "}
                  <span className="font-semibold text-white">{localSelectedPath ?? "NONE"}</span>.
                </p>
                <p className="mt-2 text-[22px] leading-[1.25] text-zinc-300">
                  Another dashboard is likely connected and fighting for auto selection.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="bg-black px-4 py-2 text-[22px] leading-[1] text-white"
                onClick={() => setShowConflictPopup(false)}
              >
                Dismiss
              </button>
              <button
                type="button"
                className="bg-[#70cd35] px-4 py-2 text-[22px] leading-[1] text-white"
                onClick={() => {
                  setShowConflictPopup(false);
                  if (localSelectedPath) {
                    publishDesiredAuto(localSelectedPath, false);
                  }
                }}
              >
                Resync Now
              </button>
            </div>
          </div>
        </div>
      )}

      <PathListPane
        paths={paths}
        metadataByPathName={metadataByPathName}
        isLoading={isLoading}
        error={error}
        reload={reload}
        activePathName={activePathName}
        viewingPathName={viewingPathName}
        onViewPath={setViewingPathName}
        scrollRef={scrollRef}
      />

      <div className="flex h-full min-w-0 flex-1 overflow-clip bg-[#272727]">
        <PathDetailPane
          viewingEntry={viewingEntry}
          displayName={viewingMetadata?.name ?? viewingEntry?.name}
          description={viewingMetadata?.description}
          previewUrl={
            viewingEntry
              ? `/path-overview/animated/${encodeURIComponent(viewingEntry.name)}.gif`
              : null
          }
          isLoading={isLoading}
          isViewingActive={isViewingActive}
          pendingPublish={pendingPublish}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}
