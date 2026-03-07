"use client";

import { useRef } from "react";
import { useAutoAlignCamera } from "@/lib/match/useAutoAlignCamera";
import { COLOR_GREEN, COLOR_ORANGE, COLOR_YELLOW } from "@/lib/match/constants";

interface Props {
  active: boolean;
  distanceToTarget: number;
  isReady: boolean;
}

// Distance ruler overlays from Figma (576×432 camera frame).
// Each ruler is a colored semi-transparent band (not a thin line).
// lineY: center y-position of the horizontal ruler (fraction of frame height)
// bandHeight: height of the colored band (px in Figma, converted to %)
// labelY: bottom-edge of label text (label extends upward via translateY(-100%))
// Bands get thicker as distance decreases (closer = bigger visual emphasis).
const DISTANCE_RULERS: {
  label: string;
  lineY: number;
  labelY: number;
  bandTop: number;   // top of band as fraction
  bandBottom: number; // bottom of band as fraction
  color: string;
  fontSize: string;
}[] = [
  // 2.0m: line at y=220, band 20px tall (210-230), label bottom at 217
  { label: "2.0m", lineY: 220 / 432, labelY: 217 / 432, bandTop: 210 / 432, bandBottom: 230 / 432, color: COLOR_GREEN,  fontSize: "1.04vw" },
  // 1.5m: line at y=257, band 24px tall (243-267), label bottom at 251
  { label: "1.5m", lineY: 257 / 432, labelY: 251 / 432, bandTop: 243 / 432, bandBottom: 267 / 432, color: COLOR_YELLOW, fontSize: "1.25vw" },
  // 1.0m: line at y=310, band 28px tall (292-320), label bottom at 303
  { label: "1.0m", lineY: 310 / 432, labelY: 303 / 432, bandTop: 292 / 432, bandBottom: 320 / 432, color: COLOR_ORANGE, fontSize: "1.875vw" },
  // 0.5m: line at y=390, band 32px tall (368-400), label bottom at 381
  { label: "0.5m", lineY: 390 / 432, labelY: 381 / 432, bandTop: 368 / 432, bandBottom: 400 / 432, color: "#ef4444",    fontSize: "2.5vw"   },
];

/**
 * Auto-align camera overlay — visible only when robot is auto-aligning.
 *
 * Figma (1920×1080): left:1304 top:220 w:576 h:432 rounded:16px
 * Ruler lines are colored semi-transparent bands overlaid on camera feed.
 * Labels sit ABOVE ruler lines, left-aligned at x=7px.
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
        left: "67.9%",
        top: "20.37vh",
        width: "30vw",
      }}
    >
      {/* Camera frame */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "576 / 432",
          borderRadius: "0.83vw",
          overflow: "hidden",
          backgroundColor: "#111",
        }}
      >
        {/* Canvas for camera feed */}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Distance ruler overlay bands + labels */}
        {DISTANCE_RULERS.map(({ label, lineY, labelY, bandTop, bandBottom, color, fontSize }) => (
          <div key={label} style={{ pointerEvents: "none" }}>
            {/* Semi-transparent colored band */}
            <div
              style={{
                position: "absolute",
                top: `${bandTop * 100}%`,
                left: 0,
                right: 0,
                height: `${(bandBottom - bandTop) * 100}%`,
                backgroundColor: color,
                opacity: 0.3,
              }}
            />
            {/* Thin center line (stronger opacity) */}
            <div
              style={{
                position: "absolute",
                top: `${lineY * 100}%`,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: color,
                opacity: 0.9,
              }}
            />
            {/* Label — bottom edge at labelY, text extends upward */}
            <div
              style={{
                position: "absolute",
                top: `${labelY * 100}%`,
                left: "1.2%",
                transform: "translateY(-100%)",
                color,
                fontSize,
                fontWeight: 400,
                fontFamily: "Inter, system-ui, sans-serif",
                lineHeight: "normal",
                textShadow: "0 2px 8px rgba(0,0,0,0.67)",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Status text below camera */}
      <div
        style={{
          marginTop: "0.65vh",
          fontSize: "2.5vw",
          fontWeight: 400,
          fontFamily: "Inter, system-ui, sans-serif",
          color: statusColor,
          lineHeight: "normal",
          textAlign: "left",
        }}
      >
        {statusText}
      </div>
    </div>
  );
}
