"use client";

import { useMemo } from "react";
import { NetworkTablesTypeInfos } from "ntcore-ts-client";
import { NT } from "./constants";
import {
  computeHubStatus,
  computeHeaderColor,
  computeMatchPhase,
  computeShiftTimeRemaining,
  computeTotalTimeRemaining,
  getShiftIndex,
  isAutonomous,
} from "./matchTimeline";
import { useNTopic } from "./useNTopic";
import type { MatchState } from "./types";
import { HUB_WARNING_S } from "./constants";

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
  const { value: robotPoseX } = useNTopic<number>(
    NT.POSE_X,
    NetworkTablesTypeInfos.kDouble,
    0,
  );
  const { value: robotPoseY } = useNTopic<number>(
    NT.POSE_Y,
    NetworkTablesTypeInfos.kDouble,
    0,
  );
  const { value: robotHeading } = useNTopic<number>(
    NT.POSE_HEADING,
    NetworkTablesTypeInfos.kDouble,
    0,
  );

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
    const inAuto = isAutonomous(fmsControlData);
    const matchPhase = computeMatchPhase(fmsMatchTime, inAuto);
    const totalTimeRemaining = computeTotalTimeRemaining(fmsMatchTime, inAuto);
    const shiftIndex = getShiftIndex(matchPhase);
    const shiftTimeRemaining = computeShiftTimeRemaining(fmsMatchTime, matchPhase);
    const hubStatus = computeHubStatus(
      matchPhase,
      shiftTimeRemaining,
      shiftIndex,
      isRedAlliance,
      gameSpecificMessage,
    );
    const shiftTimeWithBuffer =
      hubStatus === "warning" ? shiftTimeRemaining + HUB_WARNING_S : shiftTimeRemaining;
    const headerColor = computeHeaderColor(hubStatus, isRedAlliance, matchPhase, driverOverride);

    return {
      matchPhase,
      totalTimeRemaining,
      shiftTimeRemaining,
      shiftTimeWithBuffer,
      hubStatus,
      headerColor,
    };
  }, [
    fmsControlData,
    fmsMatchTime,
    isRedAlliance,
    gameSpecificMessage,
    driverOverride,
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
