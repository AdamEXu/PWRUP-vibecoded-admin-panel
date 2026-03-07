// ─── 2026 REBUILT Match Timings ───────────────────────────────────────────────
//
// Total match: 160 seconds
//   Autonomous : 20s  (MatchTime counts 20→0 during auto)
//   Teleop     : 140s (MatchTime counts 140→0 during teleop)
//     Transition: 10s  (teleop 130–140)
//     Shift 1   : 25s  (teleop 105–130)
//     Shift 2   : 25s  (teleop  80–105)
//     Shift 3   : 25s  (teleop  55– 80)
//     Shift 4   : 25s  (teleop  30– 55)
//     Endgame   : 30s  (teleop   0– 30)
//
// MatchTime from NT = time remaining in the current period (auto or teleop).
// To convert to total remaining: teleop_remaining + (isAuto ? 140 : 0).

export const AUTO_DURATION_S = 20;
export const TELEOP_DURATION_S = 140;
export const TOTAL_MATCH_S = AUTO_DURATION_S + TELEOP_DURATION_S; // 160

// Teleop phase boundaries (seconds remaining in teleop)
export const TRANSITION_END_S = 130; // teleop ends at 130 → transition finished
export const SHIFT1_END_S = 105;
export const SHIFT2_END_S = 80;
export const SHIFT3_END_S = 55;
export const SHIFT4_END_S = 30;
export const ENDGAME_END_S = 0;

/** Manual scoring buffer in seconds after a HUB deactivates. */
export const HUB_BUFFER_S = 3;

/** Duration of each alliance shift in teleop. */
export const SHIFT_DURATION_S = 25;

// ─── NetworkTables Topic Paths ────────────────────────────────────────────────
export const NT = {
  FMS_IS_RED_ALLIANCE: "/FMSInfo/IsRedAlliance",
  FMS_GAME_SPECIFIC: "/FMSInfo/GameSpecificMessage",
  FMS_MATCH_TIME: "/FMSInfo/MatchTime",
  FMS_CONTROL_DATA: "/FMSInfo/FMSControlData",

  POSE_X: "/MatchHUD/RobotPoseX",
  POSE_Y: "/MatchHUD/RobotPoseY",
  POSE_HEADING: "/MatchHUD/RobotHeading",

  AUTO_ALIGN_ACTIVE: "/MatchHUD/AutoAlignActive",
  AUTO_ALIGN_DISTANCE: "/MatchHUD/AutoAlignDistance",
  AUTO_ALIGN_READY: "/MatchHUD/AutoAlignReady",
  DRIVER_OVERRIDE: "/MatchHUD/DriverOverride",
} as const;

// ─── FMSControlData bitmask ───────────────────────────────────────────────────
export const FMS_BIT_ENABLED = 0x01;
export const FMS_BIT_AUTONOMOUS = 0x02;

// ─── Field Dimensions (meters) ────────────────────────────────────────────────
export const FIELD_WIDTH_M = 16.54;
export const FIELD_HEIGHT_M = 8.21;

// ─── MiniMap Display Dimensions (px) ──────────────────────────────────────────
export const MINIMAP_W = 840;
export const MINIMAP_H = 600;

// ─── Colors ───────────────────────────────────────────────────────────────────
export const COLOR_GREEN = "#70cd35";
export const COLOR_ORANGE = "#ff9d00";
export const COLOR_YELLOW = "#ffd900";

// ─── Autobahn camera topic for auto-align overlay ────────────────────────────
export const CAMERA_ALIGN_TOPIC = "camera/front_left/video";

// ─── Autobahn MatchHUD topic ──────────────────────────────────────────────────
export const MATCH_HUD_TOPIC = "matchhud/state";
