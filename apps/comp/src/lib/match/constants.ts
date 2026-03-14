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
const MATCH_HUD_ROOT = "/matchhud/state";

export const NT = {
  MATCH_HUD_SEQ: `${MATCH_HUD_ROOT}/seq`,
  MATCH_HUD_CONNECTED: `${MATCH_HUD_ROOT}/connected`,
  MATCH_HUD_IS_RED_ALLIANCE: `${MATCH_HUD_ROOT}/is_red_alliance`,
  MATCH_HUD_ENABLED: `${MATCH_HUD_ROOT}/enabled`,
  MATCH_HUD_AUTONOMOUS: `${MATCH_HUD_ROOT}/autonomous`,
  MATCH_HUD_GAME_SPECIFIC: `${MATCH_HUD_ROOT}/game_specific_message`,
  MATCH_HUD_PHASE: `${MATCH_HUD_ROOT}/match_phase`,
  MATCH_HUD_HUB_STATUS: `${MATCH_HUD_ROOT}/hub_status`,
  MATCH_HUD_HEADER_COLOR: `${MATCH_HUD_ROOT}/header_color`,
  MATCH_HUD_TOTAL_TIME: `${MATCH_HUD_ROOT}/total_time_remaining_s`,
  MATCH_HUD_PERIOD_TIME: `${MATCH_HUD_ROOT}/period_time_remaining_s`,
  MATCH_HUD_SHIFT_TIME: `${MATCH_HUD_ROOT}/shift_time_remaining_s`,
  MATCH_HUD_SHIFT_WITH_BUFFER: `${MATCH_HUD_ROOT}/shift_time_with_buffer_s`,
  MATCH_HUD_BUFFER_REMAINING: `${MATCH_HUD_ROOT}/buffer_remaining_s`,
  MATCH_HUD_SHOW_SHIFT_INDICATOR: `${MATCH_HUD_ROOT}/show_shift_indicator`,
  MATCH_HUD_SHOW_BUFFER: `${MATCH_HUD_ROOT}/show_buffer`,
  MATCH_HUD_POSE_X: `${MATCH_HUD_ROOT}/robot_pose_x_m`,
  MATCH_HUD_POSE_Y: `${MATCH_HUD_ROOT}/robot_pose_y_m`,
  MATCH_HUD_HEADING: `${MATCH_HUD_ROOT}/robot_heading_rad`,
  MATCH_HUD_POSE_VALID: `${MATCH_HUD_ROOT}/robot_pose_valid`,
  MATCH_HUD_AUTO_ALIGN_ACTIVE: `${MATCH_HUD_ROOT}/auto_align_active`,
  MATCH_HUD_AUTO_ALIGN_DISTANCE: `${MATCH_HUD_ROOT}/auto_align_distance_m`,
  MATCH_HUD_AUTO_ALIGN_READY: `${MATCH_HUD_ROOT}/auto_align_ready`,
  MATCH_HUD_DRIVER_OVERRIDE: `${MATCH_HUD_ROOT}/driver_override`,
  MATCH_HUD_AIM_MODE: `${MATCH_HUD_ROOT}/aim_mode`,
  MATCH_HUD_CAMERA_TOPIC: `${MATCH_HUD_ROOT}/camera_topic`,
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
