"use client";

import { NetworkTablesTypeInfos } from "ntcore-ts-client";
import { NT } from "./constants";
import type { MatchState } from "./types";
import { useNTopic } from "./useNTopic";

function mapMatchPhase(phase: number): MatchState["matchPhase"] {
  switch (phase) {
    case 1:
      return "autonomous";
    case 2:
      return "transition";
    case 3:
      return "shift1";
    case 4:
      return "shift2";
    case 5:
      return "shift3";
    case 6:
      return "shift4";
    case 7:
      return "endgame";
    case 8:
      return "post_match";
    case 0:
    default:
      return "pre_match";
  }
}

function mapHubStatus(status: number): MatchState["hubStatus"] {
  switch (status) {
    case 1:
      return "both";
    case 2:
      return "active";
    case 3:
      return "warning";
    case 4:
      return "inactive";
    case 0:
    default:
      return "none";
  }
}

function mapHeaderColor(color: number): MatchState["headerColor"] {
  switch (color) {
    case 1:
      return "green";
    case 2:
      return "yellow";
    case 3:
      return "purple";
    case 0:
    default:
      return "hidden";
  }
}

export function useMatchState(): MatchState {
  const { value: seq, isConnected: ntConnected } = useNTopic<number>(
    NT.MATCH_HUD_SEQ,
    NetworkTablesTypeInfos.kInteger,
    0,
  );
  const { value: publishedConnected } = useNTopic<boolean>(
    NT.MATCH_HUD_CONNECTED,
    NetworkTablesTypeInfos.kBoolean,
    false,
  );
  const { value: isRedAlliance } = useNTopic<boolean>(
    NT.MATCH_HUD_IS_RED_ALLIANCE,
    NetworkTablesTypeInfos.kBoolean,
    true,
  );
  const { value: enabled } = useNTopic<boolean>(
    NT.MATCH_HUD_ENABLED,
    NetworkTablesTypeInfos.kBoolean,
    false,
  );
  const { value: autonomous } = useNTopic<boolean>(
    NT.MATCH_HUD_AUTONOMOUS,
    NetworkTablesTypeInfos.kBoolean,
    false,
  );
  const { value: gameSpecificMessage } = useNTopic<string>(
    NT.MATCH_HUD_GAME_SPECIFIC,
    NetworkTablesTypeInfos.kString,
    "",
  );
  const { value: phase } = useNTopic<number>(
    NT.MATCH_HUD_PHASE,
    NetworkTablesTypeInfos.kInteger,
    0,
  );
  const { value: hubStatus } = useNTopic<number>(
    NT.MATCH_HUD_HUB_STATUS,
    NetworkTablesTypeInfos.kInteger,
    0,
  );
  const { value: headerColor } = useNTopic<number>(
    NT.MATCH_HUD_HEADER_COLOR,
    NetworkTablesTypeInfos.kInteger,
    0,
  );
  const { value: totalTimeRemaining } = useNTopic<number>(
    NT.MATCH_HUD_TOTAL_TIME,
    NetworkTablesTypeInfos.kDouble,
    0,
  );
  const { value: periodTimeRemaining } = useNTopic<number>(
    NT.MATCH_HUD_PERIOD_TIME,
    NetworkTablesTypeInfos.kDouble,
    -1,
  );
  const { value: shiftTimeRemaining } = useNTopic<number>(
    NT.MATCH_HUD_SHIFT_TIME,
    NetworkTablesTypeInfos.kDouble,
    0,
  );
  const { value: shiftTimeWithBuffer } = useNTopic<number>(
    NT.MATCH_HUD_SHIFT_WITH_BUFFER,
    NetworkTablesTypeInfos.kDouble,
    0,
  );
  const { value: bufferRemaining } = useNTopic<number>(
    NT.MATCH_HUD_BUFFER_REMAINING,
    NetworkTablesTypeInfos.kDouble,
    0,
  );
  const { value: showShiftIndicator } = useNTopic<boolean>(
    NT.MATCH_HUD_SHOW_SHIFT_INDICATOR,
    NetworkTablesTypeInfos.kBoolean,
    false,
  );
  const { value: showBuffer } = useNTopic<boolean>(
    NT.MATCH_HUD_SHOW_BUFFER,
    NetworkTablesTypeInfos.kBoolean,
    false,
  );
  const { value: robotPoseX } = useNTopic<number>(
    NT.MATCH_HUD_POSE_X,
    NetworkTablesTypeInfos.kDouble,
    0,
  );
  const { value: robotPoseY } = useNTopic<number>(
    NT.MATCH_HUD_POSE_Y,
    NetworkTablesTypeInfos.kDouble,
    0,
  );
  const { value: robotHeading } = useNTopic<number>(
    NT.MATCH_HUD_HEADING,
    NetworkTablesTypeInfos.kDouble,
    0,
  );
  const { value: autoAlignActive } = useNTopic<boolean>(
    NT.MATCH_HUD_AUTO_ALIGN_ACTIVE,
    NetworkTablesTypeInfos.kBoolean,
    false,
  );
  const { value: autoAlignDistance } = useNTopic<number>(
    NT.MATCH_HUD_AUTO_ALIGN_DISTANCE,
    NetworkTablesTypeInfos.kDouble,
    0,
  );
  const { value: autoAlignReady } = useNTopic<boolean>(
    NT.MATCH_HUD_AUTO_ALIGN_READY,
    NetworkTablesTypeInfos.kBoolean,
    false,
  );
  const { value: driverOverride } = useNTopic<boolean>(
    NT.MATCH_HUD_DRIVER_OVERRIDE,
    NetworkTablesTypeInfos.kBoolean,
    false,
  );
  const { value: cameraTopic } = useNTopic<string>(
    NT.MATCH_HUD_CAMERA_TOPIC,
    NetworkTablesTypeInfos.kString,
    "",
  );

  const fmsControlData = (enabled ? 0x01 : 0) | (autonomous ? 0x02 : 0);
  const hasMatchHudData = cameraTopic.trim().length > 0 || publishedConnected || seq > 0;

  return {
    isRedAlliance,
    gameSpecificMessage,
    fmsControlData,
    fmsMatchTime: periodTimeRemaining,
    robotPoseX,
    robotPoseY,
    robotHeading,
    autoAlignActive,
    autoAlignDistance,
    autoAlignReady,
    driverOverride,
    matchPhase: mapMatchPhase(phase),
    totalTimeRemaining,
    shiftTimeRemaining,
    shiftTimeWithBuffer,
    bufferRemaining,
    showShiftIndicator,
    showBuffer,
    hubStatus: mapHubStatus(hubStatus),
    headerColor: mapHeaderColor(headerColor),
    cameraTopic,
    isConnected: ntConnected && hasMatchHudData,
  };
}
