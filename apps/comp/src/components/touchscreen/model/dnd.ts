export const RAIL_PREFIX = "rail-";
export const DOCK_PREFIX = "dock-";

export const TOUCHSCREEN_DND_CONTEXT_ID = "touchscreen-dashboard-dnd";

export function railId(tabId: string): string {
  return `${RAIL_PREFIX}${tabId}`;
}

export function dockId(tabId: string): string {
  return `${DOCK_PREFIX}${tabId}`;
}

export function parseId(prefixedId: string): { zone: "rail" | "dock"; tabId: string } | null {
  if (prefixedId.startsWith(RAIL_PREFIX)) {
    return { zone: "rail", tabId: prefixedId.slice(RAIL_PREFIX.length) };
  }
  if (prefixedId.startsWith(DOCK_PREFIX)) {
    return { zone: "dock", tabId: prefixedId.slice(DOCK_PREFIX.length) };
  }
  return null;
}
