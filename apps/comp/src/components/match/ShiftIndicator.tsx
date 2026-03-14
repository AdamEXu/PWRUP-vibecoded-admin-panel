"use client";

import { useEffect, useRef, useState } from "react";
import type { AimMode, HubStatus, MatchPhase } from "@/lib/match/types";
import { HubStatusIcon } from "./HubStatusIcon";

interface Props {
  hubStatus: HubStatus;
  aimMode: AimMode;
  matchPhase: MatchPhase;
  periodTimeRemaining: number;
  shiftTimeRemaining: number;
  shiftTimeWithBuffer: number;
  bufferRemaining: number;
  showBuffer: boolean;
  showShiftIndicator: boolean;
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
  aimMode,
  matchPhase,
  periodTimeRemaining,
  shiftTimeRemaining,
  shiftTimeWithBuffer,
  bufferRemaining,
  showBuffer,
  showShiftIndicator,
}: Props) {
  const nowMs = () =>
    typeof performance !== "undefined" ? performance.now() : Date.now();

  const inEndgame = matchPhase === "endgame";
  const inAuto = matchPhase === "autonomous";
  const inTransition = matchPhase === "transition";
  const inBothHubPeriods = inEndgame || inAuto || inTransition;

  const baseDisplayTime = inBothHubPeriods
    ? Math.max(0, periodTimeRemaining)
    : hubStatus === "warning"
      ? 0
      : shiftTimeRemaining;
  const baseBufferTime = showBuffer
    ? Math.max(0, hubStatus === "warning" ? bufferRemaining : shiftTimeWithBuffer)
    : null;

  const snapshotRef = useRef({
    display: baseDisplayTime,
    buffer: baseBufferTime,
    timestampMs: nowMs(),
  });
  const [frameNowMs, setFrameNowMs] = useState(nowMs);

  useEffect(() => {
    snapshotRef.current = {
      display: baseDisplayTime,
      buffer: baseBufferTime,
      timestampMs: nowMs(),
    };
  }, [baseDisplayTime, baseBufferTime]);

  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      setFrameNowMs(nowMs());
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  if (!showShiftIndicator) return null;

  const elapsedS = Math.max(0, (frameNowMs - snapshotRef.current.timestampMs) / 1000);
  const isPostDeactivationBuffer = hubStatus === "warning";
  const displayTime = isPostDeactivationBuffer
    ? 0
    : Math.max(0, snapshotRef.current.display - elapsedS);
  const bufferTime = showBuffer && snapshotRef.current.buffer !== null
    ? Math.max(0, snapshotRef.current.buffer - elapsedS)
    : null;

  const timeStr = displayTime.toFixed(2);
  const [rawIntPart, decPart] = timeStr.split(".");
  const intPart = rawIntPart.padStart(2, "0");

  const bufferWithStr = bufferTime !== null ? bufferTime.toFixed(2) : null;
  const [rawBufferIntPart, bufferDecPart] = bufferWithStr ? bufferWithStr.split(".") : [];
  const bufferIntPart = rawBufferIntPart ? rawBufferIntPart.padStart(2, "0") : "";

  return (
    <>
      {/* Buffer text: always above the main timer (Figma) */}
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
          {bufferIntPart}.{bufferDecPart}
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
          <HubStatusIcon aimMode={aimMode} size="10.42vw" />
          {/* Match Figma: explicit large-font space between symbol and number */}
          <span
            className="select-none"
            style={{
              fontFamily: "'SF Pro', sans-serif",
              fontSize: "10.42vw",
              lineHeight: "normal",
            }}
          >
            {" "}
          </span>
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
