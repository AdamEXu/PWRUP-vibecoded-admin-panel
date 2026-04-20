import { useCallback, useState } from "react";
import {
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { ALL_TABS, RAIL_PREFIX, DOCK_PREFIX, parseId } from "../model";
import type { DockIcon, OverlayTabId } from "../model";

/**
 * Custom collision detection that prioritises sortable items (rail-*, dock-*)
 * over droppable zone containers (zone-rail, zone-dock).
 *
 * This prevents `closestCenter` from resolving to a zone container when the
 * cursor lands in the gap between icons, which previously caused silent
 * reorder failures.
 */
const sortableFirstCollision: CollisionDetection = (args) => {
  const sortableOnly = args.droppableContainers.filter((c) => {
    const id = String(c.id);
    return id.startsWith(RAIL_PREFIX) || id.startsWith(DOCK_PREFIX);
  });

  if (sortableOnly.length > 0) {
    const hit = closestCenter({ ...args, droppableContainers: sortableOnly });
    if (hit.length > 0) return hit;
  }

  // Fall back to all droppables (zones) — needed when a zone is empty
  return closestCenter(args);
};

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
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 25 } }),
  );

  const draggingTabDef = draggingId ? ALL_TABS.find((tab) => tab.id === draggingId) ?? null : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const parsed = parseId(String(event.active.id));
    setDraggingId(parsed ? parsed.tabId : String(event.active.id));
  }, []);

  const handleDragCancel = useCallback(() => {
    setDraggingId(null);
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
              next.splice(targetIdx, 0, tabId);
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
    collisionDetection: sortableFirstCollision,
    draggingTabDef,
    handleDragCancel,
    handleDragEnd,
    handleDragStart,
    sensors,
  };
}
