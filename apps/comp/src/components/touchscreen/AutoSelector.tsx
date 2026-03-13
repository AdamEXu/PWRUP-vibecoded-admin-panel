"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathLibrary } from "@/lib/hooks/usePathLibrary";
import { usePathNetworkTable } from "@/lib/hooks/usePathNetworkTable";
import { findMatchingPathName } from "@/lib/pathLibrary";
import { PathDetailPane } from "./auto-selector/components/PathDetailPane";
import { PathListPane } from "./auto-selector/components/PathListPane";
import type { AutoPathMetadata } from "./auto-selector/types";

export function AutoSelector() {
  const { paths, isLoading, error, reload } = usePathLibrary();
  const { selectedAutoFromRobot, publishSelectedAuto } = usePathNetworkTable();

  const [viewingPathName, setViewingPathName] = useState<string | null>(null);
  const [localSelectedPath, setLocalSelectedPath] = useState<string | null>(null);
  const [pendingPublish, setPendingPublish] = useState<string | null>(null);
  const [metadataByPathName, setMetadataByPathName] = useState<Record<string, AutoPathMetadata>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const robotMatchedPath = useMemo(
    () => findMatchingPathName(selectedAutoFromRobot, paths),
    [selectedAutoFromRobot, paths],
  );

  const activePathName = robotMatchedPath ?? localSelectedPath;

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

  const handleSelect = useCallback(
    (pathName: string) => {
      setLocalSelectedPath(pathName);
      setPendingPublish(pathName);
      publishSelectedAuto(pathName)
        .catch(() => {})
        .finally(() => setPendingPublish(null));
    },
    [publishSelectedAuto],
  );

  return (
    <div className="flex h-full w-full bg-[#272727]">
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
