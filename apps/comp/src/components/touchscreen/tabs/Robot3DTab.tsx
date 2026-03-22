"use client";

import { RobotViewer } from "@/components/robot3d/RobotViewer";
import { useRobotJoints, primaryJoints } from "@/components/robot3d/useRobotJoints";
import { useMatchState } from "@/lib/match/useMatchState";
import rigConfig from "../../../../public/cad/robot-rig.json";

export function Robot3DTab() {
  const { jointValues, resolvedValues, liveNtByJoint, manualValues, setManualValues } =
    useRobotJoints();
  const { isRedAlliance } = useMatchState();

  return (
    <div className="flex h-full w-full gap-2 overflow-hidden p-2">
      {/* 3D viewport */}
      <div className="min-w-0 flex-1 overflow-hidden rounded-xl bg-black/30">
        <RobotViewer modelUrl={`/${rigConfig.model}`} joints={jointValues} isRedAlliance={isRedAlliance} />
      </div>

      {/* Debug sliders */}
      <div className="flex w-52 shrink-0 flex-col gap-3 overflow-y-auto rounded-xl bg-black/40 p-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
          Joints
        </p>
        <p className="text-[10px] leading-4 text-white/35">
          NT-backed joints use live robot values when connected and fall back to sliders when not.
        </p>
        {primaryJoints.map(([key, joint]) => (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-white/60">
              <span>{joint.debugSlider!.label}</span>
              <span>{(resolvedValues[key] ?? 0).toFixed(2)}</span>
            </div>
            {joint.ntTopic ? (
              <p className="truncate text-[10px] text-white/30">
                {liveNtByJoint[key] ? "NT live" : "Manual fallback"}: {joint.ntTopic}
              </p>
            ) : null}
            <input
              type="range"
              min={joint.limits.min}
              max={joint.limits.max}
              step={joint.debugSlider!.step}
              value={manualValues[key] ?? 0}
              disabled={liveNtByJoint[key]}
              onChange={(e) =>
                setManualValues((prev) => ({
                  ...prev,
                  [key]: parseFloat(e.target.value),
                }))
              }
              className="w-full accent-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
            />
            <button
              onClick={() =>
                setManualValues((prev) => ({ ...prev, [key]: joint.defaultValue ?? 0 }))
              }
              className="text-left text-[10px] text-white/30 hover:text-white/60"
            >
              reset
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            setManualValues(
              Object.fromEntries(primaryJoints.map(([key, j]) => [key, j.defaultValue ?? 0])),
            )
          }
          className="mt-auto rounded-lg bg-white/10 py-1.5 text-xs text-white/60 hover:bg-white/20"
        >
          Reset all
        </button>
      </div>
    </div>
  );
}
