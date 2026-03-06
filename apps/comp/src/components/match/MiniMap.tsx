"use client";

import { FIELD_HEIGHT_M, FIELD_WIDTH_M, MINIMAP_H, MINIMAP_W, COLOR_GREEN } from "@/lib/match/constants";

interface Props {
  /** Robot X position in meters, field-relative (WPILib convention: origin at blue wall) */
  poseX: number;
  /** Robot Y position in meters, field-relative */
  poseY: number;
  /** Robot heading in radians, CCW positive (WPILib convention) */
  heading: number;
  /** Whether we're on the red alliance (flips coordinate display) */
  isRedAlliance: boolean;
}

/**
 * 840×600 top-down field minimap.
 *
 * - Rounded pill-shape container (240px top radius, 120px bottom radius)
 * - Field image: /match/field-2026.png (drop it in apps/comp/public/match/)
 * - Robot marker: green arrow SVG at computed position, rotated to heading
 *
 * Coordinate conversion:
 *   WPILib origin = blue alliance wall, bottom-left (viewed from above).
 *   Screen origin = top-left.
 *   pxX = (x / FIELD_W) * MAP_W
 *   pxY = (1 - y / FIELD_H) * MAP_H   ← Y is inverted for screen coords
 *
 * For red alliance, the field is displayed mirrored (robot drives from right side).
 */
export function MiniMap({ poseX, poseY, heading, isRedAlliance }: Props) {
  // Convert field meters → pixel coords in the minimap
  let pxX = (poseX / FIELD_WIDTH_M) * MINIMAP_W;
  let pxY = (1 - poseY / FIELD_HEIGHT_M) * MINIMAP_H;

  // For red alliance, origin is on the right — mirror X
  if (isRedAlliance) {
    pxX = MINIMAP_W - pxX;
    pxY = MINIMAP_H - pxY;
  }

  // Clamp to map bounds with a bit of margin
  pxX = Math.max(20, Math.min(MINIMAP_W - 20, pxX));
  pxY = Math.max(20, Math.min(MINIMAP_H - 20, pxY));

  // WPILib heading: CCW positive, 0 = facing +X (toward opponent wall)
  // SVG rotation: CW positive, 0 = pointing up
  // Convert: SVG_deg = 90 - (heading_rad * 180 / π)  (then CSS rotation)
  const headingDeg = 90 - (heading * 180) / Math.PI;

  const ROBOT_SIZE = 36; // px, half-width of robot marker

  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        top: 370,
        width: MINIMAP_W,
        height: MINIMAP_H,
        borderRadius: "240px 240px 120px 120px",
        overflow: "hidden",
        backgroundColor: "#272727",
        boxShadow: "inset 0 0 40px 8px rgba(0,0,0,0.6)",
        zIndex: 5,
      }}
    >
      {/* Field image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/match/field-2026.png"
        alt="2026 REBUILT field"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          userSelect: "none",
          pointerEvents: "none",
        }}
        onError={(e) => {
          // Hide broken image icon if field image isn't yet available
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />

      {/* Robot position marker */}
      <div
        style={{
          position: "absolute",
          left: pxX - ROBOT_SIZE / 2,
          top: pxY - ROBOT_SIZE / 2,
          width: ROBOT_SIZE,
          height: ROBOT_SIZE,
          transform: `rotate(${headingDeg}deg)`,
          transformOrigin: "center center",
          pointerEvents: "none",
        }}
      >
        <RobotArrow size={ROBOT_SIZE} />
      </div>
    </div>
  );
}

/** Arrow SVG pointing upward (0°) — rotated via parent transform */
function RobotArrow({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Robot body (square) */}
      <rect x="9" y="9" width="18" height="18" rx="3" fill={COLOR_GREEN} opacity="0.9" />
      {/* Heading arrow pointing up */}
      <path
        d="M18 2 L24 12 L18 9 L12 12 Z"
        fill={COLOR_GREEN}
      />
    </svg>
  );
}
