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
  | "warning"   // Last 3s before hub deactivates — still scoring, but hurry
  | "inactive"  // Hub is off — opponent's turn
  | "both"      // Both hubs active (autonomous / endgame / transition)
  | "none";     // Neither hub active (shouldn't happen, fallback)

export type HeaderColor = "red" | "blue" | "purple" | "hidden";

export interface MatchState {
  // Raw NT values
  isRedAlliance: boolean;
  /** 'R' = red alliance hub deactivates first; 'B' = blue first; '' = unknown */
  gameSpecificMessage: string;
  /** Bitmask: bit1 = isAutonomous */
  fmsControlData: number;
  /** Remaining time in current period from FMS (seconds, -1 = not in match) */
  fmsMatchTime: number;

  // Robot pose
  robotPoseX: number;
  robotPoseY: number;
  robotHeading: number;

  // Auto-align
  autoAlignActive: boolean;
  autoAlignDistance: number;
  autoAlignReady: boolean;
  driverOverride: boolean;

  // Derived
  matchPhase: MatchPhase;
  /** Total seconds remaining across whole match */
  totalTimeRemaining: number;
  /** Seconds remaining in current shift (0 when not in a shift) */
  shiftTimeRemaining: number;
  /** shiftTimeRemaining + BUFFER_SECONDS when in warning state */
  shiftTimeWithBuffer: number;
  hubStatus: HubStatus;
  headerColor: HeaderColor;

  isConnected: boolean;
}
