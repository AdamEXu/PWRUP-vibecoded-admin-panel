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
 * Shift time indicator — absolutely centered at ~31vh.
 *
 * Figma layout (1920×1080):
 *   Container: 938×239 centered at (960, 335.5) with -translate-50%
 *   Content: all inline — [icon] [space] [integer] [.decimal]
 *   Buffer text: separate absolute element above, aligned with numbers
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

  if (!inShift && !inEndgame && !inAuto) return null;

  const displayTime = inShift ? shiftTimeRemaining : 0;
  const showBuffer = inShift && hubStatus === "warning";

  const timeStr = displayTime.toFixed(2);
  const [intPart, decPart] = timeStr.split(".");

  const bufferWithStr = showBuffer ? shiftTimeWithBuffer.toFixed(2) : null;

  return (
    <>
      {/* Buffer text — positioned above the main indicator */}
      {bufferWithStr !== null && (
        <div
          className="select-none"
          style={{
            position: "absolute",
            left: "50.78%",
            top: "20.74vh",
            fontFamily: "'Roboto Mono', monospace",
            fontSize: "3.33vw",
            fontWeight: 400,
            color: "white",
            lineHeight: "normal",
          }}
        >
          {bufferWithStr}
          <span style={{ fontFamily: "Inter, system-ui, sans-serif" }}> with buffer</span>
        </div>
      )}

      {/* Main indicator — icon + integer + .decimal, all inline */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "31.07vh",
          transform: "translate(-50%, -50%)",
          width: "48.85vw",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          textAlign: "center",
          lineHeight: 0,
          fontSize: 0,
        }}
      >
        <p>
          <HubStatusIcon status={hubStatus} size="10.42vw" />
          {/* Spacer between icon and number */}
          <span style={{ display: "inline-block", width: "1vw" }} />
          {/* Integer part — large */}
          <span
            className="text-white select-none"
            style={{
              fontFamily: "'Roboto Mono', monospace",
              fontSize: "6.67vw",
              fontWeight: 400,
              lineHeight: "normal",
            }}
          >
            {intPart}
          </span>
          {/* Decimal part — half size */}
          <span
            className="text-white select-none"
            style={{
              fontFamily: "'Roboto Mono', monospace",
              fontSize: "3.33vw",
              fontWeight: 400,
              lineHeight: "normal",
            }}
          >
            .{decPart}
          </span>
        </p>
      </div>
    </>
  );
}
