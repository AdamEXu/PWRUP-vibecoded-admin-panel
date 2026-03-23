"use client";

import { useSettings } from "@/lib/settings";
import { CustomSelector, type SelectorOption } from "./CustomSelector";
import { CustomSlider } from "./CustomSlider";
import { colScroll } from "../../settings/constants";

const MODE_OPTIONS: SelectorOption[] = [
  { id: "driver", symbol: "􀋓" },
  { id: "follow", symbol: "􀎭" },
];

export function MapSettingsPanel() {
  const { mapSettings, updateMapSettings, resetMapSettings } = useSettings();

  return (
    <div className="flex flex-col h-full items-start p-[10px] shrink-0 w-[426px]">
      <p className="font-['Inter',sans-serif] font-medium text-[36px] text-white leading-[normal]">
        Map Settings
      </p>

      <div className={`flex flex-col gap-[10px] mt-[10px] w-full flex-1 ${colScroll}`}>
        <CustomSelector
          label="Mode"
          options={MODE_OPTIONS}
          value={mapSettings.mode}
          onChange={(id) => updateMapSettings({ mode: id as "follow" | "driver" })}
        />

        <CustomSlider
          label="Angle"
          value={mapSettings.angle}
          onChange={(v) => updateMapSettings({ angle: v })}
        />

        <CustomSlider
          label="Zoom"
          value={mapSettings.zoom}
          onChange={(v) => updateMapSettings({ zoom: v })}
        />
      </div>

      {/* Reset button */}
      <button
        onClick={resetMapSettings}
        className="mt-auto self-end font-['Inter',sans-serif] font-medium text-[20px] text-white/60 hover:text-white transition-colors duration-150 px-[16px] py-[10px] rounded-[8px] border border-white/20 hover:border-white/40"
      >
        Reset
      </button>
    </div>
  );
}
