"use client";

import { useRef } from "react";
import { useAutoAlignCamera } from "@/lib/match/useAutoAlignCamera";
import { COLOR_GREEN, COLOR_ORANGE, COLOR_YELLOW } from "@/lib/match/constants";

interface Props {
  active: boolean;
  distanceToTarget: number;
  isReady: boolean;
}

// Distance ruler lines: each entry is a visual guide overlaid on the camera feed.
// Positions are expressed as a fraction of the frame height (top = 0, bottom = 1).
// Calibrated from the Figma design (576×432 frame):
//   2.0m at y=161 → 37.3%
//   1.5m at y=195 → 45.1%
//   1.0m at y=247 → 57.2%
//   0.5m at y=325 → 75.2%
const DISTANCE_RULERS: { label: string; posY: number; color: string }[] = [
  { label: "2.0m", posY: 0.373, color: COLOR_GREEN },
  { label: "1.5m", posY: 0.451, color: COLOR_YELLOW },
  { label: "1.0m", posY: 0.572, color: COLOR_ORANGE },
  { label: "0.5m", posY: 0.752, color: "#ef4444" },
];

const OVERLAY_W = 576;
const OVERLAY_H = 432;

/**
 * Auto-align camera overlay — visible only when robot is auto-aligning.
 *
 * Shows a grayscale camera feed (via Autobahn protobuf) with distance ruler
 * lines and a status message below.
 */
export function CameraOverlay({ active, distanceToTarget, isReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useAutoAlignCamera(canvasRef, active);

  if (!active) return null;

  const statusText = isReady
    ? "Ready to auto align"
    : `${distanceToTarget.toFixed(1)}m away from target`;

  const statusColor = isReady ? COLOR_GREEN : "#ffffff";

  return (
    <div
      style={{
        position: "absolute",
        top: 200,
        right: 80,
        width: OVERLAY_W,
        zIndex: 20,
      }}
    >
      {/* Camera frame + ruler lines */}
      <div
        style={{
          position: "relative",
          width: OVERLAY_W,
          height: OVERLAY_H,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: "#111",
        }}
      >
        {/* Grayscale canvas for camera feed */}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "grayscale(100%)",
          }}
        />

        {/* Distance ruler lines */}
        {DISTANCE_RULERS.map(({ label, posY, color }) => (
          <div
            key={label}
            style={{
              position: "absolute",
              top: `${posY * 100}%`,
              left: 0,
              right: 0,
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            {/* Line */}
            <div
              style={{
                flex: 1,
                height: 1.5,
                backgroundColor: color,
                opacity: 0.85,
              }}
            />
            {/* Label */}
            <span
              style={{
                color,
                fontSize: 22,
                fontWeight: 600,
                fontFamily: "Inter, system-ui, sans-serif",
                padding: "0 8px",
                letterSpacing: "0.01em",
                textShadow: "0 1px 4px rgba(0,0,0,0.8)",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Status text */}
      <div
        style={{
          marginTop: 10,
          fontSize: 28,
          fontWeight: 500,
          fontFamily: "Inter, system-ui, sans-serif",
          color: statusColor,
          textAlign: "center",
          letterSpacing: "0.01em",
        }}
      >
        {statusText}
      </div>
    </div>
  );
}
