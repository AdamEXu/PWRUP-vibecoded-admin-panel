import type { OverlayTabId } from "../model";
import { AutoTab } from "./AutoTab";
import { EffectsTab } from "./EffectsTab";
import { SettingsTab } from "./SettingsTab";

export function TouchscreenTabContent({ tabId }: { tabId: OverlayTabId }) {
  if (tabId === "settings") {
    return <SettingsTab />;
  }
  if (tabId === "auto") {
    return <AutoTab />;
  }
  return <EffectsTab />;
}
