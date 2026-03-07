"use client";

import { FIELD_HEIGHT_M, FIELD_WIDTH_M, MINIMAP_H, MINIMAP_W, COLOR_GREEN } from "@/lib/match/constants";

interface Props {
  poseX: number;
  poseY: number;
  heading: number;
  isRedAlliance: boolean;
}

/**
 * MiniMap with multi-layer vignette fade effect matching Figma.
 *
 * Figma structure (1920×1080):
 *   Outer: 840×800 at (540, 480), bg #272727, rounded-top 240px
 *     Shadow overlay: inset 0 4px 120px 40px black
 *     Middle container: rounded-top 240px
 *       Shadow overlay: inset 0 4px 120px 0 black
 *       Inner container: 840×720, rounded-top 240px + bottom 120px
 *         Field image: 840×600
 *         Shadow overlay: inset 0 4px 40px 0 black
 */
export function MiniMap({ poseX, poseY, heading, isRedAlliance }: Props) {
  let pxX = (poseX / FIELD_WIDTH_M) * MINIMAP_W;
  let pxY = (1 - poseY / FIELD_HEIGHT_M) * MINIMAP_H;

  if (isRedAlliance) {
    pxX = MINIMAP_W - pxX;
    pxY = MINIMAP_H - pxY;
  }

  pxX = Math.max(20, Math.min(MINIMAP_W - 20, pxX));
  pxY = Math.max(20, Math.min(MINIMAP_H - 20, pxY));

  // WPILib: CCW positive, 0 = +X. SVG: CW positive, 0 = up.
  const headingDeg = 90 - (heading * 180) / Math.PI;
  const ROBOT_SIZE = 36;

  return (
    <div
      style={{
        position: "absolute",
        left: "28.125%",
        top: "44.44vh",
        bottom: 0,
        width: "43.75vw",
        borderRadius: "12.5vw 12.5vw 0 0",
        overflow: "hidden",
        backgroundColor: "#272727",
      }}
    >
      {/* Middle container */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          overflow: "hidden",
        }}
      >
        {/* Inner container with bottom rounding */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "90%",
            borderRadius: "12.5vw 12.5vw 6.25vw 6.25vw",
            overflow: "hidden",
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
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />

          {/* Robot marker */}
          <div
            style={{
              position: "absolute",
              left: `${(pxX / MINIMAP_W) * 100}%`,
              top: `${(pxY / MINIMAP_H) * 100}%`,
              width: ROBOT_SIZE,
              height: ROBOT_SIZE,
              transform: `translate(-50%, -50%) rotate(${headingDeg}deg)`,
              transformOrigin: "center center",
              pointerEvents: "none",
            }}
          >
            <RobotArrow size={ROBOT_SIZE} />
          </div>

          {/* Innermost shadow: tight glow */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              boxShadow: "inset 0 0.2vw 2.1vw 0 black",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Middle shadow: medium spread */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            boxShadow: "inset 0 0.2vw 6.25vw 0 black",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Outer shadow: heavy spread for dramatic edge fade */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          boxShadow: "inset 0 0.2vw 6.25vw 2.1vw black",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function RobotArrow({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="9" width="18" height="18" rx="3" fill={COLOR_GREEN} opacity="0.9" />
      <path d="M18 2 L24 12 L18 9 L12 12 Z" fill={COLOR_GREEN} />
    </svg>
  );
}
