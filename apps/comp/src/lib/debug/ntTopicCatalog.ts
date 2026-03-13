"use client";

import { ntSelectedPathTopics } from "@pwrup/shared-core/settings";
import type { NetworkTablesSettings } from "@pwrup/shared-core/settings-schema";
import {
  NetworkTablesTypeInfos,
  type NetworkTablesTypeInfo,
} from "ntcore-ts-client";
import { NT } from "@/lib/match/constants";
import {
  ADJUSTING_VELOCITY_TOPIC,
  SHOULD_ADJUST_VELOCITY_TOPIC,
} from "@/lib/match/laneAlignmentTopics";

export type NtDebugTopicType = "boolean" | "integer" | "double" | "string";
export type NtDebugTopicValue = boolean | number | string;
export type NtDebugTopicGroup = "match_hud" | "lane_alignment" | "pathplanner";

export interface NtDebugTopicDescriptor {
  id: string;
  topicPath: string;
  type: NtDebugTopicType;
  typeInfo: NetworkTablesTypeInfo;
  defaultValue: NtDebugTopicValue;
  group: NtDebugTopicGroup;
}

type NtTopicTemplate = Omit<NtDebugTopicDescriptor, "topicPath"> & {
  topicPath: string;
};

const MATCH_HUD_TOPIC_TEMPLATES: readonly NtTopicTemplate[] = [
  {
    id: "matchHud.seq",
    topicPath: NT.MATCH_HUD_SEQ,
    type: "integer",
    typeInfo: NetworkTablesTypeInfos.kInteger,
    defaultValue: 0,
    group: "match_hud",
  },
  {
    id: "matchHud.connected",
    topicPath: NT.MATCH_HUD_CONNECTED,
    type: "boolean",
    typeInfo: NetworkTablesTypeInfos.kBoolean,
    defaultValue: false,
    group: "match_hud",
  },
  {
    id: "matchHud.isRedAlliance",
    topicPath: NT.MATCH_HUD_IS_RED_ALLIANCE,
    type: "boolean",
    typeInfo: NetworkTablesTypeInfos.kBoolean,
    defaultValue: true,
    group: "match_hud",
  },
  {
    id: "matchHud.enabled",
    topicPath: NT.MATCH_HUD_ENABLED,
    type: "boolean",
    typeInfo: NetworkTablesTypeInfos.kBoolean,
    defaultValue: false,
    group: "match_hud",
  },
  {
    id: "matchHud.autonomous",
    topicPath: NT.MATCH_HUD_AUTONOMOUS,
    type: "boolean",
    typeInfo: NetworkTablesTypeInfos.kBoolean,
    defaultValue: false,
    group: "match_hud",
  },
  {
    id: "matchHud.gameSpecificMessage",
    topicPath: NT.MATCH_HUD_GAME_SPECIFIC,
    type: "string",
    typeInfo: NetworkTablesTypeInfos.kString,
    defaultValue: "",
    group: "match_hud",
  },
  {
    id: "matchHud.phase",
    topicPath: NT.MATCH_HUD_PHASE,
    type: "integer",
    typeInfo: NetworkTablesTypeInfos.kInteger,
    defaultValue: 0,
    group: "match_hud",
  },
  {
    id: "matchHud.hubStatus",
    topicPath: NT.MATCH_HUD_HUB_STATUS,
    type: "integer",
    typeInfo: NetworkTablesTypeInfos.kInteger,
    defaultValue: 0,
    group: "match_hud",
  },
  {
    id: "matchHud.headerColor",
    topicPath: NT.MATCH_HUD_HEADER_COLOR,
    type: "integer",
    typeInfo: NetworkTablesTypeInfos.kInteger,
    defaultValue: 0,
    group: "match_hud",
  },
  {
    id: "matchHud.totalTimeRemaining",
    topicPath: NT.MATCH_HUD_TOTAL_TIME,
    type: "double",
    typeInfo: NetworkTablesTypeInfos.kDouble,
    defaultValue: 0,
    group: "match_hud",
  },
  {
    id: "matchHud.periodTimeRemaining",
    topicPath: NT.MATCH_HUD_PERIOD_TIME,
    type: "double",
    typeInfo: NetworkTablesTypeInfos.kDouble,
    defaultValue: -1,
    group: "match_hud",
  },
  {
    id: "matchHud.shiftTimeRemaining",
    topicPath: NT.MATCH_HUD_SHIFT_TIME,
    type: "double",
    typeInfo: NetworkTablesTypeInfos.kDouble,
    defaultValue: 0,
    group: "match_hud",
  },
  {
    id: "matchHud.shiftTimeWithBuffer",
    topicPath: NT.MATCH_HUD_SHIFT_WITH_BUFFER,
    type: "double",
    typeInfo: NetworkTablesTypeInfos.kDouble,
    defaultValue: 0,
    group: "match_hud",
  },
  {
    id: "matchHud.bufferRemaining",
    topicPath: NT.MATCH_HUD_BUFFER_REMAINING,
    type: "double",
    typeInfo: NetworkTablesTypeInfos.kDouble,
    defaultValue: 0,
    group: "match_hud",
  },
  {
    id: "matchHud.showShiftIndicator",
    topicPath: NT.MATCH_HUD_SHOW_SHIFT_INDICATOR,
    type: "boolean",
    typeInfo: NetworkTablesTypeInfos.kBoolean,
    defaultValue: false,
    group: "match_hud",
  },
  {
    id: "matchHud.showBuffer",
    topicPath: NT.MATCH_HUD_SHOW_BUFFER,
    type: "boolean",
    typeInfo: NetworkTablesTypeInfos.kBoolean,
    defaultValue: false,
    group: "match_hud",
  },
  {
    id: "matchHud.robotPoseX",
    topicPath: NT.MATCH_HUD_POSE_X,
    type: "double",
    typeInfo: NetworkTablesTypeInfos.kDouble,
    defaultValue: 0,
    group: "match_hud",
  },
  {
    id: "matchHud.robotPoseY",
    topicPath: NT.MATCH_HUD_POSE_Y,
    type: "double",
    typeInfo: NetworkTablesTypeInfos.kDouble,
    defaultValue: 0,
    group: "match_hud",
  },
  {
    id: "matchHud.robotHeading",
    topicPath: NT.MATCH_HUD_HEADING,
    type: "double",
    typeInfo: NetworkTablesTypeInfos.kDouble,
    defaultValue: 0,
    group: "match_hud",
  },
  {
    id: "matchHud.robotPoseValid",
    topicPath: NT.MATCH_HUD_POSE_VALID,
    type: "boolean",
    typeInfo: NetworkTablesTypeInfos.kBoolean,
    defaultValue: false,
    group: "match_hud",
  },
  {
    id: "matchHud.autoAlignActive",
    topicPath: NT.MATCH_HUD_AUTO_ALIGN_ACTIVE,
    type: "boolean",
    typeInfo: NetworkTablesTypeInfos.kBoolean,
    defaultValue: false,
    group: "match_hud",
  },
  {
    id: "matchHud.autoAlignDistance",
    topicPath: NT.MATCH_HUD_AUTO_ALIGN_DISTANCE,
    type: "double",
    typeInfo: NetworkTablesTypeInfos.kDouble,
    defaultValue: 0,
    group: "match_hud",
  },
  {
    id: "matchHud.autoAlignReady",
    topicPath: NT.MATCH_HUD_AUTO_ALIGN_READY,
    type: "boolean",
    typeInfo: NetworkTablesTypeInfos.kBoolean,
    defaultValue: false,
    group: "match_hud",
  },
  {
    id: "matchHud.driverOverride",
    topicPath: NT.MATCH_HUD_DRIVER_OVERRIDE,
    type: "boolean",
    typeInfo: NetworkTablesTypeInfos.kBoolean,
    defaultValue: false,
    group: "match_hud",
  },
  {
    id: "matchHud.cameraTopic",
    topicPath: NT.MATCH_HUD_CAMERA_TOPIC,
    type: "string",
    typeInfo: NetworkTablesTypeInfos.kString,
    defaultValue: "",
    group: "match_hud",
  },
];

const LANE_ALIGNMENT_TOPIC_TEMPLATES: readonly NtTopicTemplate[] = [
  {
    id: "laneAlignment.shouldAdjustVelocity",
    topicPath: SHOULD_ADJUST_VELOCITY_TOPIC,
    type: "boolean",
    typeInfo: NetworkTablesTypeInfos.kBoolean,
    defaultValue: false,
    group: "lane_alignment",
  },
  {
    id: "laneAlignment.adjustingVelocity",
    topicPath: ADJUSTING_VELOCITY_TOPIC,
    type: "boolean",
    typeInfo: NetworkTablesTypeInfos.kBoolean,
    defaultValue: false,
    group: "lane_alignment",
  },
];

export function buildNtDebugTopicCatalog(
  networkTables: NetworkTablesSettings,
): NtDebugTopicDescriptor[] {
  const pathTopics = ntSelectedPathTopics(
    networkTables.sharedTable,
    networkTables.selectedPathTopic,
  );

  return [
    ...MATCH_HUD_TOPIC_TEMPLATES,
    ...LANE_ALIGNMENT_TOPIC_TEMPLATES,
    {
      id: "pathplanner.request",
      topicPath: pathTopics.requestTopic,
      type: "string",
      typeInfo: NetworkTablesTypeInfos.kString,
      defaultValue: "NONE",
      group: "pathplanner",
    },
    {
      id: "pathplanner.state",
      topicPath: pathTopics.stateTopic,
      type: "string",
      typeInfo: NetworkTablesTypeInfos.kString,
      defaultValue: "NONE",
      group: "pathplanner",
    },
  ];
}
