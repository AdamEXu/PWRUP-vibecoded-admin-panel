import { ALL_TABS } from "./defs";
import type { DockIcon, OverlayTabId } from "./types";

export const TOUCHSCREEN_LAYOUT_STORAGE_KEY = "pwrup.touchscreen.layout.v1";

export const DEFAULT_LEFT_RAIL_ICONS: OverlayTabId[] = ["auto", "settings"];
export const DEFAULT_DOCK_ORDER: OverlayTabId[] = ALL_TABS.map((tab) => tab.id);

export function isOverlayTabId(value: unknown): value is OverlayTabId {
  return typeof value === "string" && DEFAULT_DOCK_ORDER.some((tabId) => tabId === value);
}

export function sanitizeTabList(value: unknown): OverlayTabId[] {
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

export function normalizeDockOrder(value: unknown): OverlayTabId[] {
  const sanitized = sanitizeTabList(value);
  const remaining = DEFAULT_DOCK_ORDER.filter((tabId) => !sanitized.includes(tabId));
  return [...sanitized, ...remaining];
}

export function loadLayoutState(): {
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

export function saveLayoutState(leftRailIcons: OverlayTabId[], dockOrder: OverlayTabId[]): void {
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

export function dockIconsFromOrder(order: OverlayTabId[]): DockIcon[] {
  return order.map((tabId) => {
    const tab = ALL_TABS.find((entry) => entry.id === tabId)!;
    return { id: tab.id, symbol: tab.symbol };
  });
}
