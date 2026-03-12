import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { dockId } from "../../model";
import type { DockIcon, OverlayTabId } from "../../model";
import { DroppableZone } from "../dnd/DroppableZone";
import { SortableDockIcon } from "./SortableDockIcon";

export function DockDrawer({
  availableIcons,
  activeTabId,
  closing,
  onOpen,
  onCloseAnimEnd,
}: {
  availableIcons: DockIcon[];
  activeTabId: OverlayTabId | null;
  closing: boolean;
  onOpen: (id: string) => void;
  onCloseAnimEnd: () => void;
}) {
  return (
    <div
      className={[
        "fixed bottom-0 left-1/2 -translate-x-1/2 z-20 will-change-transform",
        closing ? "animate-ts-dock-down" : "animate-ts-dock-up",
      ].join(" ")}
      onAnimationEnd={closing ? onCloseAnimEnd : undefined}
    >
      <div
        className={[
          "flex overflow-clip p-[10px] w-[860px]",
          "backdrop-blur-[8px] bg-black/50",
          "border-[#70cd35] border-l-4 border-r-4 border-t-4 border-solid",
        ].join(" ")}
      >
        <SortableContext items={availableIcons.map((icon) => dockId(icon.id))} strategy={rectSortingStrategy}>
          <DroppableZone
            id="zone-dock"
            className="flex flex-1 flex-wrap gap-[12px] items-start min-w-0 font-['SF_Pro',sans-serif] text-[48px] text-center leading-[0] whitespace-nowrap"
          >
            {availableIcons.map((item) => (
              <SortableDockIcon
                key={item.id}
                id={item.id}
                symbol={item.symbol}
                isActive={item.id === activeTabId}
                onTap={() => onOpen(item.id)}
              />
            ))}
          </DroppableZone>
        </SortableContext>
      </div>
    </div>
  );
}
