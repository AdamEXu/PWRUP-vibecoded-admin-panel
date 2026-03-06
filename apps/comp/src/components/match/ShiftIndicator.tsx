"use client";

import type { HubStatus, MatchPhase } from "@/lib/match/types";
import { HubStatusIcon } from "./HubStatusIcon";

interface Props {
  hubStatus: HubStatus;
  matchPhase: MatchPhase;
  shiftTimeRemaining: number;
  shiftTimeWithBuffer: number;
}

/**
 * Displays below the header bar:
 *   [Icon]  17.94
 *                  19.94 with buffer   (shown only in warning state)
 *
 * Shows nothing if outside a numbered shift.
 */
export function ShiftIndicator({
  hubStatus,
  matchPhase,
  shiftTimeRemaining,
  shiftTimeWithBuffer,
}: Props) {
  const inShift = ["shift1", "shift2", "shift3", "shift4"].includes(matchPhase);
  const inEndgame = matchPhase === "endgame";
  const inAuto = matchPhase === "autonomous";

  // Show for shifts + endgame + auto (wherever there's meaningful time info)
  if (!inShift && !inEndgame && !inAuto) return null;

  const displayTime = inShift ? shiftTimeRemaining : 0;
  const displayWithBuffer = inShift && hubStatus === "warning" ? shiftTimeWithBuffer : null;

  const timeStr = displayTime.toFixed(2);
  const bufferStr = displayWithBuffer !== null ? displayWithBuffer.toFixed(2) : null;

  return (
    <div
      className="absolute flex flex-col items-start gap-1"
      style={{ top: 200, left: 80, zIndex: 10 }}
    >
      <div className="flex items-center gap-4">
        <HubStatusIcon status={hubStatus} size={56} />
        <span
          className="text-white select-none leading-none"
          style={{
            fontFamily: "'Roboto Mono', monospace",
            fontSize: 96,
            fontWeight: 400,
          }}
        >
          {timeStr}
        </span>
      </div>

      {bufferStr !== null && (
        <div
          className="text-white/60 select-none"
          style={{
            fontFamily: "'Roboto Mono', monospace",
            fontSize: 38,
            fontWeight: 400,
            paddingLeft: 72, // align under the number
          }}
        >
          {bufferStr} with buffer
        </div>
      )}
    </div>
  );
}
