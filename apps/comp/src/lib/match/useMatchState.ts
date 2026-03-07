"use client";

import { useMemo } from "react";
import { NetworkTablesTypeInfos } from "ntcore-ts-client";
import { NT } from "./constants";
import {
  computeDerivedMatchState,
} from "./matchTimeline";
import { useAutobahnRobotPose } from "./useAutobahnRobotPose";
import { useNTopic } from "./useNTopic";
import type { MatchState } from "./types";

export function useMatchState(): MatchState {
  // ── FMS Topics (standard WPILib — no robot code changes needed) ──────────
  const { value: isRedAlliance, isConnected: conn0 } = useNTopic<boolean>(
    NT.FMS_IS_RED_ALLIANCE,
    NetworkTablesTypeInfos.kBoolean,
    true,
  );
  const { value: gameSpecificMessage, isConnected: conn1 } = useNTopic<string>(
    NT.FMS_GAME_SPECIFIC,
    NetworkTablesTypeInfos.kString,
    "",
  );
  const { value: fmsMatchTime, isConnected: conn2 } = useNTopic<number>(
    NT.FMS_MATCH_TIME,
    NetworkTablesTypeInfos.kDouble,
    -1,
  );
  const { value: fmsControlData, isConnected: conn3 } = useNTopic<number>(
    NT.FMS_CONTROL_DATA,
    NetworkTablesTypeInfos.kInteger,
    0,
  );

  // ── Pose (robot-published) ────────────────────────────────────────────────
  const { value: ntRobotPoseX } = useNTopic<number>(
    NT.POSE_X,
    NetworkTablesTypeInfos.kDouble,
    0,
  );
  const { value: ntRobotPoseY } = useNTopic<number>(
    NT.POSE_Y,
    NetworkTablesTypeInfos.kDouble,
    0,
  );
  const { value: ntRobotHeading } = useNTopic<number>(
    NT.POSE_HEADING,
    NetworkTablesTypeInfos.kDouble,
    0,
  );
  const autobahnPose = useAutobahnRobotPose();
  const robotPoseX = autobahnPose.hasPose ? autobahnPose.x : ntRobotPoseX;
  const robotPoseY = autobahnPose.hasPose ? autobahnPose.y : ntRobotPoseY;
  const robotHeading = autobahnPose.hasPose ? autobahnPose.heading : ntRobotHeading;

  // ── Auto-Align (robot-published) ─────────────────────────────────────────
  const { value: autoAlignActive } = useNTopic<boolean>(
    NT.AUTO_ALIGN_ACTIVE,
    NetworkTablesTypeInfos.kBoolean,
    false,
  );
  const { value: autoAlignDistance } = useNTopic<number>(
    NT.AUTO_ALIGN_DISTANCE,
    NetworkTablesTypeInfos.kDouble,
    0,
  );
  const { value: autoAlignReady } = useNTopic<boolean>(
    NT.AUTO_ALIGN_READY,
    NetworkTablesTypeInfos.kBoolean,
    false,
  );
  const { value: driverOverride } = useNTopic<boolean>(
    NT.DRIVER_OVERRIDE,
    NetworkTablesTypeInfos.kBoolean,
    false,
  );

  const isConnected = conn0 || conn1 || conn2 || conn3;

  // ── Derived state (pure computations) ────────────────────────────────────
  const derived = useMemo(() => {
    return computeDerivedMatchState({
      fmsControlData,
      fmsMatchTime,
      isRedAlliance,
      gameSpecificMessage,
      driverOverride,
      autoAlignActive,
      autoAlignReady,
    });
  }, [
    fmsControlData,
    fmsMatchTime,
    isRedAlliance,
    gameSpecificMessage,
    driverOverride,
    autoAlignActive,
    autoAlignReady,
  ]);

  return {
    isRedAlliance,
    gameSpecificMessage,
    fmsControlData,
    fmsMatchTime,
    robotPoseX,
    robotPoseY,
    robotHeading,
    autoAlignActive,
    autoAlignDistance,
    autoAlignReady,
    driverOverride,
    isConnected,
    ...derived,
  };
}
