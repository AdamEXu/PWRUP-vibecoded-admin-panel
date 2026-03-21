"use client";

import type { ChangeEvent } from "react";
import dynamic from "next/dynamic";
import {
  type NtDebugTopicType,
  type NtDebugTopicValue,
} from "@/lib/debug/ntTopicCatalog";
import { useDeveloperDebugDashboard } from "@/lib/debug/useDeveloperDebugDashboard";
import { writeDebugPose, clearDebugPose as clearDebugPoseOverride } from "@/lib/debug/debugPoseOverride";
import { FieldPositionControl, type FieldPreset } from "./FieldPositionControl";

const Robot3DTab = dynamic(
  () => import("@/components/touchscreen/tabs/Robot3DTab").then((m) => m.Robot3DTab),
  { ssr: false, loading: () => <div className="flex h-96 items-center justify-center text-sm text-zinc-500">Loading 3D viewer…</div> },
);

function formatValue(value: NtDebugTopicValue, type: NtDebugTopicType): string {
  if (type === "string") {
    return `"${String(value)}"`;
  }
  if (type === "boolean") {
    return value ? "true" : "false";
  }
  return Number.isFinite(Number(value)) ? String(value) : "NaN";
}

function formatLastUpdated(lastUpdatedMs: number | null): string {
  if (!lastUpdatedMs) {
    return "—";
  }
  return new Date(lastUpdatedMs).toLocaleTimeString();
}

function groupLabel(group: string): string {
  if (group === "match_hud") return "match_hud";
  if (group === "lane_alignment") return "lane_alignment";
  return "pathplanner";
}

function parseNumericOverride(raw: string, type: NtDebugTopicType): number | null {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return type === "integer" ? Math.trunc(parsed) : parsed;
}

interface OverrideInputProps {
  id: string;
  type: NtDebugTopicType;
  hasOverride: boolean;
  overrideValue: NtDebugTopicValue | null;
  setOverride: (topicId: string, value: NtDebugTopicValue) => void;
  clearOverride: (topicId: string) => void;
}

function OverrideInput({
  id,
  type,
  hasOverride,
  overrideValue,
  setOverride,
  clearOverride,
}: OverrideInputProps) {
  if (type === "boolean") {
    const value =
      hasOverride && typeof overrideValue === "boolean"
        ? String(overrideValue)
        : "";

    return (
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (!next) {
            clearOverride(id);
            return;
          }
          setOverride(id, next === "true");
        }}
        className="h-8 w-full rounded border border-zinc-600 bg-zinc-900 px-2 text-xs text-zinc-100"
      >
        <option value="">(none)</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (type === "string") {
    const value =
      hasOverride && typeof overrideValue === "string"
        ? overrideValue
        : "";

    return (
      <input
        value={value}
        onChange={(event) => {
          setOverride(id, event.target.value);
        }}
        placeholder="Override value"
        className="h-8 w-full rounded border border-zinc-600 bg-zinc-900 px-2 text-xs text-zinc-100"
      />
    );
  }

  const value =
    hasOverride && typeof overrideValue === "number"
      ? String(overrideValue)
      : "";

  return (
    <input
      value={value}
      type="number"
      step={type === "integer" ? "1" : "any"}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value;
        if (!raw) {
          clearOverride(id);
          return;
        }

        const parsed = parseNumericOverride(raw, type);
        if (parsed === null) {
          return;
        }
        setOverride(id, parsed);
      }}
      placeholder="Override value"
      className="h-8 w-full rounded border border-zinc-600 bg-zinc-900 px-2 text-xs text-zinc-100"
    />
  );
}

export function DeveloperDebugDashboard() {
  const {
    bridgeAvailable,
    settings,
    rows,
    autobahnConnected,
    ntConnected,
    overrideCount,
    lastOverrideAppliedMs,
    presets,
    mockScenarios,
    mainWindowMockState,
    mockControlsAvailable,
    isMockPending,
    mockError,
    setOverride,
    clearOverride,
    clearAllOverrides,
    applyPreset,
    setMainWindowMockScenario,
  } = useDeveloperDebugDashboard();

  // Extract current effective pose values for the field control
  const getEffective = (id: string): NtDebugTopicValue => {
    const row = rows.find((r) => r.descriptor.id === id);
    return row ? row.effectiveValue : 0;
  };
  const currentPoseX = Number(getEffective("matchHud.robotPoseX")) || 0;
  const currentPoseY = Number(getEffective("matchHud.robotPoseY")) || 0;
  const currentHeading = Number(getEffective("matchHud.robotHeading")) || 0;
  const currentIsRed = Boolean(getEffective("matchHud.isRedAlliance"));

  // Broadcast debug pose to HUD window + update local overrides
  const broadcastPose = (patch: Partial<{
    poseX: number; poseY: number; heading: number;
    isRedAlliance: boolean; phase: number; enabled: boolean;
  }>) => {
    const poseX = patch.poseX ?? currentPoseX;
    const poseY = patch.poseY ?? currentPoseY;
    const heading = patch.heading ?? currentHeading;
    const isRedAlliance = patch.isRedAlliance ?? currentIsRed;
    const phase = patch.phase ?? (Number(getEffective("matchHud.phase")) || 0);
    const enabled = patch.enabled ?? true;

    writeDebugPose({ poseX, poseY, heading, isRedAlliance, phase, enabled, seq: 1, active: true });

    // Also update local overrides for the debug table display
    setOverride("matchHud.robotPoseX", poseX);
    setOverride("matchHud.robotPoseY", poseY);
    setOverride("matchHud.robotHeading", Math.round(heading * 1000) / 1000);
    setOverride("matchHud.isRedAlliance", isRedAlliance);
    setOverride("matchHud.phase", phase);
    setOverride("matchHud.enabled", enabled);
    setOverride("matchHud.seq", 1);
    setOverride("matchHud.connected", true);
  };

  const handlePoseChange = (x: number, y: number) => broadcastPose({ poseX: x, poseY: y });
  const handleHeadingChange = (h: number) => broadcastPose({ heading: h });
  const handleAllianceChange = (isRed: boolean) => broadcastPose({ isRedAlliance: isRed });
  const handleFieldPreset = (preset: FieldPreset) => broadcastPose({
    poseX: preset.poseX,
    poseY: preset.poseY,
    heading: preset.heading,
    isRedAlliance: preset.isRedAlliance,
    phase: preset.phase,
    enabled: preset.enabled,
  });

  return (
    <main className="h-screen overflow-y-auto bg-[#0e1014] text-zinc-100">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 p-4">
        <header className="rounded border border-zinc-800 bg-zinc-900/80 p-4">
          <h1 className="text-lg font-semibold tracking-wide">Developer Debug Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Overrides auto-apply immediately on change. No publish call is made for these overrides.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Last local override change: {formatLastUpdated(lastOverrideAppliedMs)}
          </p>
        </header>

        <section className="h-[480px] overflow-hidden rounded border border-zinc-800 bg-zinc-900/80">
          <p className="border-b border-zinc-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Robot 3D Preview
          </p>
          <div className="h-[calc(100%-33px)]">
            <Robot3DTab />
          </div>
        </section>

        <section className="rounded border border-zinc-800 bg-zinc-900/80 p-3">
          <FieldPositionControl
            poseX={currentPoseX}
            poseY={currentPoseY}
            heading={currentHeading}
            isRedAlliance={currentIsRed}
            onPoseChange={handlePoseChange}
            onHeadingChange={handleHeadingChange}
            onAllianceChange={handleAllianceChange}
            onApplyPreset={handleFieldPreset}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr),minmax(320px,420px)]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded border border-zinc-800 bg-zinc-900/80 p-3">
              <p className="text-xs uppercase tracking-wider text-zinc-400">Bridge Runtime</p>
              <p className="mt-2 text-sm font-medium">{bridgeAvailable ? "Available" : "Unavailable"}</p>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/80 p-3">
              <p className="text-xs uppercase tracking-wider text-zinc-400">NetworkTables</p>
              <p className="mt-2 text-sm font-medium">{ntConnected ? "Connected" : "Disconnected"}</p>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/80 p-3">
              <p className="text-xs uppercase tracking-wider text-zinc-400">Autobahn</p>
              <p className="mt-2 text-sm font-medium">{autobahnConnected ? "Connected" : "Disconnected"}</p>
            </div>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/80 p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-zinc-400">Connection Settings Snapshot</p>
            <pre className="max-h-40 overflow-auto rounded bg-black/40 p-2 text-[11px] leading-4 text-zinc-200">
              {JSON.stringify(settings, null, 2)}
            </pre>
          </div>
        </section>

        <section className="rounded border border-zinc-800 bg-zinc-900/80 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Main HUD Mock Mode</p>
              <p className="text-xs text-zinc-400">
                Current: {mainWindowMockState.enabled ? mainWindowMockState.scenario : "disabled"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void setMainWindowMockScenario(null);
              }}
              disabled={!mockControlsAvailable || isMockPending}
              className="h-8 rounded border border-zinc-600 px-3 text-xs text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Disable Mock
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {mockScenarios.map((scenario) => (
              <button
                key={scenario}
                type="button"
                onClick={() => {
                  void setMainWindowMockScenario(scenario);
                }}
                disabled={!mockControlsAvailable || isMockPending}
                className={[
                  "h-8 rounded border px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40",
                  mainWindowMockState.scenario === scenario
                    ? "border-[#70cd35] bg-[#70cd35]/15 text-[#70cd35]"
                    : "border-zinc-600 text-zinc-100",
                ].join(" ")}
              >
                {scenario}
              </button>
            ))}
          </div>
          {mainWindowMockState.url && (
            <p className="mt-2 break-all font-mono text-[11px] text-zinc-500">
              URL: {mainWindowMockState.url}
            </p>
          )}
          {mockError && (
            <p className="mt-2 text-xs text-rose-400">Mock control error: {mockError}</p>
          )}
          {!mockControlsAvailable && (
            <p className="mt-2 text-xs text-amber-300">
              Restart Electron once so the new preload bridge methods are available.
            </p>
          )}
        </section>

        <section className="rounded border border-zinc-800 bg-zinc-900/80 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Testing Presets</p>
              <p className="text-xs text-zinc-400">
                Presets replace current overrides and apply immediately.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { clearAllOverrides(); clearDebugPoseOverride(); }}
              disabled={overrideCount === 0}
              className="h-8 rounded border border-zinc-600 px-3 text-xs text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear All Overrides
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 xl:grid-cols-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="rounded border border-zinc-800 bg-black/20 p-2"
              >
                <p className="text-xs font-semibold text-zinc-100">{preset.label}</p>
                <p className="mt-1 text-[11px] text-zinc-400">{preset.description}</p>
                <button
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className="mt-2 h-7 rounded border border-zinc-600 px-2 text-[11px] text-zinc-100"
                >
                  Apply Preset
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded border border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center justify-between border-b border-zinc-800 p-3">
            <div>
              <p className="text-sm font-semibold">NetworkTables Topic Overrides</p>
              <p className="text-xs text-zinc-400">
                Topics tracked: {rows.length} · Active overrides: {overrideCount}
              </p>
            </div>
          </div>

          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full min-w-[1360px] border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-zinc-950 backdrop-blur-lg">
                <tr className="border-b border-zinc-800 text-zinc-300">
                  <th className="px-3 py-2 font-medium">Topic</th>
                  <th className="px-3 py-2 font-medium">Group</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Live Value</th>
                  <th className="px-3 py-2 font-medium">Override</th>
                  <th className="px-3 py-2 font-medium">Effective</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">hasValue</th>
                  <th className="px-3 py-2 font-medium">Connected</th>
                  <th className="px-3 py-2 font-medium">Last Updated</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.descriptor.id}
                    className={[
                      "border-b border-zinc-800/70 align-top",
                      row.hasOverride ? "bg-[#122113]" : "",
                    ].join(" ")}
                  >
                    <td className="px-3 py-2 font-mono text-[11px] text-zinc-200">
                      {row.descriptor.topicPath}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {groupLabel(row.descriptor.group)}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {row.descriptor.type}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-zinc-200">
                      {formatValue(row.live.value, row.descriptor.type)}
                    </td>
                    <td className="px-3 py-2">
                      <OverrideInput
                        id={row.descriptor.id}
                        type={row.descriptor.type}
                        hasOverride={row.hasOverride}
                        overrideValue={row.overrideValue}
                        setOverride={setOverride}
                        clearOverride={clearOverride}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-[#70cd35]">
                      {formatValue(row.effectiveValue, row.descriptor.type)}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {row.hasOverride ? "override" : "live"}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {row.live.hasValue ? "true" : "false"}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {row.live.isConnected ? "true" : "false"}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {formatLastUpdated(row.live.lastUpdatedMs)}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => clearOverride(row.descriptor.id)}
                        disabled={!row.hasOverride}
                        className="h-8 rounded border border-zinc-600 px-3 text-xs text-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Clear
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
