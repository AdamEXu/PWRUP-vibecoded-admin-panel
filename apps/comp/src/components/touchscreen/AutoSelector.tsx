"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathLibrary } from "@/lib/hooks/usePathLibrary";
import { usePathNetworkTable } from "@/lib/hooks/usePathNetworkTable";
import { findMatchingPathName } from "@/lib/pathLibrary";
import { PathDetailPane } from "./auto-selector/components/PathDetailPane";
import { PathListPane } from "./auto-selector/components/PathListPane";

export function AutoSelector() {
  const { paths, isLoading, error, reload } = usePathLibrary();
  const { selectedAutoFromRobot, publishSelectedAuto } = usePathNetworkTable();

  const [viewingPathName, setViewingPathName] = useState<string | null>(null);
  const [localSelectedPath, setLocalSelectedPath] = useState<string | null>(null);
  const [pendingPublish, setPendingPublish] = useState<string | null>(null);
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

  const isViewingActive = viewingPathName !== null && viewingPathName === activePathName;

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
        isLoading={isLoading}
        error={error}
        reload={reload}
        activePathName={activePathName}
        viewingPathName={viewingPathName}
        onViewPath={setViewingPathName}
        scrollRef={scrollRef}
      />

      <div className="flex h-full min-w-0 flex-1 overflow-clip">
        <PathDetailPane
          viewingEntry={viewingEntry}
          isLoading={isLoading}
          isViewingActive={isViewingActive}
          pendingPublish={pendingPublish}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}
