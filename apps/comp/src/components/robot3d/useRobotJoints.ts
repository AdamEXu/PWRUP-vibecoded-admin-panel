"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NetworkTablesTypeInfos } from "ntcore-ts-client";
import type { JointValue } from "@/components/robot3d/RobotViewer";
import { hasBridge, subscribeNtTopic } from "@/lib/blitzRenderer";
import rigConfig from "../../../public/cad/robot-rig.json";

export type RigJoint = {
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
  debugSlider?: { label: string; step: number };
  link?: { source: string; scale: number; offset: number };
};

type NtJointState = {
  value: number;
  hasValue: boolean;
  isConnected: boolean;
};

const joints = rigConfig.joints as unknown as Record<string, RigJoint>;

export const primaryJoints = Object.entries(joints).filter(([, j]) => j.debugSlider);
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

// Module-level compute — used both in the React render path (useMemo) and
// the hot NT-callback path (ref update) so the logic stays in one place.
function computeJointValues(
  ntVals: Record<string, NtJointState>,
  manualVals: Record<string, number>,
): JointValue[] {
  const resolved: Record<string, number> = {};

  Object.entries(joints).forEach(([key, joint]) => {
    if (joint.link) return;
    const ntState = ntVals[key];
    const hasLiveNtValue = Boolean(joint.ntTopic && ntState?.isConnected && ntState.hasValue);
    const fallbackValue = manualVals[key] ?? joint.defaultValue ?? 0;
    resolved[key] = clampJointValue(joint, hasLiveNtValue ? ntState.value : fallbackValue);
  });

  Object.entries(joints).forEach(([key, joint]) => {
    if (!joint.link) return;
    const sourceValue = resolved[joint.link.source] ?? 0;
    resolved[key] = clampJointValue(joint, sourceValue * joint.link.scale + joint.link.offset);
  });

  return renderedJoints.map(([key, joint]) => ({
    nodeName: joint.nodeName,
    axis: joint.axis,
    type: joint.type,
    value: resolved[key] ?? joint.defaultValue ?? 0,
  }));
}

export interface RobotJointsRefResult {
  jointValuesRef: React.RefObject<JointValue[]>;
}

/**
 * Lightweight joint hook for render-only views (driver tab, minimap).
 *
 * Subscribes to the same NT topics as useRobotJoints but never calls setState —
 * updates go straight to jointValuesRef so Three.js useFrame reads them without
 * triggering any React re-renders.
 */
export function useRobotJointsRef(): RobotJointsRefResult {
  const bridgeAvailable = hasBridge();
  const ntValuesRef = useRef<Record<string, NtJointState>>({});
  const jointValuesRef = useRef<JointValue[]>([]);

  useEffect(() => {
    if (!bridgeAvailable) return;

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
          if (disposed) return;
          const newState: NtJointState = {
            value: transformNtValue(joint, Number(update.value)),
            hasValue: update.hasValue,
            isConnected: update.isConnected,
          };
          ntValuesRef.current = { ...ntValuesRef.current, [key]: newState };
          // No setState — ref update only, no React re-render
          jointValuesRef.current = computeJointValues(ntValuesRef.current, {});
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
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [bridgeAvailable]);

  return { jointValuesRef };
}

export interface RobotJointsResult {
  jointValues: JointValue[];
  jointValuesRef: React.RefObject<JointValue[]>;
  resolvedValues: Record<string, number>;
  liveNtByJoint: Record<string, boolean>;
  manualValues: Record<string, number>;
  setManualValues: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

export function useRobotJoints(): RobotJointsResult {
  const bridgeAvailable = hasBridge();
  const [manualValues, setManualValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(primaryJoints.map(([key, j]) => [key, j.defaultValue ?? 0])),
  );
  const [ntValues, setNtValues] = useState<Record<string, NtJointState>>({});

  // Refs for the hot render path — updated synchronously in NT callbacks,
  // so useFrame always sees the latest values without waiting for a React re-render.
  const ntValuesRef = useRef<Record<string, NtJointState>>({});
  const manualValuesRef = useRef(manualValues);
  const jointValuesRef = useRef<JointValue[]>([]);

  // When manual slider values change, recompute the ref immediately.
  useEffect(() => {
    manualValuesRef.current = manualValues;
    jointValuesRef.current = computeJointValues(ntValuesRef.current, manualValues);
  }, [manualValues]);

  useEffect(() => {
    if (!bridgeAvailable) {
      ntValuesRef.current = Object.fromEntries(
        ntBackedJoints.map(([key]) => {
          const existing = ntValuesRef.current[key];
          return [
            key,
            existing
              ? { ...existing, isConnected: false }
              : { value: 0, hasValue: false, isConnected: false },
          ];
        }),
      );
      jointValuesRef.current = computeJointValues(ntValuesRef.current, manualValuesRef.current);
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
          if (disposed) return;

          const newState: NtJointState = {
            value: transformNtValue(joint, Number(update.value)),
            hasValue: update.hasValue,
            isConnected: update.isConnected,
          };

          // Hot path: update refs immediately — no React render cycle needed.
          ntValuesRef.current = { ...ntValuesRef.current, [key]: newState };
          jointValuesRef.current = computeJointValues(ntValuesRef.current, manualValuesRef.current);

          // Also update React state so debug UI stays in sync.
          setNtValues((prev) => ({ ...prev, [key]: newState }));
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

  const effectiveNtValues = useMemo(() => {
    if (bridgeAvailable) {
      return ntValues;
    }

    return Object.fromEntries(
      Object.entries(ntValues).map(([key, value]) => [key, { ...value, isConnected: false }]),
    ) as Record<string, NtJointState>;
  }, [bridgeAvailable, ntValues]);

  const resolvedValues = useMemo(() => {
    const nextValues: Record<string, number> = {};

    Object.entries(joints).forEach(([key, joint]) => {
      if (joint.link) {
        return;
      }

      const ntState = effectiveNtValues[key];
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
  }, [effectiveNtValues, manualValues]);

  const liveNtByJoint = useMemo(
    () =>
      Object.fromEntries(
        ntBackedJoints.map(([key]) => {
          const state = effectiveNtValues[key];
          return [key, Boolean(state?.isConnected && state.hasValue)];
        }),
      ) as Record<string, boolean>,
    [effectiveNtValues],
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

  return { jointValues, jointValuesRef, resolvedValues, liveNtByJoint, manualValues, setManualValues };
}
