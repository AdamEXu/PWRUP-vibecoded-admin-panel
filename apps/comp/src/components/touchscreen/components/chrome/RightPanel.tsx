import { useState, useEffect } from "react";
import type { RightPanelId } from "../../model";
import { useSwipeGesture } from "../../hooks/useSwipeGesture";
import { RightSideContent } from "./RightSideContent";
import { useSettings } from "@/lib/settings";

export function RightPanel({
  useOverlayRightPanel,
  openPanel,
  displayPanel,
  onToggle,
  onSwipeClose,
  onSwipeProgress,
  onSwipeReset,
  style,
}: {
  useOverlayRightPanel: boolean;
  openPanel: RightPanelId | null;
  displayPanel: RightPanelId | null;
  onToggle: (id: RightPanelId) => void;
  onSwipeClose: () => void;
  onSwipeProgress?: (delta: number, animated: boolean) => void;
  onSwipeReset?: () => void;
  style: React.CSSProperties;
}) {
  const { visualSettings } = useSettings();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { ref: swipeRef } = useSwipeGesture({
    direction: "right",
    dimension: 456, // content width (540 - 84), so icon column stays at screen edge
    onCommit: onSwipeClose,
    enabled: openPanel !== null,
    resetOnCommit: true,
    onProgress: onSwipeProgress,
    onReset: onSwipeReset,
  });

  return (
    <div
      ref={swipeRef}
      className={[
        "fixed top-0 right-0 bottom-0 z-20 overflow-hidden",
        useOverlayRightPanel
          ? (mounted && visualSettings.backdropBlur) ? "backdrop-blur-[4px] bg-black/50" : "bg-black/90"
          : "bg-black",
      ].join(" ")}
      style={style}
    >
      <RightSideContent openPanel={openPanel} displayPanel={displayPanel} onToggle={onToggle} />
    </div>
  );
}
