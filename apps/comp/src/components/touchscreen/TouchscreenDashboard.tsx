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

const PLACEHOLDER_SYMBOL = "􀷖";
const TOTAL_DOCK_SLOTS = 15;

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
  if (tabId === "auto") return <PlaceholderScreen title="Auto Select" />;
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
        "flex flex-col h-[27px] w-[44px] justify-center text-center font-['SF_Pro',sans-serif] text-[48px]",
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
    useSortable({ id: tab.id, disabled: !editMode });

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
    <div className="flex flex-col h-full items-start justify-between shrink-0 w-[44px]">
      <div className="flex flex-col gap-[48px] items-start w-[44px] pt-[10px]">
        {RIGHT_PANELS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
            className={[
              "flex flex-col h-[27px] w-full justify-center text-center font-['SF_Pro',sans-serif] text-[48px] leading-[0]",
              openPanel === p.id ? "text-[#70cd35]" : "text-white",
            ].join(" ")}
          >
            <Sf s={openPanel === p.id ? p.activeSymbol : p.symbol} className="leading-[normal]" />
          </button>
        ))}
      </div>
      {/* K chevron — decorative */}
      <div className="flex flex-col items-center w-[44px] pb-[10px]">
        <div className="flex flex-col h-[27px] justify-center font-['SF_Pro',sans-serif] text-[48px] text-center text-white leading-[0] w-full">
          <Sf s="􁍃" className="leading-[normal]" />
        </div>
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
  installedIds,
  editMode,
  closing,
  onToggleEditMode,
  onClose,
  onToggleInstall,
  onCloseAnimEnd,
}: {
  availableIcons: { id: string; symbol: string }[];
  installedIds: Set<string>;
  editMode: boolean;
  closing: boolean;
  onToggleEditMode: () => void;
  onClose: () => void;
  onToggleInstall: (id: string) => void;
  onCloseAnimEnd: () => void;
}) {
  const padded = [...availableIcons];
  while (padded.length < TOTAL_DOCK_SLOTS) {
    padded.push({ id: `placeholder-${padded.length}`, symbol: PLACEHOLDER_SYMBOL });
  }

  return (
    <div
      className={[
        "absolute bottom-0 left-1/2 -translate-x-1/2 z-20 will-change-transform",
        closing ? "animate-ts-dock-down" : "animate-ts-dock-up",
      ].join(" ")}
      onAnimationEnd={closing ? onCloseAnimEnd : undefined}
    >
      <div
        className={[
          "flex gap-[60px] items-end overflow-clip p-[10px] w-[860px]",
          "backdrop-blur-[8px] bg-black/50",
          "border-[#70cd35] border-l-4 border-r-4 border-t-4 border-solid",
        ].join(" ")}
      >
        {/* Icon grid */}
        <SortableContext items={padded.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="flex flex-1 flex-wrap gap-[12px] items-start min-w-0 font-['SF_Pro',sans-serif] text-[48px] text-center leading-[0] whitespace-nowrap">
            {padded.map((item) => {
              const isPlaceholder = item.id.startsWith("placeholder-");
              const isInstalled = installedIds.has(item.id);
              return (
                <SortableDockIcon
                  key={item.id}
                  id={item.id}
                  symbol={item.symbol}
                  isInstalled={isInstalled}
                  isPlaceholder={isPlaceholder}
                  editMode={editMode}
                  onTap={() => onToggleInstall(item.id)}
                />
              );
            })}
          </div>
        </SortableContext>

        {/* Controls column */}
        <div className="flex flex-col h-full items-center justify-between shrink-0 w-[44px] font-['SF_Pro',sans-serif] text-[48px] text-center leading-[0] whitespace-nowrap">
          <button
            type="button"
            onClick={onToggleEditMode}
            className={[
              "flex flex-col justify-center",
              editMode ? "text-[#70cd35]" : "text-white",
            ].join(" ")}
          >
            <Sf s="􀈋" className="leading-[normal]" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex flex-col justify-center text-white"
          >
            <Sf s="􀆈" className="leading-[normal]" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SortableDockIcon({
  id,
  symbol,
  isInstalled,
  isPlaceholder,
  editMode,
  onTap,
}: {
  id: string;
  symbol: string;
  isInstalled: boolean;
  isPlaceholder: boolean;
  editMode: boolean;
  onTap: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !editMode || isPlaceholder });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : isPlaceholder ? 0.2 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(editMode && !isPlaceholder ? listeners : {})}
      className={[
        "flex flex-col justify-center shrink-0",
        isInstalled && !isPlaceholder ? "text-[#70cd35]" : "text-white",
        isPlaceholder ? "pointer-events-none" : "cursor-pointer",
      ].join(" ")}
      onClick={isPlaceholder ? undefined : onTap}
    >
      <Sf s={symbol} className="leading-[normal]" />
    </div>
  );
}

// ─── Easing constant ─────────────────────────────────────────────────────────

const EASE = "cubic-bezier(0.25, 0.1, 0.25, 1)";
const PANEL_DURATION = "300ms";

// ─── Main component ───────────────────────────────────────────────────────────

export function TouchscreenDashboard() {
  const [activeOverlayTab, setActiveOverlayTab] = useState<OverlayTabId | null>(null);
  const [prevOverlayTab, setPrevOverlayTab] = useState<OverlayTabId | null>(null);
  const [openRightPanel, setOpenRightPanel] = useState<RightPanelId | null>(null);
  const [isDockOpen, setIsDockOpen] = useState(false);
  const [isDockClosing, setIsDockClosing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [leftRailIcons, setLeftRailIcons] = useState<OverlayTabId[]>(["auto", "settings"]);
  const [dockIcons, setDockIcons] = useState(() =>
    ALL_TABS.map((t) => ({ id: t.id, symbol: t.symbol }))
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Track last-opened panel so content stays rendered during close width transition
  const lastPanelRef = useRef<RightPanelId | null>(null);
  if (openRightPanel) lastPanelRef.current = openRightPanel;

  const installedIds = new Set<string>(leftRailIcons);
  const isDriverBase = activeOverlayTab === null;
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

  // ── tab switching ──
  const switchOverlayTab = useCallback(
    (tabId: OverlayTabId) => {
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
    if (activeOverlayTab) {
      setPrevOverlayTab(activeOverlayTab);
      setActiveOverlayTab(null);
    }
  }, [activeOverlayTab]);

  // ── right panel (width transition handles open/close animation) ──
  const togglePanel = useCallback((panelId: RightPanelId) => {
    setOpenRightPanel((cur) => (cur === panelId ? null : panelId));
  }, []);

  // ── dock ──
  const closeDock = useCallback(() => {
    setIsDockClosing(true);
    setIsEditMode(false);
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

  const toggleInstall = useCallback(
    (id: string) => {
      if (!isEditMode) {
        const tab = ALL_TABS.find((t) => t.id === id);
        if (tab) switchOverlayTab(tab.id);
        return;
      }
      const tabId = id as OverlayTabId;
      setLeftRailIcons((prev) =>
        prev.includes(tabId) ? prev.filter((i) => i !== tabId) : [...prev, tabId],
      );
    },
    [isEditMode, switchOverlayTab],
  );

  // ── dnd ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const draggingTabDef = draggingId ? ALL_TABS.find((t) => t.id === draggingId) ?? null : null;

  function handleDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const aId = String(active.id);
    const oId = String(over.id);
    const aInRail = leftRailIcons.includes(aId as OverlayTabId);
    const oInRail = leftRailIcons.includes(oId as OverlayTabId);
    const aInDock = dockIcons.some((d) => d.id === aId);
    const oInDock = dockIcons.some((d) => d.id === oId);

    if (aInRail && oInRail) {
      const oi = leftRailIcons.indexOf(aId as OverlayTabId);
      const ni = leftRailIcons.indexOf(oId as OverlayTabId);
      if (oi !== -1 && ni !== -1) setLeftRailIcons((p) => arrayMove(p, oi, ni));
    } else if (aInDock && oInDock) {
      const oi = dockIcons.findIndex((d) => d.id === aId);
      const ni = dockIcons.findIndex((d) => d.id === oId);
      if (oi !== -1 && ni !== -1) setDockIcons((p) => arrayMove(p, oi, ni));
    } else if (aInDock && oInRail && !leftRailIcons.includes(aId as OverlayTabId)) {
      const idx = leftRailIcons.indexOf(oId as OverlayTabId);
      setLeftRailIcons((p) => {
        const n = [...p];
        if (idx !== -1) n.splice(idx, 0, aId as OverlayTabId);
        else n.push(aId as OverlayTabId);
        return n;
      });
    } else if (aInRail && oInDock) {
      setLeftRailIcons((p) => p.filter((i) => i !== (aId as OverlayTabId)));
    }
  }

  // ── shared inline style for right-side width transition ──
  const rightSideTransitionStyle = {
    width: rightSideWidth,
    transition: `width ${PANEL_DURATION} ${EASE}`,
    willChange: "width" as const,
  };

  // Overlay mode also transitions the green border via box-shadow (no layout shift)
  const overlayRightStyle = {
    ...rightSideTransitionStyle,
    boxShadow: openRightPanel
      ? "inset 4px 0 0 0 #70cd35"
      : "inset 4px 0 0 0 transparent",
    transition: `width ${PANEL_DURATION} ${EASE}, box-shadow ${PANEL_DURATION} ${EASE}`,
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="fixed inset-0 flex overflow-hidden bg-black text-white">
        {/* ── LEFT RAIL ── no background per Figma (transparent over black) */}
        <aside className="flex w-[84px] shrink-0 flex-col items-start justify-between overflow-clip px-[20px] py-[30px]">
          {/* Top icon group */}
          <div className="flex flex-col gap-[48px] items-start w-[44px]">
            {/* Pinned: driver */}
            <LeftIcon
              symbol="􁿢"
              activeSymbol="􁿣"
              active={isDriverBase && !isDockOpen}
              onClick={dismissOverlay}
            />
            {/* Custom tab icons */}
            <SortableContext items={leftRailIcons} strategy={verticalListSortingStrategy}>
              {leftRailIcons.map((tabId) => {
                const def = ALL_TABS.find((t) => t.id === tabId)!;
                return (
                  <SortableLeftIcon
                    key={tabId}
                    tab={def}
                    active={activeOverlayTab === tabId}
                    onClick={() => switchOverlayTab(tabId)}
                    editMode={isEditMode && isDockOpen}
                  />
                );
              })}
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

        {/* ── MAIN AREA ── */}
        <div className="relative min-w-0 flex-1 overflow-hidden">
          {/* Driver content (always at base) */}
          <div className="absolute inset-0 z-0">
            <PlaceholderScreen title="Driver tab" />
          </div>

          {/* Exiting overlay tab (slides down) */}
          {prevOverlayTab !== null && (
            <div
              key={`exit-${prevOverlayTab}`}
              className="absolute inset-0 z-10 bg-black animate-ts-slide-down will-change-transform"
              onAnimationEnd={() => setPrevOverlayTab(null)}
            >
              {renderTabContent(prevOverlayTab)}
            </div>
          )}

          {/* Active overlay tab (slides up) */}
          {activeOverlayTab !== null && (
            <div
              key={`enter-${activeOverlayTab}`}
              className="absolute inset-0 z-10 bg-black animate-ts-slide-up will-change-transform"
            >
              {renderTabContent(activeOverlayTab)}
            </div>
          )}

          {/* ── Right side OVERLAY (driver mode only) ──
               Width transitions 84px ↔ 540px, revealing/hiding the panel content.
               The green border is rendered via box-shadow to avoid layout shifts. */}
          {isDriverBase && (
            <div
              className="absolute top-0 right-0 z-[15] h-full overflow-hidden backdrop-blur-[4px] bg-black/50"
              style={overlayRightStyle}
            >
              <RightSideContent
                openPanel={openRightPanel}
                displayPanel={displayPanelId}
                onToggle={togglePanel}
              />
            </div>
          )}

          {/* Dock drawer */}
          {isDockOpen && (
            <DockDrawer
              availableIcons={dockIcons}
              installedIds={installedIds}
              editMode={isEditMode}
              closing={isDockClosing}
              onToggleEditMode={() => setIsEditMode((m) => !m)}
              onClose={closeDock}
              onToggleInstall={toggleInstall}
              onCloseAnimEnd={onDockCloseAnimEnd}
            />
          )}
        </div>

        {/* ── Right side INLINE (non-driver mode) ──
             Same width-reveal transition, but as a flex sibling so main area resizes. */}
        {!isDriverBase && (
          <div
            className="h-full shrink-0 overflow-hidden backdrop-blur-[4px] bg-black/50"
            style={rightSideTransitionStyle}
          >
            <RightSideContent
              openPanel={openRightPanel}
              displayPanel={displayPanelId}
              onToggle={togglePanel}
            />
          </div>
        )}
      </div>

      {/* DnD ghost */}
      <DragOverlay>
        {draggingTabDef ? (
          <div className="flex flex-col justify-center font-['SF_Pro',sans-serif] text-[48px] text-white text-center leading-[0] opacity-80">
            <Sf s={draggingTabDef.symbol} className="leading-[normal]" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
