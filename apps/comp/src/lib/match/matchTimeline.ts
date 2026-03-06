/**
 * matchTimeline.ts — pure functions, no React or NT dependencies.
 *
 * All match-phase and hub-status logic lives here so it can be unit-tested
 * without any framework dependencies.
 */

import {
  AUTO_DURATION_S,
  FMS_BIT_AUTONOMOUS,
  HUB_WARNING_S,
  SHIFT1_END_S,
  SHIFT2_END_S,
  SHIFT3_END_S,
  SHIFT4_END_S,
  TELEOP_DURATION_S,
  TRANSITION_END_S,
} from "./constants";
import type { HeaderColor, HubStatus, MatchPhase } from "./types";

// ─── Phase Detection ──────────────────────────────────────────────────────────

export function isAutonomous(fmsControlData: number): boolean {
  return (fmsControlData & FMS_BIT_AUTONOMOUS) !== 0;
}

/**
 * Returns which phase we're in.
 *
 * @param fmsMatchTime  Remaining seconds in current period from /FMSInfo/MatchTime
 * @param inAuto        Whether FMSControlData indicates autonomous mode
 */
export function computeMatchPhase(fmsMatchTime: number, inAuto: boolean): MatchPhase {
  if (fmsMatchTime < 0) return "pre_match";

  if (inAuto) return "autonomous";

  // Teleop phases by time remaining
  if (fmsMatchTime > TRANSITION_END_S) return "transition";
  if (fmsMatchTime > SHIFT1_END_S) return "shift1";
  if (fmsMatchTime > SHIFT2_END_S) return "shift2";
  if (fmsMatchTime > SHIFT3_END_S) return "shift3";
  if (fmsMatchTime > SHIFT4_END_S) return "shift4";
  return "endgame";
}

/**
 * Total seconds remaining in the whole match.
 * During auto, adds teleop duration to the remaining auto time.
 */
export function computeTotalTimeRemaining(fmsMatchTime: number, inAuto: boolean): number {
  if (fmsMatchTime < 0) return 0;
  return inAuto ? fmsMatchTime + TELEOP_DURATION_S : fmsMatchTime;
}

// ─── Shift / Hub Logic ────────────────────────────────────────────────────────

/**
 * Returns seconds remaining in the current shift (0 if not in a shift).
 */
export function computeShiftTimeRemaining(fmsMatchTime: number, phase: MatchPhase): number {
  switch (phase) {
    case "shift1":
      return fmsMatchTime - SHIFT1_END_S;
    case "shift2":
      return fmsMatchTime - SHIFT2_END_S;
    case "shift3":
      return fmsMatchTime - SHIFT3_END_S;
    case "shift4":
      return fmsMatchTime - SHIFT4_END_S;
    default:
      return 0;
  }
}

/**
 * Returns the index (1–4) of the current shift, or 0 if not in a numbered shift.
 */
export function getShiftIndex(phase: MatchPhase): number {
  switch (phase) {
    case "shift1": return 1;
    case "shift2": return 2;
    case "shift3": return 3;
    case "shift4": return 4;
    default: return 0;
  }
}

/**
 * During teleop shifts, hubs alternate.
 *
 * gameSpecificMessage from FMS:
 *   'R' → Red hub deactivates first (odd shifts for red)
 *   'B' → Blue hub deactivates first (odd shifts for blue)
 *
 * Example for Red alliance with message 'R':
 *   Shift 1 → Red INACTIVE, Blue ACTIVE   (red goes first)
 *   Shift 2 → Red ACTIVE,   Blue INACTIVE
 *   Shift 3 → Red INACTIVE, Blue ACTIVE
 *   Shift 4 → Red ACTIVE,   Blue INACTIVE
 *
 * Example for Red alliance with message 'B':
 *   Shift 1 → Red ACTIVE,   Blue INACTIVE
 *   Shift 2 → Red INACTIVE, Blue ACTIVE
 *   ...
 *
 * Returns true if OUR hub is active during this shift.
 */
export function isOurHubActiveThisShift(
  shiftIndex: number,
  isRedAlliance: boolean,
  gameSpecificMessage: string,
): boolean {
  if (shiftIndex < 1 || shiftIndex > 4) return false;

  const msgIsRed = gameSpecificMessage.toUpperCase() === "R";
  // alliance whose hub goes inactive FIRST
  const ourAllianceGoesFirstInactive = isRedAlliance ? msgIsRed : !msgIsRed;

  // Odd shifts (1, 3): the "goes first" alliance is inactive
  // Even shifts (2, 4): the "goes first" alliance is active
  const isOddShift = shiftIndex % 2 === 1;
  return ourAllianceGoesFirstInactive ? !isOddShift : isOddShift;
}

/**
 * Compute the hub status for our alliance.
 */
export function computeHubStatus(
  phase: MatchPhase,
  shiftTimeRemaining: number,
  shiftIndex: number,
  isRedAlliance: boolean,
  gameSpecificMessage: string,
): HubStatus {
  switch (phase) {
    case "autonomous":
    case "endgame":
      return "both"; // Both hubs active

    case "transition":
      return "none"; // Neither hub active (brief transition)

    case "pre_match":
    case "post_match":
      return "none";

    case "shift1":
    case "shift2":
    case "shift3":
    case "shift4": {
      const ourActive = isOurHubActiveThisShift(shiftIndex, isRedAlliance, gameSpecificMessage);
      if (!ourActive) return "inactive";

      // Within the warning window before deactivation?
      if (shiftTimeRemaining <= HUB_WARNING_S) return "warning";

      return "active";
    }

    default:
      return "none";
  }
}

/**
 * Compute the header bar color.
 */
export function computeHeaderColor(
  hubStatus: HubStatus,
  isRedAlliance: boolean,
  phase: MatchPhase,
  driverOverride: boolean,
): HeaderColor {
  // Purple: autonomous period, or driver has taken override
  if (phase === "autonomous" || driverOverride) return "purple";

  switch (hubStatus) {
    case "active":
    case "warning":
    case "both":
      return isRedAlliance ? "red" : "blue";
    case "inactive":
    case "none":
    default:
      return "hidden";
  }
}

// ─── Timer Formatting ─────────────────────────────────────────────────────────

/** Format total seconds to "MM:SS" */
export function formatMinSec(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/** Format total seconds to centiseconds part ".cc" */
export function formatCentiseconds(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const cs = Math.floor((safe % 1) * 100);
  return `.${String(cs).padStart(2, "0")}`;
}

/** Interpolate timer: estimate actual current time from last NT update */
export function interpolateTime(
  lastNTValue: number,
  lastNTTimestampMs: number,
  nowMs: number,
): number {
  if (lastNTValue < 0) return 0;
  const elapsedS = (nowMs - lastNTTimestampMs) / 1000;
  return Math.max(0, lastNTValue - elapsedS);
}

// Auto duration export for useMatchState
export { AUTO_DURATION_S };
