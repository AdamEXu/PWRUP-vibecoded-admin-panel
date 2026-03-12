"use client";

import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import { LeftRail } from "./components/chrome/LeftRail";
import { RightPanel } from "./components/chrome/RightPanel";
import { PlaceholderScreen } from "./components/common/PlaceholderScreen";
import { TouchscreenDragGhost } from "./components/dnd/TouchscreenDragGhost";
import { DockDrawer } from "./components/dock/DockDrawer";
import { useTouchscreenDnd } from "./hooks/useTouchscreenDnd";
import { useTouchscreenLayoutState } from "./hooks/useTouchscreenLayoutState";
import { TOUCHSCREEN_DND_CONTEXT_ID } from "./model";
import { TouchscreenTabContent } from "./tabs/TouchscreenTabContent";

export function TouchscreenDashboard() {
  const {
    activeOverlayTab,
    appLayerStyle,
    clearPrevOverlayTab,
    closeDock,
    dismissOverlay,
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
        <PlaceholderScreen title="Driver tab" />
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
          key={`enter-${activeOverlayTab}`}
          className="fixed top-0 bottom-0 z-10 bg-black animate-ts-slide-up will-change-transform"
          style={appLayerStyle}
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
    </DndContext>
  );
}
