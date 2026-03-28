"use client";

import { useEffect, useRef, useState } from "react";

const TOTAL = 10;
const R = 45;
const CIRC = 2 * Math.PI * R;

interface ResetCountdownProps {
  onComplete: () => void;
  onDismiss: () => void;
}

export function ResetCountdown({ onComplete, onDismiss }: ResetCountdownProps) {
  const [remaining, setRemaining] = useState(TOTAL);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const left = Math.max(0, TOTAL - elapsed);
      setRemaining(Math.ceil(left));
      if (left <= 0) { clearInterval(id); onComplete(); }
    }, 80);
    return () => clearInterval(id);
  }, [onComplete]);

  const progress = remaining / TOTAL;
  const dashOffset = CIRC * (1 - progress);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8"
      style={{
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
      onPointerDown={onDismiss}
    >
      {/* Ring */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={112} height={112} viewBox="0 0 112 112">
          <circle cx={56} cy={56} r={R} fill="none"
            stroke="rgba(255,255,255,0.07)" strokeWidth={5} />
          <circle cx={56} cy={56} r={R} fill="none"
            stroke="var(--green)" strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 80ms linear", filter: "drop-shadow(0 0 6px rgba(112,205,53,0.6))" }}
            transform="rotate(-90 56 56)"
          />
        </svg>
        <span style={{
          position: "absolute",
          fontFamily: "var(--f-mono)",
          fontSize: "2.4rem",
          fontWeight: 500,
          color: "var(--text-1)",
          lineHeight: 1,
        }}>
          {remaining}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <span style={{
          fontFamily: "var(--f-inter)",
          fontSize: "0.85rem",
          color: "var(--text-2)",
          letterSpacing: "0.04em",
        }}>
          Returning to attract screen
        </span>
        <span style={{
          fontFamily: "var(--f-inter)",
          fontSize: "0.72rem",
          color: "rgba(112,205,53,0.6)",
          letterSpacing: "0.08em",
        }}>
          Tap anywhere to continue
        </span>
      </div>
    </div>
  );
}
