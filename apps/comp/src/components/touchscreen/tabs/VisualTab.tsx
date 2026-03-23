"use client";

import { useEffect, useState } from "react";
import { useSettings, type VisualSettings } from "@/lib/settings";
import { CustomSelector, type SelectorOption } from "../components/panels/CustomSelector";
import { CustomSlider, type SliderHintRange } from "../components/panels/CustomSlider";
import { SettingsColumn } from "../settings/components/SettingsColumn";

export const VISUAL_RELOAD_CHANNEL = "pwrup-visual-settings-reload";

const LOG_DEPTH_OPTIONS: SelectorOption[] = [
  { id: "false", symbol: "􀆄", hint: "Standard depth buffer (better performance)" },
  { id: "true",  symbol: "􀆅", hint: "Logarithmic depth buffer (reduces z-fighting)" },
];

const BLUR_OPTIONS: SelectorOption[] = [
  { id: "false", symbol: "􀆄", hint: "Solid panels (better GPU performance)" },
  { id: "true",  symbol: "􀆅", hint: "Frosted glass blur effect" },
];

const RENDER_SCALE_SNAP_POINTS = [0.25, 0.5, 0.75, 1.0];

const RENDER_SCALE_HINTS: SliderHintRange[] = [
  { min: 0,    max: 1, label: "0.25× — quarter resolution, for struggling hardware" },
  { min: 0.4,  max: 1, label: "0.5× — half resolution, big perf gain with moderate quality loss" },
  { min: 0.62, max: 1, label: "0.75× — three-quarter resolution, barely noticeable quality loss" },
  { min: 0.87, max: 1, label: "1× — native resolution, full quality" },
];

function broadcastReload() {
  try {
    const ch = new BroadcastChannel(VISUAL_RELOAD_CHANNEL);
    ch.postMessage("reload");
    ch.close();
  } catch {
    // ignore
  }
}

export function VisualTab() {
  const { visualSettings, updateVisualSettings, resetVisualSettings } = useSettings();
  const [draft, setDraft] = useState<VisualSettings>(() => visualSettings);

  useEffect(() => {
    setDraft(visualSettings);
  }, [visualSettings]);

  const hasChanges =
    draft.logarithmicDepthBuffer !== visualSettings.logarithmicDepthBuffer ||
    draft.backdropBlur !== visualSettings.backdropBlur ||
    draft.renderScale !== visualSettings.renderScale;

  function onSave() {
    updateVisualSettings(draft);
    broadcastReload();
  }

  function onReset() {
    resetVisualSettings();
    broadcastReload();
  }

  return (
    <div className="flex h-full flex-col bg-[#272727]">
      <div className="shrink-0 border-b-2 border-white/10 px-8 py-5 flex items-center justify-between gap-6">
        <h1 className="text-[28px] font-semibold text-white leading-none">Visual Settings</h1>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="h-12 border-2 border-white/20 bg-transparent px-6 text-sm font-semibold text-zinc-400 transition-colors hover:bg-white/5 active:bg-white/10"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!hasChanges}
            className="h-12 bg-[#70cd35] px-8 text-sm font-semibold text-black transition-opacity disabled:opacity-30 active:opacity-70"
          >
            Save
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 flex overflow-x-auto [&::-webkit-scrollbar]:h-[5px] [&::-webkit-scrollbar-track]:bg-[#272727] [&::-webkit-scrollbar-thumb]:bg-[#70cd35] [&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-thumb]:cursor-pointer">
        <SettingsColumn title="Rendering">
          <CustomSelector
            label="Logarithmic Depth Buffer"
            options={LOG_DEPTH_OPTIONS}
            value={String(draft.logarithmicDepthBuffer)}
            onChange={(id) => setDraft((d) => ({ ...d, logarithmicDepthBuffer: id === "true" }))}
          />
          <CustomSelector
            label="Backdrop Blur"
            options={BLUR_OPTIONS}
            value={String(draft.backdropBlur)}
            onChange={(id) => setDraft((d) => ({ ...d, backdropBlur: id === "true" }))}
          />
          <CustomSlider
            label="Render Scale"
            value={draft.renderScale}
            onChange={(v) => setDraft((d) => ({ ...d, renderScale: v }))}
            snapPoints={RENDER_SCALE_SNAP_POINTS}
            hints={RENDER_SCALE_HINTS}
          />
        </SettingsColumn>
      </div>
    </div>
  );
}
