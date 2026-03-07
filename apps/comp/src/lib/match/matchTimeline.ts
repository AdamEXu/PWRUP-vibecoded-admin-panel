/**
 * matchTimeline.ts — pure functions, no React or NT dependencies.
 *
 * All match-phase and hub-status logic lives here so it can be unit-tested
 * without any framework dependencies.
 */

import {
  AUTO_DURATION_S,
  FMS_BIT_AUTONOMOUS,
  HUB_BUFFER_S,
  SHIFT_DURATION_S,
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
    case "transition":
    case "endgame":
      return "both"; // Both hubs active

    case "pre_match":
    case "post_match":
      return "none";

    case "shift1":
    case "shift2":
    case "shift3":
    case "shift4": {
      const ourActive = isOurHubActiveThisShift(shiftIndex, isRedAlliance, gameSpecificMessage);
      if (ourActive) return "active";

      // Figma warning state is the post-deactivation buffer at the start of an inactive shift.
      const elapsedInShift = Math.max(0, SHIFT_DURATION_S - shiftTimeRemaining);
      if (elapsedInShift < HUB_BUFFER_S) return "warning";
      return "inactive";
    }

    default:
      return "none";
  }
}

/**
 * "With buffer" value for manual post-deactivation scoring:
 * - active   => remaining shift time + buffer window (Figma behavior)
 * - warning  => remaining post-deactivation buffer only
 * - inactive => countdown to next active time (raw shift timer)
 */
export function computeShiftTimeWithBuffer(
  shiftTimeRemaining: number,
  hubStatus: HubStatus,
): number {
  if (hubStatus === "active") return shiftTimeRemaining + HUB_BUFFER_S;

  if (hubStatus === "warning") {
    const elapsedInShift = Math.max(0, SHIFT_DURATION_S - shiftTimeRemaining);
    return Math.max(0, HUB_BUFFER_S - elapsedInShift);
  }

  return shiftTimeRemaining;
}

/**
 * Compute the header bar color.
 */
export function computeHeaderColor(
  hubStatus: HubStatus,
  phase: MatchPhase,
  driverOverride: boolean,
  autoAlignActive: boolean,
  autoAlignReady: boolean,
): HeaderColor {
  // Purple mode takes precedence in Figma.
  // It appears in autonomous and when auto-align is active but not ready.
  if (phase === "autonomous" || driverOverride || (autoAlignActive && !autoAlignReady)) {
    return "purple";
  }

  switch (hubStatus) {
    case "warning":
      return "yellow";
    case "active":
    case "both":
      return "green";
    case "inactive":
    case "none":
    default:
      return "hidden";
  }
}

interface DerivedMatchStateInput {
  fmsControlData: number;
  fmsMatchTime: number;
  isRedAlliance: boolean;
  gameSpecificMessage: string;
  driverOverride: boolean;
  autoAlignActive: boolean;
  autoAlignReady: boolean;
}

export interface DerivedMatchState {
  matchPhase: MatchPhase;
  totalTimeRemaining: number;
  shiftTimeRemaining: number;
  shiftTimeWithBuffer: number;
  hubStatus: HubStatus;
  headerColor: HeaderColor;
}

/**
 * Single source of truth for derived stage/hub/header state.
 * Both live and mock hooks use this so test behavior matches production behavior.
 */
export function computeDerivedMatchState(input: DerivedMatchStateInput): DerivedMatchState {
  const inAuto = isAutonomous(input.fmsControlData);
  const matchPhase = computeMatchPhase(input.fmsMatchTime, inAuto);
  const totalTimeRemaining = computeTotalTimeRemaining(input.fmsMatchTime, inAuto);
  const shiftIndex = getShiftIndex(matchPhase);
  const shiftTimeRemaining = computeShiftTimeRemaining(input.fmsMatchTime, matchPhase);
  const hubStatus = computeHubStatus(
    matchPhase,
    shiftTimeRemaining,
    shiftIndex,
    input.isRedAlliance,
    input.gameSpecificMessage,
  );
  const shiftTimeWithBuffer = computeShiftTimeWithBuffer(shiftTimeRemaining, hubStatus);
  const headerColor = computeHeaderColor(
    hubStatus,
    matchPhase,
    input.driverOverride,
    input.autoAlignActive,
    input.autoAlignReady,
  );

  return {
    matchPhase,
    totalTimeRemaining,
    shiftTimeRemaining,
    shiftTimeWithBuffer,
    hubStatus,
    headerColor,
  };
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
