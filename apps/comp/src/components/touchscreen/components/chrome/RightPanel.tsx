import { useState, useEffect } from "react";
import type { RightPanelId } from "../../model";
import { RightSideContent } from "./RightSideContent";
import { useSettings } from "@/lib/settings";

export function RightPanel({
  useOverlayRightPanel,
  openPanel,
  displayPanel,
  onToggle,
  style,
  swipeRef,
}: {
  useOverlayRightPanel: boolean;
  openPanel: RightPanelId | null;
  displayPanel: RightPanelId | null;
  onToggle: (id: RightPanelId) => void;
  style: React.CSSProperties;
  swipeRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { visualSettings } = useSettings();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
