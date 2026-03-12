"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathLibrary } from "@/lib/hooks/usePathLibrary";
import { usePathNetworkTable } from "@/lib/hooks/usePathNetworkTable";
import { findMatchingPathName } from "@/lib/pathLibrary";

// ─── Scroll thumb indicator ─────────────────────────────────────────────────

function ScrollTrack({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const [thumbTop, setThumbTop] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [visible, setVisible] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function update() {
      const el = scrollRef.current;
      const track = trackRef.current;
      if (!el || !track) return;

      const { scrollTop, scrollHeight, clientHeight } = el;
      const trackH = track.clientHeight;

      if (scrollHeight <= clientHeight) {
        setVisible(false);
        return;
      }

      setVisible(true);
      const ratio = clientHeight / scrollHeight;
      const tH = Math.max(ratio * trackH, 20);
      const maxScroll = scrollHeight - clientHeight;
      const tTop = (scrollTop / maxScroll) * (trackH - tH);
      setThumbHeight(tH);
      setThumbTop(tTop);
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [scrollRef]);

  return (
    <div ref={trackRef} className="relative h-full w-[4px] shrink-0 bg-[#3c3c3c]">
      {visible && (
        <div
          className="absolute left-0 w-[4px] bg-[#70cd35]"
          style={{ top: thumbTop, height: thumbHeight }}
        />
      )}
    </div>
  );
}

// ─── Path card in the list ──────────────────────────────────────────────────

function PathCard({
  name,
  isActive,
  isViewing,
  onTap,
}: {
  name: string;
  isActive: boolean;
  isViewing: boolean;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={[
        "flex w-full shrink-0 flex-col gap-1 overflow-clip p-2.5 text-left",
        "bg-[#3c3c3c]",
        isActive ? "border-4 border-solid border-[#70cd35]" : "",
        isViewing && !isActive ? "border-4 border-solid border-white/30" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="w-full truncate text-xl font-semibold text-white">
        {name}
      </p>
      <p
        className={[
          "w-full text-sm font-bold",
          isActive ? "text-[#70cd35]" : "text-transparent",
        ].join(" ")}
      >
        Currently Selected
      </p>
    </button>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function AutoSelector() {
  const { paths, isLoading, error, reload } = usePathLibrary();
  const {
    selectedAutoFromRobot,
    publishSelectedAuto,
  } = usePathNetworkTable();

  const [viewingPathName, setViewingPathName] = useState<string | null>(null);
  const [localSelectedPath, setLocalSelectedPath] = useState<string | null>(null);
  const [pendingPublish, setPendingPublish] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Match robot's selection to our path list — fall back to local selection
  const robotMatchedPath = useMemo(
    () => findMatchingPathName(selectedAutoFromRobot, paths),
    [selectedAutoFromRobot, paths],
  );
  const activePathName = robotMatchedPath ?? localSelectedPath;

  // Auto-select the first path or the active path for viewing when paths load
  useEffect(() => {
    if (viewingPathName) return;
    if (activePathName) {
      setViewingPathName(activePathName);
    } else if (paths.length > 0) {
      setViewingPathName(paths[0].name);
    }
  }, [activePathName, paths, viewingPathName]);

  const viewingEntry = useMemo(
    () => paths.find((p) => p.name === viewingPathName) ?? null,
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
      {/* ── Left: scrollable path list (~34% width) + scroll track ── */}
      <div className="flex h-full w-[34%] shrink-0">
        <div
          ref={scrollRef}
          className={[
            "flex flex-1 flex-col gap-2 overflow-y-auto p-2",
            "[&::-webkit-scrollbar]:hidden",
          ].join(" ")}
        >
          {paths.map((entry) => (
            <PathCard
              key={entry.fileName}
              name={entry.name}
              isActive={activePathName === entry.name}
              isViewing={viewingPathName === entry.name}
              onTap={() => setViewingPathName(entry.name)}
            />
          ))}

          {isLoading && (
            <div className="flex w-full shrink-0 items-center justify-center p-8 bg-[#3c3c3c]">
              <p className="text-base text-zinc-500">Loading paths...</p>
            </div>
          )}

          {!isLoading && paths.length === 0 && !error && (
            <div className="flex w-full shrink-0 items-center justify-center p-8 bg-[#3c3c3c]">
              <p className="text-base text-zinc-500">No paths found</p>
            </div>
          )}

          {error && (
            <button
              type="button"
              onClick={() => void reload()}
              className="flex w-full shrink-0 items-center justify-center p-8 bg-[#3c3c3c]"
            >
              <p className="text-base text-rose-400">Failed to load. Tap to retry.</p>
            </button>
          )}
        </div>
        <ScrollTrack scrollRef={scrollRef} />
      </div>

      {/* ── Right: detail + preview placeholder ── */}
      <div className="flex h-full min-w-0 flex-1 overflow-clip">
        {viewingEntry ? (
          <>
            {/* Detail area */}
            <div className="flex flex-1 flex-col justify-between p-4">
              <div className="flex flex-col gap-2 text-white">
                <p className="text-2xl font-semibold">
                  {viewingEntry.name}
                </p>
                <p className="text-base text-zinc-300">
                  {viewingEntry.fileName}
                </p>
              </div>

              <button
                type="button"
                disabled={pendingPublish !== null}
                onClick={() => handleSelect(viewingEntry.name)}
                className={[
                  "self-start px-3 py-1 text-2xl text-white whitespace-nowrap",
                  isViewingActive ? "bg-[#70cd35]" : "bg-black active:bg-zinc-800",
                  pendingPublish ? "opacity-50" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {pendingPublish === viewingEntry.name
                  ? "Selecting..."
                  : isViewingActive
                    ? "Selected"
                    : "Select"}
              </button>
            </div>

            {/* Preview placeholder */}
            <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center text-2xl text-white">
              <p>{viewingEntry.name} Preview</p>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-2xl text-zinc-500">
            <p>{isLoading ? "Loading..." : "Select a path"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
