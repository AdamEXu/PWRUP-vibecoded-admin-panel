import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ALL_TABS, railId } from "../../model";
import type { OverlayTabId } from "../../model";
import { DroppableZone } from "../dnd/DroppableZone";
import { LeftIcon } from "./LeftIcon";
import { SortableLeftIcon } from "./SortableLeftIcon";

export function LeftRail({
  leftRailIcons,
  activeOverlayTab,
  isDriverBase,
  isDockOpen,
  onDismissOverlay,
  onSwitchOverlayTab,
  onToggleDock,
}: {
  leftRailIcons: OverlayTabId[];
  activeOverlayTab: OverlayTabId | null;
  isDriverBase: boolean;
  isDockOpen: boolean;
  onDismissOverlay: () => void;
  onSwitchOverlayTab: (tabId: OverlayTabId) => void;
  onToggleDock: () => void;
}) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 z-20 flex w-[84px] flex-col items-center justify-between overflow-clip py-[30px]">
      <div className="flex flex-col gap-[48px] items-center w-[44px]">
        <LeftIcon
          symbol="􁿢"
          activeSymbol="􁿣"
          active={isDriverBase}
          onClick={onDismissOverlay}
        />
        <SortableContext items={leftRailIcons.map(railId)} strategy={verticalListSortingStrategy}>
          <DroppableZone id="zone-rail" className="flex flex-col gap-[48px]">
            {leftRailIcons.map((tabId) => {
              const definition = ALL_TABS.find((tab) => tab.id === tabId)!;
              return (
                <SortableLeftIcon
                  key={tabId}
                  tab={definition}
                  active={activeOverlayTab === tabId}
                  onClick={() => onSwitchOverlayTab(tabId)}
                  editMode={isDockOpen}
                />
              );
            })}
          </DroppableZone>
        </SortableContext>
      </div>

      <div className="flex flex-col items-center w-[44px]">
        <LeftIcon
          symbol="􀏞"
          activeSymbol="􀏞"
          active={isDockOpen}
          onClick={onToggleDock}
        />
      </div>
    </aside>
  );
}
