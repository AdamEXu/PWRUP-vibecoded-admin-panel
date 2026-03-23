"use client";

import { useSettings } from "@/lib/settings";
import { CustomSelector, type SelectorOption } from "./CustomSelector";
import { CustomSlider } from "./CustomSlider";
import { colScroll } from "../../settings/constants";

const MODE_OPTIONS: SelectorOption[] = [
  { id: "driver", symbol: "􀋓", filledSymbol: "􀋔" },
  { id: "follow", symbol: "􀎬", filledSymbol: "􀎭" },
];

export function MapSettingsPanel() {
  const { mapSettings, updateMapSettings, resetMapSettings } = useSettings();

  return (
    <div className="flex flex-col h-full items-start p-[16px] shrink-0 w-[426px]">
      <p className="font-['Inter',sans-serif] font-medium text-[36px] text-white leading-[normal]">
        Map Settings
      </p>

      <div className={`flex flex-col gap-[20px] mt-[16px] w-full flex-1 pr-[10px] ${colScroll}`}>
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

        {/* Reset button */}
        <button
          type="button"
          onClick={resetMapSettings}
          className="block w-full h-12 border-2 border-white/20 bg-transparent px-6 text-xl font-semibold text-zinc-400"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
