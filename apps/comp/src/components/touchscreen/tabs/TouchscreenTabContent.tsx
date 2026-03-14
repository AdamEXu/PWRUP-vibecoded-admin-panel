import type { OverlayTabId } from "../model";
import { AutoTab } from "./AutoTab";
import { EffectsTab } from "./EffectsTab";
import { HowardTab } from "./HowardTab";
import { SettingsTab } from "./SettingsTab";

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
  return <EffectsTab />;
}
