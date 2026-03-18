"use client";

import { useEffect, useMemo, useState } from "react";
import { NetworkTablesTypeInfos } from "ntcore-ts-client";
import { RobotViewer, type JointValue } from "@/components/robot3d/RobotViewer";
import { hasBridge, subscribeNtTopic } from "@/lib/blitzRenderer";
import rigConfig from "../../../../public/cad/robot-rig.json";

type RigJoint = {
  nodeName: string;
  type: "revolute" | "prismatic";
  axis: [number, number, number];
  limits: { min: number; max: number };
  defaultValue?: number;
  description?: string;
  ntTopic?: string;
  smoothing?: number;
  inputTransform?: { scale: number; offset: number };
  inputWrap?: "signedUnitRotation";
  /** Present on joints shown in the debug slider panel */
  debugSlider?: { label: string; step: number };
  /** Present on joints whose value is derived from another joint */
  link?: { source: string; scale: number; offset: number };
};

type NtJointState = {
  value: number;
  hasValue: boolean;
  isConnected: boolean;
};

const joints = rigConfig.joints as unknown as Record<string, RigJoint>;

// Only joints with debugSlider get a manual control — linked joints are derived
const primaryJoints = Object.entries(joints).filter(([, j]) => j.debugSlider);
const ntBackedJoints = Object.entries(joints).filter(([, j]) => j.ntTopic);
const renderedJoints = Object.entries(joints).filter(([, j]) => j.ntTopic || j.debugSlider || j.link);

function clampJointValue(joint: RigJoint, value: number): number {
  return Math.min(joint.limits.max, Math.max(joint.limits.min, value));
}

function wrapSignedUnitRotation(value: number): number {
  return value - Math.floor(value + 0.5);
}

function transformNtValue(joint: RigJoint, rawValue: number): number {
  let nextValue = rawValue;

  if (joint.inputWrap === "signedUnitRotation") {
    nextValue = wrapSignedUnitRotation(nextValue);
  }

  if (joint.inputTransform) {
    nextValue = nextValue * joint.inputTransform.scale + joint.inputTransform.offset;
  }

  return clampJointValue(joint, nextValue);
}

export function Robot3DTab() {
  const bridgeAvailable = hasBridge();
  const [manualValues, setManualValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(primaryJoints.map(([key, j]) => [key, j.defaultValue ?? 0])),
  );
  const [ntValues, setNtValues] = useState<Record<string, NtJointState>>({});

  useEffect(() => {
    if (!bridgeAvailable) {
      setNtValues((prev) => {
        let changed = false;
        const next: Record<string, NtJointState> = { ...prev };

        ntBackedJoints.forEach(([key]) => {
          const existing = next[key];
          if (existing?.isConnected) {
            next[key] = { ...existing, isConnected: false };
            changed = true;
          }
        });

        return changed ? next : prev;
      });
      return;
    }

    let disposed = false;
    const cleanups: Array<() => void> = [];

    ntBackedJoints.forEach(([key, joint]) => {
      void subscribeNtTopic<number>(
        {
          topicPath: joint.ntTopic!,
          typeInfo: NetworkTablesTypeInfos.kDouble,
          defaultValue: 0,
        },
        (update) => {
          if (disposed) {
            return;
          }

          setNtValues((prev) => ({
            ...prev,
            [key]: {
              value: transformNtValue(joint, Number(update.value)),
              hasValue: update.hasValue,
              isConnected: update.isConnected,
            },
          }));
        },
      ).then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }
        cleanups.push(cleanup);
      });
    });

    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => {
        cleanup();
      });
    };
  }, [bridgeAvailable]);

  const resolvedValues = useMemo(() => {
    const nextValues: Record<string, number> = {};

    Object.entries(joints).forEach(([key, joint]) => {
      if (joint.link) {
        return;
      }

      const ntState = ntValues[key];
      const hasLiveNtValue = Boolean(joint.ntTopic && ntState?.isConnected && ntState.hasValue);
      const fallbackValue = manualValues[key] ?? joint.defaultValue ?? 0;
      nextValues[key] = clampJointValue(joint, hasLiveNtValue ? ntState.value : fallbackValue);
    });

    Object.entries(joints).forEach(([key, joint]) => {
      if (!joint.link) {
        return;
      }

      const sourceValue = nextValues[joint.link.source] ?? 0;
      nextValues[key] = clampJointValue(
        joint,
        sourceValue * joint.link.scale + joint.link.offset,
      );
    });

    return nextValues;
  }, [manualValues, ntValues]);

  const liveNtByJoint = useMemo(
    () =>
      Object.fromEntries(
        ntBackedJoints.map(([key]) => {
          const state = ntValues[key];
          return [key, Boolean(state?.isConnected && state.hasValue)];
        }),
      ) as Record<string, boolean>,
    [ntValues],
  );

  const jointValues: JointValue[] = useMemo(
    () =>
      renderedJoints.map(([key, joint]) => ({
        nodeName: joint.nodeName,
        axis: joint.axis,
        type: joint.type,
        value: resolvedValues[key] ?? joint.defaultValue ?? 0,
      })),
    [resolvedValues],
  );

  return (
    <div className="flex h-full w-full gap-2 overflow-hidden p-2">
      {/* 3D viewport */}
      <div className="min-w-0 flex-1 overflow-hidden rounded-xl bg-black/30">
        <RobotViewer modelUrl={`/${rigConfig.model}`} joints={jointValues} />
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
