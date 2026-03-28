"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { computeJointsForTab, computeDrivePose } from "@/lib/useTabAnimation";
import type { TabId } from "@/lib/tabs";
import type { JointValue, RobotPose } from "@/lib/useTabAnimation";

interface ScriptedAnimationProps {
  tab: TabId;
  jointValuesRef: React.RefObject<JointValue[]>;
  startTimeRef: React.RefObject<number>;
  robotPoseRef?: React.RefObject<RobotPose | null>;
  onLoop?: () => void;
}

export function ScriptedAnimation({
  tab,
  jointValuesRef,
  startTimeRef,
  robotPoseRef,
  onLoop,
}: ScriptedAnimationProps) {
  const loopedRef = useRef(false);
  const prevTabRef = useRef(tab);

  if (prevTabRef.current !== tab) {
    prevTabRef.current = tab;
    loopedRef.current = false;
    // Clear pose when leaving drive tab
    if (robotPoseRef) robotPoseRef.current = null;
  }

  useFrame(() => {
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    jointValuesRef.current = computeJointsForTab(tab, elapsed);

    // Update robot pose for drive tab
    if (robotPoseRef) {
      robotPoseRef.current = tab === "drive" ? computeDrivePose(elapsed) : null;
    }

    // Signal first loop completion (for REPLAY button)
    if (!loopedRef.current) {
      const loopDuration = getLoopDuration(tab);
      if (loopDuration > 0 && elapsed > loopDuration) {
        loopedRef.current = true;
        onLoop?.();
      }
    }
  });

  return null;
}

function getLoopDuration(tab: TabId): number {
  switch (tab) {
    case "overview": return 8;     // one slow 360° turret spin
    case "intake":   return 4;     // one wrist cycle
    case "climber":  return 5;     // one extend/retract
    case "drive":    return Math.PI * 2 / 0.4; // one full oval lap (~15.7s)
    case "vision":   return 12;    // one oval path lap
    default:         return 0;     // static
  }
}
