"use client";

import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import { useCallback, useState } from "react";
import { ConnectionLost } from "../match/ConnectionLost";
import { LeftRail } from "./components/chrome/LeftRail";
import { RightPanel } from "./components/chrome/RightPanel";
import dynamic from "next/dynamic";

const DriverTab = dynamic(
  () => import("./tabs/DriverTab").then((m) => m.DriverTab),
  { ssr: false, loading: () => <div className="h-full w-full bg-black" /> },
);
import { TouchscreenDragGhost } from "./components/dnd/TouchscreenDragGhost";
import { DockDrawer } from "./components/dock/DockDrawer";
import { useTouchscreenDnd } from "./hooks/useTouchscreenDnd";
import { useSwipeGesture } from "./hooks/useSwipeGesture";
import { useTouchscreenLayoutState } from "./hooks/useTouchscreenLayoutState";
import { usePathNetworkTable } from "@/lib/hooks/usePathNetworkTable";
import { TOUCHSCREEN_DND_CONTEXT_ID } from "./model";
import { TouchscreenTabContent } from "./tabs/TouchscreenTabContent";

export function TouchscreenDashboard() {
  const { isConnected } = usePathNetworkTable();
  const {
    activeOverlayTab,
    appLayerStyle,
    clearPrevOverlayTab,
    closeDock,
    closePanelImmediate,
    dismissOverlay,
    dismissOverlayImmediate,
    displayPanelId,
    dockIcons,
    driverLayerStyle,
    isDockClosing,
    isDockOpen,
    isDriverBase,
    leftRailIcons,
    onDockCloseAnimEnd,
    openFromDock,
    openRightPanel,
    prevOverlayTab,
    rightPanelStyle,
    setDockIcons,
    setLeftRailIcons,
    switchOverlayTab,
    toggleDock,
    togglePanel,
    useOverlayRightPanel,
  } = useTouchscreenLayoutState();

  // Track whether the entry animation has finished so we can hand off to gesture transform
  const [entryAnimDone, setEntryAnimDone] = useState(false);
  const onEntryAnimEnd = useCallback(() => setEntryAnimDone(true), []);
  // Reset when active tab changes
  const [lastTab, setLastTab] = useState(activeOverlayTab);
  if (activeOverlayTab !== lastTab) {
    setLastTab(activeOverlayTab);
    if (activeOverlayTab !== null) setEntryAnimDone(false);
  }

  const { ref: swipeDownRef } = useSwipeGesture({
    direction: "down",
    dimension: typeof window !== "undefined" ? window.innerHeight : 800,
    onCommit: dismissOverlayImmediate,
    enabled: activeOverlayTab !== null && entryAnimDone,
  });

  const { draggingTabDef, handleDragEnd, handleDragStart, sensors } = useTouchscreenDnd({
    leftRailIcons,
    setLeftRailIcons,
    dockIcons,
    setDockIcons,
  });

  return (
    <DndContext
      id={TOUCHSCREEN_DND_CONTEXT_ID}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="fixed top-0 bottom-0 z-0 bg-black" style={driverLayerStyle}>
        <DriverTab />
      </div>

      {prevOverlayTab !== null && (
        <div
          key={`exit-${prevOverlayTab}`}
          className="fixed top-0 bottom-0 z-10 bg-black animate-ts-slide-down will-change-transform"
          style={appLayerStyle}
          onAnimationEnd={clearPrevOverlayTab}
        >
          <TouchscreenTabContent tabId={prevOverlayTab} />
        </div>
      )}

      {activeOverlayTab !== null && (
        <div
          ref={swipeDownRef}
          key={`enter-${activeOverlayTab}`}
          className={[
            "fixed top-0 bottom-0 z-10 bg-black will-change-transform",
            !entryAnimDone && "animate-ts-slide-up",
          ]
            .filter(Boolean)
            .join(" ")}
          style={
            entryAnimDone
              ? { ...appLayerStyle, transform: "translate3d(0, 0, 0)" }
              : appLayerStyle
          }
          onAnimationEnd={onEntryAnimEnd}
        >
          <TouchscreenTabContent tabId={activeOverlayTab} />
        </div>
      )}

      <LeftRail
        leftRailIcons={leftRailIcons}
        activeOverlayTab={activeOverlayTab}
        isDriverBase={isDriverBase}
        isDockOpen={isDockOpen}
        onDismissOverlay={dismissOverlay}
        onSwitchOverlayTab={switchOverlayTab}
        onToggleDock={toggleDock}
      />

      <RightPanel
        useOverlayRightPanel={useOverlayRightPanel}
        openPanel={openRightPanel}
        displayPanel={displayPanelId}
        onToggle={togglePanel}
        onSwipeClose={closePanelImmediate}
        style={rightPanelStyle}
      />

      {isDockOpen && !isDockClosing && (
        <div className="fixed inset-0 z-[19]" onClick={closeDock} />
      )}

      {isDockOpen && (
        <DockDrawer
          availableIcons={dockIcons}
          activeTabId={activeOverlayTab}
          closing={isDockClosing}
          onOpen={openFromDock}
          onCloseAnimEnd={onDockCloseAnimEnd}
        />
      )}

      <DragOverlay>
        <TouchscreenDragGhost symbol={draggingTabDef?.symbol} />
      </DragOverlay>

      <ConnectionLost visible={!isConnected} />
    </DndContext>
  );
}
