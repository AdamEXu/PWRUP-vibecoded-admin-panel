"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

interface TouchHintProps {
  type: "orbit" | "scroll";
  onDismiss?: () => void;
}

export function TouchHint({ type, onDismiss }: TouchHintProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (type !== "orbit") return;

    const key = "demo_orbit_hint";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    setVisible(true);
    const t = setTimeout(() => { setVisible(false); onDismiss?.(); }, 4000);
    return () => clearTimeout(t);
  }, [type, onDismiss]);

  if (type !== "orbit" || !visible) return null;

  return (
    <div
      className="fixed z-25 pointer-events-none animate-fade-in"
      style={{
        top: "38%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div className="animate-orbit" style={{
        color: "rgba(112,205,53,0.65)",
        filter: "drop-shadow(0 0 8px rgba(112,205,53,0.4))",
      }}>
        <RefreshCw size={28} strokeWidth={1.5} />
      </div>
      <span style={{
        fontFamily: "var(--f-inter)",
        fontSize: "0.7rem",
        letterSpacing: "0.15em",
        color: "rgba(112,205,53,0.55)",
        textTransform: "uppercase",
      }}>
        Drag to orbit
      </span>
    </div>
  );
}
