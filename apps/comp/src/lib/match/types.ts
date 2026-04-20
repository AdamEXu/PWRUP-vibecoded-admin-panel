export type MatchPhase =
  | "pre_match"
  | "autonomous"
  | "transition"
  | "shift1"
  | "shift2"
  | "shift3"
  | "shift4"
  | "endgame"
  | "post_match";

/** Whether our hub is accepting fuel right now */
export type HubStatus =
  | "active"    // Hub is on — score now
  | "warning"   // Hub just deactivated; buffer scoring window still active
  | "inactive"  // Hub is off — opponent's turn
  | "both"      // Both hubs active (autonomous / transition / endgame)
  | "none";     // Neither hub active (shouldn't happen, fallback)

export type HeaderColor = "green" | "yellow" | "purple" | "hidden";
export type AimMode = "shooter_disabled" | "gps_auto" | "manual_aiming";

export interface MatchState {
  // Published match state
  isRedAlliance: boolean | null;
  /** 'R' = red alliance hub deactivates first; 'B' = blue first; '' = unknown */
  gameSpecificMessage: string;
  /** Synthetic WPILib-style bitmask preserved for compatibility with mock logic. */
  fmsControlData: number;
  /** Remaining seconds in the currently published match phase. */
  fmsMatchTime: number;

  // Auto-align
  autoAlignActive: boolean;
  autoAlignDistance: number;
  autoAlignReady: boolean;
  driverOverride: boolean;
  aimMode: AimMode;

  // Derived
  matchPhase: MatchPhase;
  /** Total seconds remaining across whole match */
  totalTimeRemaining: number;
  /** Seconds remaining in current shift (0 when not in a shift) */
  shiftTimeRemaining: number;
  /** Active-shift time including next buffer, or warning buffer remaining. */
  shiftTimeWithBuffer: number;
  /** Warning buffer countdown from the robot publisher. */
  bufferRemaining: number;
  /** Whether the lower timer block should be rendered. */
  showShiftIndicator: boolean;
  /** Whether the secondary "with buffer" timer should be rendered. */
  showBuffer: boolean;
  hubStatus: HubStatus;
  headerColor: HeaderColor;
  cameraTopic: string;

  isConnected: boolean;
}
