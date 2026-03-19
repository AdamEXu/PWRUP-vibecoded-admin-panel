"use client";

import { useEffect, useMemo, useState } from "react";
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

export interface RobotJointsResult {
  jointValues: JointValue[];
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

  return { jointValues, resolvedValues, liveNtByJoint, manualValues, setManualValues };
}
