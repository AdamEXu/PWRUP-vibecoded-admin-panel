import type { RightPanelDef, TabDef } from "./types";

export const ALL_TABS: TabDef[] = [
  { id: "auto", label: "Auto Select", symbol: "􀣱", activeSymbol: "􀬱" },
  { id: "settings", label: "Settings", symbol: "􀎕", activeSymbol: "􀎖" },
  { id: "effects", label: "Special Effects", symbol: "􁅋", activeSymbol: "􁅌" },
  { id: "howard", label: "Pictures of Howard", symbol: "􀉩", activeSymbol: "􀉪" },
];

export const RIGHT_PANELS: RightPanelDef[] = [
  { id: "showMap", label: "Map", symbol: "􀙊", activeSymbol: "􀙋" },
  { id: "showTimers", label: "Timers", symbol: "􀐯", activeSymbol: "􀐰" },
  { id: "showStatus", label: "Status", symbol: "􀅴", activeSymbol: "􀅵" },
  { id: "showCamera", label: "Camera", symbol: "􀌞", activeSymbol: "􀌟" },
];
