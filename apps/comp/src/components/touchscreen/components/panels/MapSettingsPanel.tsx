"use client";

import { useSettings } from "@/lib/settings";
import { CustomSelector, type SelectorOption } from "./CustomSelector";
import { CustomSlider } from "./CustomSlider";
import { colScroll } from "../../settings/constants";

const MODE_OPTIONS: SelectorOption[] = [
  { id: "driver", symbol: "􀋓", filledSymbol: "􀋔", hint: "Camera is aligned to the driver station" },
  { id: "follow", symbol: "􀎬", filledSymbol: "􀎭", hint: "Camera orbits to follow robot rotation" },
];

const ANGLE_HINTS = [
  { min: 0.0, max: 0.1, label: "Camera is close to the ground" },
  { min: 0.1, max: 0.5, label: "Standard third person camera view" },
  { min: 0.5, max: 0.9, label: "Camera view from up high" },
  { min: 0.9, max: 1.0, label: "Top down camera view" },
];

const ZOOM_HINTS = [
  { min: 0.0, max: 0.2, label: "Zoomed out to field width (best in driver aligned camera)" },
  { min: 0.2, max: 0.6, label: "Moderate camera distance from robot" },
  { min: 0.6, max: 1.0, label: "Close camera distance to robot" },
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
          hints={ANGLE_HINTS}
        />

        <CustomSlider
          label="Zoom"
          value={mapSettings.zoom}
          onChange={(v) => updateMapSettings({ zoom: v })}
          hints={ZOOM_HINTS}
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
