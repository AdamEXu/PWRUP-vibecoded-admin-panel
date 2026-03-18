import dynamic from "next/dynamic";
import type { OverlayTabId } from "../model";
import { AutoTab } from "./AutoTab";
import { EffectsTab } from "./EffectsTab";
import { HowardTab } from "./HowardTab";
import { SettingsTab } from "./SettingsTab";

// Canvas must not SSR — dynamic import keeps Three.js out of the server bundle
const Robot3DTab = dynamic(() => import("./Robot3DTab").then((m) => m.Robot3DTab), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center"><span className="animate-pulse text-sm text-white/40">Loading 3D…</span></div>,
});

export function TouchscreenTabContent({ tabId }: { tabId: OverlayTabId }) {
  if (tabId === "settings") {
    return <SettingsTab />;
  }
  if (tabId === "auto") {
    return <AutoTab />;
  }
  if (tabId === "howard") {
    return <HowardTab />;
  }
  if (tabId === "robot3d") {
    return <Robot3DTab />;
  }
  return <EffectsTab />;
}
