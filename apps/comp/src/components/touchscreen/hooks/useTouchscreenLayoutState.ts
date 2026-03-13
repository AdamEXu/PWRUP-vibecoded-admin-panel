import { useCallback, useEffect, useRef, useState } from "react";
import {
  ALL_TABS,
  EASE,
  PANEL_DURATION,
  dockIconsFromOrder,
  loadLayoutState,
  saveLayoutState,
} from "../model";
import type { DockIcon, OverlayTabId, RightPanelId } from "../model";

export function useTouchscreenLayoutState() {
  const [initialLayout] = useState(loadLayoutState);
  const [activeOverlayTab, setActiveOverlayTab] = useState<OverlayTabId | null>(null);
  const [prevOverlayTab, setPrevOverlayTab] = useState<OverlayTabId | null>(null);
  const [openRightPanel, setOpenRightPanel] = useState<RightPanelId | null>(null);
  const [isDockOpen, setIsDockOpen] = useState(false);
  const [isDockClosing, setIsDockClosing] = useState(false);
  const [leftRailIcons, setLeftRailIcons] = useState<OverlayTabId[]>(initialLayout.leftRailIcons);
  const [dockIcons, setDockIcons] = useState<DockIcon[]>(() => dockIconsFromOrder(initialLayout.dockOrder));

  const lastPanelRef = useRef<RightPanelId | null>(null);
  if (openRightPanel) {
    lastPanelRef.current = openRightPanel;
  }

  const isDriverBase = activeOverlayTab === null;
  const useOverlayRightPanel = isDriverBase;
  const displayPanelId = openRightPanel ?? lastPanelRef.current;
  const rightSideWidth = openRightPanel ? 540 : 84;

  useEffect(() => {
    if (prevOverlayTab !== null) {
      const timeout = setTimeout(() => setPrevOverlayTab(null), 350);
      return () => clearTimeout(timeout);
    }
  }, [prevOverlayTab]);

  useEffect(() => {
    if (isDockClosing) {
      const timeout = setTimeout(() => {
        setIsDockOpen(false);
        setIsDockClosing(false);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isDockClosing]);

  useEffect(() => {
    saveLayoutState(
      leftRailIcons,
      dockIcons.map((icon) => icon.id),
    );
  }, [leftRailIcons, dockIcons]);

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

  /** Dismiss without exit animation — caller already animated the slide-out. */
  const dismissOverlayImmediate = useCallback(() => {
    setIsDockClosing(true);
    setActiveOverlayTab(null);
  }, []);

  const togglePanel = useCallback((panelId: RightPanelId) => {
    setIsDockClosing(true);
    setOpenRightPanel((current) => (current === panelId ? null : panelId));
  }, []);

  /** Close panel without width transition — caller already animated the slide-out. */
  const skipPanelTransitionRef = useRef(false);
  const closePanelImmediate = useCallback(() => {
    skipPanelTransitionRef.current = true;
    setIsDockClosing(true);
    setOpenRightPanel(null);
  }, []);

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
      const tab = ALL_TABS.find((entry) => entry.id === id);
      if (tab) {
        switchOverlayTab(tab.id);
      }
    },
    [switchOverlayTab],
  );

  const clearPrevOverlayTab = useCallback(() => {
    setPrevOverlayTab(null);
  }, []);

  const skipTransition = skipPanelTransitionRef.current;
  if (skipTransition) skipPanelTransitionRef.current = false;

  const rightPanelStyle: React.CSSProperties = {
    width: rightSideWidth,
    boxShadow: openRightPanel
      ? "inset 4px 0 0 0 #70cd35"
      : "inset 4px 0 0 0 transparent",
    transition: skipTransition
      ? "none"
      : `width ${PANEL_DURATION} ${EASE}, box-shadow ${PANEL_DURATION} ${EASE}`,
    willChange: "width",
  };

  const driverLayerStyle: React.CSSProperties = { left: 84, right: 0 };

  const appLayerStyle: React.CSSProperties = {
    left: 84,
    right: rightSideWidth,
    transition: skipTransition ? "none" : `right ${PANEL_DURATION} ${EASE}`,
  };

  return {
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
  };
}
