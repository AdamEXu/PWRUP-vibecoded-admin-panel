import { RIGHT_PANELS } from "../../model";
import type { RightPanelId } from "../../model";
import { useSwipeGesture } from "../../hooks/useSwipeGesture";
import { RightIconColumn } from "./RightIconColumn";

export function RightSideContent({
  openPanel,
  displayPanel,
  onToggle,
  onSwipeClose,
}: {
  openPanel: RightPanelId | null;
  displayPanel: RightPanelId | null;
  onToggle: (id: RightPanelId) => void;
  onSwipeClose: () => void;
}) {
  const definition = displayPanel ? RIGHT_PANELS.find((panel) => panel.id === displayPanel) : null;

  const { ref: swipeRef } = useSwipeGesture({
    direction: "right",
    dimension: 456,
    onCommit: onSwipeClose,
    enabled: openPanel !== null,
  });

  return (
    <div className="flex gap-[30px] items-start overflow-clip p-[20px] h-full w-[540px]">
      <RightIconColumn openPanel={openPanel} onToggle={onToggle} />
      <div
        ref={swipeRef}
        className="flex flex-col h-full items-start p-[10px] shrink-0 w-[426px]"
      >
        {definition && (
          <>
            <p className="font-['Inter',sans-serif] font-medium text-[36px] text-white leading-[normal]">
              {definition.label} Settings
            </p>
            <p className="mt-4 text-sm text-zinc-400">Controls coming soon.</p>
          </>
        )}
      </div>
    </div>
  );
}
