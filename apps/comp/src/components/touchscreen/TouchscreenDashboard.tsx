"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TouchscreenSettingsPanel } from "./TouchscreenSettingsPanel";
import { AutoSelector } from "./AutoSelector";

// ─── Types ────────────────────────────────────────────────────────────────────

type OverlayTabId = "auto" | "settings" | "effects";
type RightPanelId = "showMap" | "showTimers" | "showStatus" | "showCamera";

// ─── Tab / panel definitions ──────────────────────────────────────────────────

interface TabDef {
  id: OverlayTabId;
  label: string;
  symbol: string;
  activeSymbol: string;
}

interface RightPanelDef {
  id: RightPanelId;
  label: string;
  symbol: string;
  activeSymbol: string;
}

const ALL_TABS: TabDef[] = [
  { id: "auto",     label: "Auto Select",     symbol: "􀣱", activeSymbol: "􀬱" },
  { id: "settings", label: "Settings",        symbol: "􀎕", activeSymbol: "􀎖" },
  { id: "effects",  label: "Special Effects", symbol: "􁅋", activeSymbol: "􁅌" },
];

const RIGHT_PANELS: RightPanelDef[] = [
  { id: "showMap",    label: "Map",    symbol: "􀙊", activeSymbol: "􀙋" },
  { id: "showTimers", label: "Timers", symbol: "􀐯", activeSymbol: "􀐰" },
  { id: "showStatus", label: "Status", symbol: "􀅴", activeSymbol: "􀅵" },
  { id: "showCamera", label: "Camera", symbol: "􀌞", activeSymbol: "􀌟" },
];

const TOUCHSCREEN_LAYOUT_STORAGE_KEY = "pwrup.touchscreen.layout.v1";
const DEFAULT_LEFT_RAIL_ICONS: OverlayTabId[] = ["auto", "settings"];
const DEFAULT_DOCK_ORDER: OverlayTabId[] = ALL_TABS.map((tab) => tab.id);

function isOverlayTabId(value: unknown): value is OverlayTabId {
  return (
    typeof value === "string" &&
    DEFAULT_DOCK_ORDER.some((tabId) => tabId === value)
  );
}

function sanitizeTabList(value: unknown): OverlayTabId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<OverlayTabId>();
  for (const item of value) {
    if (isOverlayTabId(item)) {
      unique.add(item);
    }
  }
  return [...unique];
}

function normalizeDockOrder(value: unknown): OverlayTabId[] {
  const sanitized = sanitizeTabList(value);
  const remaining = DEFAULT_DOCK_ORDER.filter((tabId) => !sanitized.includes(tabId));
  return [...sanitized, ...remaining];
}

function loadLayoutState(): {
  leftRailIcons: OverlayTabId[];
  dockOrder: OverlayTabId[];
} {
  const fallback = {
    leftRailIcons: DEFAULT_LEFT_RAIL_ICONS,
    dockOrder: DEFAULT_DOCK_ORDER,
  };

  if (typeof window === "undefined" || typeof window.localStorage?.getItem !== "function") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(TOUCHSCREEN_LAYOUT_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return fallback;
    }

    const source = parsed as {
      leftRailIcons?: unknown;
      dockOrder?: unknown;
    };

    return {
      leftRailIcons: Array.isArray(source.leftRailIcons)
        ? sanitizeTabList(source.leftRailIcons)
        : DEFAULT_LEFT_RAIL_ICONS,
      dockOrder: normalizeDockOrder(source.dockOrder),
    };
  } catch {
    return fallback;
  }
}

function saveLayoutState(leftRailIcons: OverlayTabId[], dockOrder: OverlayTabId[]): void {
  if (typeof window === "undefined" || typeof window.localStorage?.setItem !== "function") {
    return;
  }

  try {
    window.localStorage.setItem(
      TOUCHSCREEN_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        leftRailIcons,
        dockOrder,
      }),
    );
  } catch {
    // Ignore storage write failures and keep in-memory state.
  }
}

function dockIconsFromOrder(order: OverlayTabId[]): { id: OverlayTabId; symbol: string }[] {
  return order.map((tabId) => {
    const tab = ALL_TABS.find((entry) => entry.id === tabId)!;
    return { id: tab.id, symbol: tab.symbol };
  });
}

// ─── DnD ID helpers ──────────────────────────────────────────────────────────

const RAIL_PREFIX = "rail-";
const DOCK_PREFIX = "dock-";

function railId(tabId: OverlayTabId): string {
  return `${RAIL_PREFIX}${tabId}`;
}

function dockId(tabId: string): string {
  return `${DOCK_PREFIX}${tabId}`;
}

function parseId(prefixedId: string): { zone: "rail" | "dock"; tabId: string } | null {
  if (prefixedId.startsWith(RAIL_PREFIX)) {
    return { zone: "rail", tabId: prefixedId.slice(RAIL_PREFIX.length) };
  }
  if (prefixedId.startsWith(DOCK_PREFIX)) {
    return { zone: "dock", tabId: prefixedId.slice(DOCK_PREFIX.length) };
  }
  return null;
}

// ─── Droppable zone wrapper ──────────────────────────────────────────────────

function DroppableZone({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Sf({ s, className }: { s: string; className?: string }) {
  return (
    <span className={["sf-symbol leading-[0]", className].filter(Boolean).join(" ")}>
      {s}
    </span>
  );
}

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <p className="font-['SF_Pro',sans-serif] text-[48px] text-white text-center">
        {title} is coming soon™
      </p>
    </div>
  );
}

function renderTabContent(tabId: OverlayTabId) {
  if (tabId === "settings") return <TouchscreenSettingsPanel />;
  if (tabId === "auto") return <AutoSelector />;
  return <PlaceholderScreen title="Special effects tab" />;
}

// ─── Left rail icon (matches Figma: 44px wide, 27px tall, text-[48px]) ────────

function LeftIcon({
  symbol,
  activeSymbol,
  active,
  onClick,
}: {
  symbol: string;
  activeSymbol: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-[27px] w-[44px] items-center justify-center font-['SF_Pro',sans-serif] text-[48px]",
        active ? "text-[#70cd35]" : "text-white",
      ].join(" ")}
    >
      <Sf s={active ? activeSymbol : symbol} className="leading-[normal]" />
    </button>
  );
}

// ─── Sortable left rail icon ──────────────────────────────────────────────────

function SortableLeftIcon({
  tab,
  active,
  onClick,
  editMode,
}: {
  tab: TabDef;
  active: boolean;
  onClick: () => void;
  editMode: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: railId(tab.id), disabled: !editMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...(editMode ? listeners : {})}>
      <LeftIcon
        symbol={tab.symbol}
        activeSymbol={tab.activeSymbol}
        active={active}
        onClick={onClick}
      />
    </div>
  );
}

// ─── Right rail icon column ──────────────────────────────────────────────────

function RightIconColumn({
  openPanel,
  onToggle,
}: {
  openPanel: RightPanelId | null;
  onToggle: (id: RightPanelId) => void;
}) {
  return (
    <div className="flex flex-col h-full items-center justify-between shrink-0 w-[44px]">
      <div className="flex flex-col gap-[48px] items-center w-[44px] pt-[10px]">
        {RIGHT_PANELS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
            className={[
              "flex h-[27px] w-full items-center justify-center font-['SF_Pro',sans-serif] text-[48px]",
              openPanel === p.id ? "text-[#70cd35]" : "text-white",
            ].join(" ")}
          >
            <Sf s={openPanel === p.id ? p.activeSymbol : p.symbol} className="leading-[normal]" />
          </button>
        ))}
      </div>
      <div className="flex w-[44px] items-center justify-center pb-[10px]">
      </div>
    </div>
  );
}

// ─── Right side inner content (fixed 540px, no background — bg goes on outer) ─

function RightSideContent({
  openPanel,
  displayPanel,
  onToggle,
}: {
  openPanel: RightPanelId | null;
  displayPanel: RightPanelId | null;
  onToggle: (id: RightPanelId) => void;
}) {
  const def = displayPanel ? RIGHT_PANELS.find((p) => p.id === displayPanel) : null;
  return (
    <div className="flex gap-[30px] items-start overflow-clip p-[20px] h-full w-[540px]">
      {/* Icon column */}
      <RightIconColumn openPanel={openPanel} onToggle={onToggle} />
      {/* Panel content area (fixed width, gets revealed/hidden by parent width transition) */}
      <div className="flex flex-col h-full items-start p-[10px] shrink-0 w-[426px]">
        {def && (
          <>
            <p className="font-['Inter',sans-serif] font-medium text-[36px] text-white leading-[normal]">
              {def.label} Settings
            </p>
            <p className="mt-4 text-sm text-zinc-400">Controls coming soon.</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Dock drawer (860px centered, glass, green 3-sided border) ────────────────

function DockDrawer({
  availableIcons,
  activeTabId,
  closing,
  onOpen,
  onCloseAnimEnd,
}: {
  availableIcons: { id: string; symbol: string }[];
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
        <SortableContext items={availableIcons.map((i) => dockId(i.id))} strategy={rectSortingStrategy}>
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

function SortableDockIcon({
  id,
  symbol,
  isActive,
  onTap,
}: {
  id: string;
  symbol: string;
  isActive: boolean;
  onTap: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: dockId(id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={[
        "flex flex-col justify-center shrink-0 cursor-pointer",
        isActive ? "text-[#70cd35]" : "text-white",
      ].join(" ")}
      onClick={onTap}
    >
      <Sf s={symbol} className="leading-[normal]" />
    </div>
  );
}

// ─── Easing constant ─────────────────────────────────────────────────────────

const EASE = "cubic-bezier(0.25, 0.1, 0.25, 1)";
const PANEL_DURATION = "300ms";
const TOUCHSCREEN_DND_CONTEXT_ID = "touchscreen-dashboard-dnd";

// ─── Main component ───────────────────────────────────────────────────────────

export function TouchscreenDashboard() {
  const [initialLayout] = useState(loadLayoutState);
  const [activeOverlayTab, setActiveOverlayTab] = useState<OverlayTabId | null>(null);
  const [prevOverlayTab, setPrevOverlayTab] = useState<OverlayTabId | null>(null);
  const [openRightPanel, setOpenRightPanel] = useState<RightPanelId | null>(null);
  const [isDockOpen, setIsDockOpen] = useState(false);
  const [isDockClosing, setIsDockClosing] = useState(false);
  const [leftRailIcons, setLeftRailIcons] = useState<OverlayTabId[]>(initialLayout.leftRailIcons);
  const [dockIcons, setDockIcons] = useState(() => dockIconsFromOrder(initialLayout.dockOrder));
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Track last-opened panel so content stays rendered during close width transition
  const lastPanelRef = useRef<RightPanelId | null>(null);
  if (openRightPanel) lastPanelRef.current = openRightPanel;

  const isDriverBase = activeOverlayTab === null;
  // Tabs that want the right panel to overlay (frosted glass) instead of pushing content
  const useOverlayRightPanel = isDriverBase;
  const displayPanelId = openRightPanel ?? lastPanelRef.current;

  // Width for right-side container: 84px (rail) or 540px (full panel)
  const rightSideWidth = openRightPanel ? 540 : 84;

  // ── safety: clear prevOverlayTab if onAnimationEnd doesn't fire ──
  useEffect(() => {
    if (prevOverlayTab !== null) {
      const t = setTimeout(() => setPrevOverlayTab(null), 350);
      return () => clearTimeout(t);
    }
  }, [prevOverlayTab]);

  // ── safety: clear dock closing if onAnimationEnd doesn't fire ──
  useEffect(() => {
    if (isDockClosing) {
      const t = setTimeout(() => {
        setIsDockOpen(false);
        setIsDockClosing(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isDockClosing]);

  useEffect(() => {
    saveLayoutState(
      leftRailIcons,
      dockIcons.map((icon) => icon.id),
    );
  }, [leftRailIcons, dockIcons]);

  // ── tab switching ──
  const switchOverlayTab = useCallback(
    (tabId: OverlayTabId) => {
      setIsDockClosing(true);
      if (tabId === activeOverlayTab) {
        setPrevOverlayTab(tabId);
        setActiveOverlayTab(null);
      } else {
        setPrevOverlayTab(activeOverlayTab);
        setActiveOverlayTab(tabId);
      }
    },
    [activeOverlayTab],
  );

  const dismissOverlay = useCallback(() => {
    setIsDockClosing(true);
    if (activeOverlayTab) {
      setPrevOverlayTab(activeOverlayTab);
      setActiveOverlayTab(null);
    }
  }, [activeOverlayTab]);

  // ── right panel (width transition handles open/close animation) ──
  const togglePanel = useCallback((panelId: RightPanelId) => {
    setIsDockClosing(true);
    setOpenRightPanel((cur) => (cur === panelId ? null : panelId));
  }, []);

  // ── dock ──
  const closeDock = useCallback(() => {
    setIsDockClosing(true);
  }, []);

  const toggleDock = useCallback(() => {
    if (isDockOpen && !isDockClosing) {
      closeDock();
    } else if (!isDockOpen) {
      setIsDockOpen(true);
    }
  }, [isDockOpen, isDockClosing, closeDock]);

  const onDockCloseAnimEnd = useCallback(() => {
    setIsDockOpen(false);
    setIsDockClosing(false);
  }, []);

  const openFromDock = useCallback(
    (id: string) => {
      const tab = ALL_TABS.find((t) => t.id === id);
      if (tab) switchOverlayTab(tab.id);
    },
    [switchOverlayTab],
  );

  // ── dnd ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const draggingTabDef = draggingId ? ALL_TABS.find((t) => t.id === draggingId) ?? null : null;

  function handleDragStart(e: DragStartEvent) {
    // Strip prefix so DragOverlay can look up the tab definition by raw ID
    const parsed = parseId(String(e.active.id));
    setDraggingId(parsed ? parsed.tabId : String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = e;
    if (!over) return;

    const a = parseId(String(active.id));
    const o = parseId(String(over.id));
    const overZone = String(over.id); // For droppable zone fallback

    if (!a) return;

    // ── Rail-to-Rail reorder ──
    if (a.zone === "rail" && o?.zone === "rail") {
      const fromIdx = leftRailIcons.indexOf(a.tabId as OverlayTabId);
      const toIdx = leftRailIcons.indexOf(o.tabId as OverlayTabId);
      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        setLeftRailIcons((prev) => arrayMove(prev, fromIdx, toIdx));
      }
      return;
    }

    // ── Dock-to-Dock reorder ──
    if (a.zone === "dock" && o?.zone === "dock") {
      const fromIdx = dockIcons.findIndex((d) => d.id === a.tabId);
      const toIdx = dockIcons.findIndex((d) => d.id === o.tabId);
      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        setDockIcons((prev) => arrayMove(prev, fromIdx, toIdx));
      }
      return;
    }

    // ── Dock-to-Rail (pin to sidebar) ──
    if (a.zone === "dock" && (o?.zone === "rail" || overZone === "zone-rail")) {
      const tabId = a.tabId as OverlayTabId;
      if (!leftRailIcons.includes(tabId)) {
        if (o?.zone === "rail") {
          // Insert near the drop target
          const targetIdx = leftRailIcons.indexOf(o.tabId as OverlayTabId);
          setLeftRailIcons((prev) => {
            const next = [...prev];
            next.splice(targetIdx + 1, 0, tabId);
            return next;
          });
        } else {
          // Dropped on the zone background — append to end
          setLeftRailIcons((prev) => [...prev, tabId]);
        }
      }
      return;
    }

    // ── Rail-to-Dock (unpin from sidebar) ──
    if (a.zone === "rail" && (o?.zone === "dock" || overZone === "zone-dock")) {
      const tabId = a.tabId as OverlayTabId;
      setLeftRailIcons((prev) => prev.filter((id) => id !== tabId));
      return;
    }
  }

  // ── right panel style: width + green inset border, both transition smoothly ──
  const rightPanelStyle = {
    width: rightSideWidth,
    boxShadow: openRightPanel
      ? "inset 4px 0 0 0 #70cd35"
      : "inset 4px 0 0 0 transparent",
    transition: `width ${PANEL_DURATION} ${EASE}, box-shadow ${PANEL_DURATION} ${EASE}`,
    willChange: "width" as const,
  };

  // Driver layer: right panel floats OVER it (original overlay behaviour),
  // so it always extends to the right edge — no right inset needed.
  const driverLayerStyle = { left: 84, right: 0 };

  // Non-driver app tabs: right panel takes dedicated space, so these layers
  // stop at the panel edge and resize with it.
  const appLayerStyle = {
    left: 84,
    right: rightSideWidth,
    transition: `right ${PANEL_DURATION} ${EASE}`,
  };

  return (
    <DndContext
      id={TOUCHSCREEN_DND_CONTEXT_ID}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* ── APP LAYERS — positioned between the chrome, never overlap sidebars ── */}

      {/* Driver content (always at base) */}
      <div className="fixed top-0 bottom-0 z-0 bg-black" style={driverLayerStyle}>
        <PlaceholderScreen title="Driver tab" />
      </div>

      {/* Exiting overlay tab (slides down) */}
      {prevOverlayTab !== null && (
        <div
          key={`exit-${prevOverlayTab}`}
          className="fixed top-0 bottom-0 z-10 bg-black animate-ts-slide-down will-change-transform"
          style={appLayerStyle}
          onAnimationEnd={() => setPrevOverlayTab(null)}
        >
          {renderTabContent(prevOverlayTab)}
        </div>
      )}

      {/* Active overlay tab (slides up) */}
      {activeOverlayTab !== null && (
        <div
          key={`enter-${activeOverlayTab}`}
          className="fixed top-0 bottom-0 z-10 bg-black animate-ts-slide-up will-change-transform"
          style={appLayerStyle}
        >
          {renderTabContent(activeOverlayTab)}
        </div>
      )}

      {/* ── CHROME — fixed position, never reflows, always z-20 ── */}

      {/* Left rail */}
      <aside className="fixed left-0 top-0 bottom-0 z-20 flex w-[84px] flex-col items-center justify-between overflow-clip py-[30px]">
        {/* Top icon group */}
        <div className="flex flex-col gap-[48px] items-center w-[44px]">
          {/* Pinned: driver */}
          <LeftIcon
            symbol="􁿢"
            activeSymbol="􁿣"
            active={isDriverBase}
            onClick={dismissOverlay}
          />
          {/* Custom tab icons */}
          <SortableContext items={leftRailIcons.map(railId)} strategy={verticalListSortingStrategy}>
            <DroppableZone id="zone-rail" className="flex flex-col gap-[48px]">
              {leftRailIcons.map((tabId) => {
                const def = ALL_TABS.find((t) => t.id === tabId)!;
                return (
                  <SortableLeftIcon
                    key={tabId}
                    tab={def}
                    active={activeOverlayTab === tabId}
                    onClick={() => switchOverlayTab(tabId)}
                    editMode={isDockOpen}
                  />
                );
              })}
            </DroppableZone>
          </SortableContext>
        </div>

        {/* Pinned bottom: dock */}
        <div className="flex flex-col items-center w-[44px]">
          <LeftIcon
            symbol="􀏞"
            activeSymbol="􀏞"
            active={isDockOpen}
            onClick={toggleDock}
          />
        </div>
      </aside>

      {/* Right panel — always fixed, width transitions 84px ↔ 540px.
           Driver tab: frosted glass (panel floats over content).
           Other tabs: opaque (panel is a solid sidebar beside content). */}
      <div
        className={[
          "fixed top-0 right-0 bottom-0 z-20 overflow-hidden",
          useOverlayRightPanel ? "backdrop-blur-[4px] bg-black/50" : "bg-black",
        ].join(" ")}
        style={rightPanelStyle}
      >
        <RightSideContent
          openPanel={openRightPanel}
          displayPanel={displayPanelId}
          onToggle={togglePanel}
        />
      </div>

      {/* Dock backdrop — closes dock when tapping outside it */}
      {isDockOpen && !isDockClosing && (
        <div className="fixed inset-0 z-[19]" onClick={closeDock} />
      )}

      {/* Dock drawer */}
      {isDockOpen && (
        <DockDrawer
          availableIcons={dockIcons}
          activeTabId={activeOverlayTab}
          closing={isDockClosing}
          onOpen={openFromDock}
          onCloseAnimEnd={onDockCloseAnimEnd}
        />
      )}

      {/* DnD ghost */}
      <DragOverlay>
        {draggingTabDef ? (
          <div className="flex items-center justify-center font-['SF_Pro',sans-serif] text-[48px] text-white opacity-80">
            <Sf s={draggingTabDef.symbol} className="leading-[normal]" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
