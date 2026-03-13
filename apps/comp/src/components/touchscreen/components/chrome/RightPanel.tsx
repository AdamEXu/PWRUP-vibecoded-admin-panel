import type { RightPanelId } from "../../model";
import { RightSideContent } from "./RightSideContent";

export function RightPanel({
  useOverlayRightPanel,
  openPanel,
  displayPanel,
  onToggle,
  onSwipeClose,
  style,
}: {
  useOverlayRightPanel: boolean;
  openPanel: RightPanelId | null;
  displayPanel: RightPanelId | null;
  onToggle: (id: RightPanelId) => void;
  onSwipeClose: () => void;
  style: React.CSSProperties;
}) {
  return (
    <div
      className={[
        "fixed top-0 right-0 bottom-0 z-20 overflow-hidden",
        useOverlayRightPanel ? "backdrop-blur-[4px] bg-black/50" : "bg-black",
      ].join(" ")}
      style={style}
    >
      <RightSideContent
        openPanel={openPanel}
        displayPanel={displayPanel}
        onToggle={onToggle}
        onSwipeClose={onSwipeClose}
      />
    </div>
  );
}
