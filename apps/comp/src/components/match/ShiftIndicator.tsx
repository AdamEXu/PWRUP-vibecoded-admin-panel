"use client";

import { useEffect, useRef } from "react";
import type { AimMode, HubStatus, MatchPhase } from "@/lib/match/types";
import { HubStatusIcon } from "./HubStatusIcon";

function getNowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

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
    timestampMs: 0,
  });

  useEffect(() => {
    snapshotRef.current = {
      display: baseDisplayTime,
      buffer: baseBufferTime,
      timestampMs: getNowMs(),
    };
  }, [baseDisplayTime, baseBufferTime]);

  // Up-to-date props readable from RAF loop without stale closure
  const liveRef = useRef({ hubStatus, showBuffer });

  useEffect(() => {
    liveRef.current = { hubStatus, showBuffer };
  }, [hubStatus, showBuffer]);

  // DOM refs for imperative text updates — no React re-render per frame
  const intPartRef = useRef<HTMLSpanElement>(null);
  const decPartRef = useRef<HTMLSpanElement>(null);
  const bufferIntRef = useRef<HTMLSpanElement>(null);
  const bufferDecRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let rafId: number;

    const tick = () => {
      const now = getNowMs();
      const { display, buffer, timestampMs } = snapshotRef.current;
      const { hubStatus: liveHubStatus, showBuffer: liveShowBuffer } = liveRef.current;

      const elapsedS = Math.max(0, (now - timestampMs) / 1000);
      const isPostDeactivationBuffer = liveHubStatus === "warning";
      const displayTime = isPostDeactivationBuffer ? 0 : Math.max(0, display - elapsedS);

      const timeStr = displayTime.toFixed(2);
      const dotIdx = timeStr.indexOf(".");
      const intPart = timeStr.slice(0, dotIdx).padStart(2, "0");
      const decPart = timeStr.slice(dotIdx + 1);

      if (intPartRef.current) intPartRef.current.textContent = intPart;
      if (decPartRef.current) decPartRef.current.textContent = "." + decPart;

      if (liveShowBuffer && buffer !== null) {
        const bufferTime = Math.max(0, buffer - elapsedS);
        const bufStr = bufferTime.toFixed(2);
        const bDotIdx = bufStr.indexOf(".");
        const bInt = bufStr.slice(0, bDotIdx).padStart(2, "0");
        const bDec = bufStr.slice(bDotIdx + 1);
        if (bufferIntRef.current) bufferIntRef.current.textContent = bInt;
        if (bufferDecRef.current) bufferDecRef.current.textContent = "." + bDec;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  if (!showShiftIndicator) return null;

  // Initial render values (first RAF tick will overwrite immediately)
  const initialDisplayTime = hubStatus === "warning" ? 0 : Math.max(0, baseDisplayTime);
  const initialTimeStr = initialDisplayTime.toFixed(2);
  const [rawInitInt, initDec] = initialTimeStr.split(".");
  const initialIntPart = rawInitInt.padStart(2, "0");

  const initialBufferStr = showBuffer && baseBufferTime !== null ? baseBufferTime.toFixed(2) : null;
  const [rawInitBufInt, initBufDec] = initialBufferStr ? initialBufferStr.split(".") : [];
  const initialBufInt = rawInitBufInt ? rawInitBufInt.padStart(2, "0") : "";

  return (
    <>
      {/* Buffer text: always above the main timer (Figma) */}
      {initialBufferStr !== null && (
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
          <span ref={bufferIntRef}>{initialBufInt}</span>
          <span ref={bufferDecRef}>.{initBufDec}</span>
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
            ref={intPartRef}
            className="text-white select-none"
            style={{
              fontFamily: "'Roboto Mono', monospace",
              fontSize: "6.67vw",
              fontWeight: 400,
              lineHeight: "normal",
            }}
          >
            {initialIntPart}
          </span>
          {/* Decimal part — half size */}
          <span
            ref={decPartRef}
            className="text-white select-none"
            style={{
              fontFamily: "'Roboto Mono', monospace",
              fontSize: "3.33vw",
              fontWeight: 400,
              lineHeight: "normal",
            }}
          >
            .{initDec}
          </span>
        </p>
      </div>
    </>
  );
}
