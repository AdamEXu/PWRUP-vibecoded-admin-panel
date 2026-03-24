"use client";

import { useEffect, useRef } from "react";
import {
  formatCentiseconds,
  formatMinSec,
  interpolateTime,
} from "@/lib/match/matchTimeline";

function getNowMs() {
  return performance.now();
}

interface Props {
  /** Remaining seconds in current period (from NT) */
  fmsMatchTime: number;
  /** Whether we're currently in autonomous (affects total time calc) */
  totalTimeRemaining: number;
}

/**
 * Smooth countdown timer using requestAnimationFrame.
 *
 * NT publishes MatchTime at ~10Hz. We interpolate locally so the centiseconds
 * tick smoothly rather than jumping every 100ms.
 *
 * Renders as: MM:SS.cc  (large / small sizing via CSS)
 */
export function MainTimer({ fmsMatchTime, totalTimeRemaining }: Props) {
  const minSecRef = useRef<HTMLSpanElement>(null);
  const csRef = useRef<HTMLSpanElement>(null);

  // Track last NT value + timestamp for interpolation
  const lastNTRef = useRef({ value: totalTimeRemaining, timestampMs: 0 });

  // When NT value updates, resync the interpolation anchor
  useEffect(() => {
    lastNTRef.current = { value: totalTimeRemaining, timestampMs: getNowMs() };
  }, [totalTimeRemaining]);

  // RAF loop — directly mutates DOM text (no React re-render)
  useEffect(() => {
    let rafId: number;

    const tick = () => {
      const now = getNowMs();
      const anchorTime = lastNTRef.current.timestampMs || now;
      const interpolated = interpolateTime(
        lastNTRef.current.value,
        anchorTime,
        now,
      );

      if (minSecRef.current) {
        minSecRef.current.textContent = formatMinSec(interpolated);
      }
      if (csRef.current) {
        csRef.current.textContent = formatCentiseconds(interpolated);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Suppress hydration mismatch — initial render uses the NT value directly
  const initialMinSec = fmsMatchTime < 0 ? "--:--" : formatMinSec(totalTimeRemaining);
  const initialCs = fmsMatchTime < 0 ? "" : formatCentiseconds(totalTimeRemaining);

  return (
    <div
      className="flex items-baseline justify-center select-none"
      style={{
        width: "48.85vw",
        textAlign: "center",
        fontFamily: "'Roboto Mono', 'SF Mono', ui-monospace, monospace",
      }}
    >
      <span
        ref={minSecRef}
        style={{ fontSize: "6.67vw", fontWeight: 400, lineHeight: "normal" }}
      >
        {initialMinSec}
      </span>
      <span
        ref={csRef}
        style={{ fontSize: "3.33vw", fontWeight: 400, lineHeight: "normal" }}
        className="text-white"
      >
        {initialCs}
      </span>
    </div>
  );
}
