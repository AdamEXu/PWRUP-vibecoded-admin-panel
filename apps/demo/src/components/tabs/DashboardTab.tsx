"use client";

import { useState } from "react";
import { Monitor } from "lucide-react";

const FEATURES = [
  {
    title: "Live robot state",
    body: "Subsystem readouts and match timer via NetworkTables — joints, auto selector, match phase.",
  },
  {
    title: "3D field map",
    body: "Robot position overlaid on the field model in real time using AprilTag vision.",
  },
  {
    title: "Autonomous builder",
    body: "Drag-and-drop routine selector with live path preview on the field.",
  },
  {
    title: "Touchscreen panels",
    body: "Separate views for drive coach and operator — this app runs on an iPad during competition.",
  },
];

export function DashboardTab() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Screenshot placeholder — tap to toggle between features */}
      <div
        style={{
          height: 140,
          borderRadius: 12,
          background: "var(--card)",
          border: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Monitor size={26} color="var(--text-3)" />
        <span style={{
          fontFamily: "var(--f-inter)",
          fontSize: "0.75rem",
          color: "var(--text-3)",
          textAlign: "center",
          lineHeight: 1.5,
        }}>
          Drop a screenshot into{"\n"}public/media/images/dashboard/
        </span>
      </div>

      <p style={{
        fontFamily: "var(--f-inter)",
        fontSize: "0.95rem",
        lineHeight: 1.65,
        color: "var(--text-2)",
      }}>
        Our dashboard is built in-house on this same codebase. It runs as a custom Electron app during competition.
      </p>

      {/* Tappable feature list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {FEATURES.map((f, i) => (
          <button
            key={i}
            onPointerDown={() => setActive(active === i ? null : i)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "14px 16px",
              borderRadius: 10,
              background: active === i ? "var(--card)" : "transparent",
              border: "1px solid",
              borderColor: active === i ? "var(--line)" : "transparent",
              cursor: "pointer",
              transition: "background 150ms ease, border-color 150ms ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: active === i ? "var(--green)" : "var(--text-3)",
                transition: "background 150ms ease",
              }} />
              <span style={{
                fontFamily: "var(--f-inter)",
                fontSize: "0.9rem",
                fontWeight: 500,
                color: "var(--text-1)",
              }}>
                {f.title}
              </span>
            </div>
            {active === i && (
              <p style={{
                fontFamily: "var(--f-inter)",
                fontSize: "0.82rem",
                lineHeight: 1.6,
                color: "var(--text-2)",
                marginTop: 8,
                paddingLeft: 14,
              }}>
                {f.body}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
