"use client";

import { useMemo, useState } from "react";
import { useSettings } from "@/lib/settings";
import { TouchscreenSettingsPanel } from "./TouchscreenSettingsPanel";

type LeftTabId = "driver" | "auto" | "settings" | "apps";
type VisibilityToggleKey = "showMap" | "showTimers" | "showStatus" | "showCamera";

interface LeftTab {
  id: LeftTabId;
  label: string;
  symbol: string;
  activeSymbol: string;
}

interface RightToggle {
  id: VisibilityToggleKey;
  label: string;
  symbol: string;
  activeSymbol: string;
}

const LEFT_TABS: LeftTab[] = [
  { id: "driver",   label: "Driver control", symbol: "􁿢", activeSymbol: "􁿣" },
  { id: "auto",     label: "Auto Select",    symbol: "􀣱", activeSymbol: "􀬱" },
  { id: "settings", label: "Settings",       symbol: "􀺺", activeSymbol: "􀺻" },
  { id: "apps",     label: "Apps",           symbol: "􀦲", activeSymbol: "􀦳" },
];

const RIGHT_TOGGLE_GROUP: RightToggle[] = [
  { id: "showMap",    label: "Map",    symbol: "􀙊", activeSymbol: "􀙋" },
  { id: "showTimers", label: "Timers", symbol: "􀐯", activeSymbol: "􀐰" },
  { id: "showStatus", label: "Status", symbol: "􂁌", activeSymbol: "􂁍" },
];

const CAMERA_TOGGLE: RightToggle = {
  id: "showCamera", label: "Camera", symbol: "􀌞", activeSymbol: "􀌟",
};

function TouchRailButton({
  active,
  label,
  symbol,
  activeSymbol,
  onClick,
}: {
  active: boolean;
  label: string;
  symbol: string;
  activeSymbol: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className="flex h-14 w-14 items-center justify-center rounded-2xl transition-colors"
    >
      <span className={[
        "sf-symbol text-[42px] leading-none",
        active ? "text-[#70cd35]" : "text-white",
      ].join(" ")}>
        {active ? activeSymbol : symbol}
      </span>
    </button>
  );
}

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div className="flex h-full items-center justify-center px-8 py-8">
      <div className="w-full max-w-4xl rounded-[28px] border border-white/10 bg-[#1d1d1d] px-10 py-12 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <p className="text-[36px] font-semibold tracking-tight text-white">{title}</p>
        <p className="mt-4 text-lg text-zinc-400">Blank for now.</p>
      </div>
    </div>
  );
}

export function TouchscreenDashboard() {
  const [activeTab, setActiveTab] = useState<LeftTabId>("driver");
  const { hudVisibility, updateHudVisibility } = useSettings();

  const toggleSnapshot = {
    showMap: hudVisibility.showMap,
    showTimers: hudVisibility.showTimers,
    showStatus: hudVisibility.showStatus,
    showCamera: hudVisibility.showCamera,
  };

  function toggleVisibility(key: VisibilityToggleKey) {
    updateHudVisibility({ [key]: !toggleSnapshot[key] } as Partial<Record<VisibilityToggleKey, boolean>>);
  }

  const content = useMemo(() => {
    if (activeTab === "settings") {
      return <TouchscreenSettingsPanel />;
    }

    if (activeTab === "driver") {
      return <PlaceholderScreen title="Driver Control" />;
    }

    if (activeTab === "auto") {
      return <PlaceholderScreen title="Path Selector" />;
    }

    return <PlaceholderScreen title="Apps" />;
  }, [activeTab]);

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-black text-white">
      <aside className="flex w-[84px] shrink-0 flex-col justify-between bg-[#272727] px-3 py-6">
        <div className="flex flex-col items-center gap-5">
          {LEFT_TABS.slice(0, 2).map((tab) => (
            <TouchRailButton
              key={tab.id}
              active={activeTab === tab.id}
              label={tab.label}
              symbol={tab.symbol}
              activeSymbol={tab.activeSymbol}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
        <div className="flex flex-col items-center gap-5">
          {LEFT_TABS.slice(2).map((tab) => (
            <TouchRailButton
              key={tab.id}
              active={activeTab === tab.id}
              label={tab.label}
              symbol={tab.symbol}
              activeSymbol={tab.activeSymbol}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-black">{content}</main>

      <aside className="flex w-[84px] shrink-0 flex-col justify-between bg-[#272727] px-3 py-6">
        <div className="flex flex-col items-center gap-5">
          {RIGHT_TOGGLE_GROUP.map((toggle) => (
            <TouchRailButton
              key={toggle.id}
              active={toggleSnapshot[toggle.id]}
              label={toggle.label}
              symbol={toggle.symbol}
              activeSymbol={toggle.activeSymbol}
              onClick={() => toggleVisibility(toggle.id)}
            />
          ))}
        </div>
        <div className="flex flex-col items-center gap-5">
          <TouchRailButton
            active={toggleSnapshot[CAMERA_TOGGLE.id]}
            label={CAMERA_TOGGLE.label}
            symbol={CAMERA_TOGGLE.symbol}
            activeSymbol={CAMERA_TOGGLE.activeSymbol}
            onClick={() => toggleVisibility(CAMERA_TOGGLE.id)}
          />
        </div>
      </aside>
    </div>
  );
}
