import { useCallback, useState } from "react";
import {
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { ALL_TABS, parseId } from "../model";
import type { DockIcon, OverlayTabId } from "../model";

export function useTouchscreenDnd({
  leftRailIcons,
  setLeftRailIcons,
  dockIcons,
  setDockIcons,
}: {
  leftRailIcons: OverlayTabId[];
  setLeftRailIcons: React.Dispatch<React.SetStateAction<OverlayTabId[]>>;
  dockIcons: DockIcon[];
  setDockIcons: React.Dispatch<React.SetStateAction<DockIcon[]>>;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const draggingTabDef = draggingId ? ALL_TABS.find((tab) => tab.id === draggingId) ?? null : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const parsed = parseId(String(event.active.id));
    setDraggingId(parsed ? parsed.tabId : String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingId(null);
      const { active, over } = event;
      if (!over) {
        return;
      }

      const activeParsed = parseId(String(active.id));
      const overParsed = parseId(String(over.id));
      const overZone = String(over.id);

      if (!activeParsed) {
        return;
      }

      if (activeParsed.zone === "rail" && overParsed?.zone === "rail") {
        const fromIdx = leftRailIcons.indexOf(activeParsed.tabId as OverlayTabId);
        const toIdx = leftRailIcons.indexOf(overParsed.tabId as OverlayTabId);
        if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
          setLeftRailIcons((prev) => arrayMove(prev, fromIdx, toIdx));
        }
        return;
      }

      if (activeParsed.zone === "dock" && overParsed?.zone === "dock") {
        const fromIdx = dockIcons.findIndex((item) => item.id === activeParsed.tabId);
        const toIdx = dockIcons.findIndex((item) => item.id === overParsed.tabId);
        if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
          setDockIcons((prev) => arrayMove(prev, fromIdx, toIdx));
        }
        return;
      }

      if (activeParsed.zone === "dock" && (overParsed?.zone === "rail" || overZone === "zone-rail")) {
        const tabId = activeParsed.tabId as OverlayTabId;
        if (!leftRailIcons.includes(tabId)) {
          if (overParsed?.zone === "rail") {
            const targetIdx = leftRailIcons.indexOf(overParsed.tabId as OverlayTabId);
            setLeftRailIcons((prev) => {
              const next = [...prev];
              next.splice(targetIdx + 1, 0, tabId);
              return next;
            });
          } else {
            setLeftRailIcons((prev) => [...prev, tabId]);
          }
        }
        return;
      }

      if (activeParsed.zone === "rail" && (overParsed?.zone === "dock" || overZone === "zone-dock")) {
        const tabId = activeParsed.tabId as OverlayTabId;
        setLeftRailIcons((prev) => prev.filter((id) => id !== tabId));
      }
    },
    [dockIcons, leftRailIcons, setDockIcons, setLeftRailIcons],
  );

  return {
    draggingTabDef,
    handleDragEnd,
    handleDragStart,
    sensors,
  };
}
