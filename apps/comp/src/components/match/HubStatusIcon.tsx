"use client";

import type { HubStatus } from "@/lib/match/types";
import { COLOR_GREEN, COLOR_ORANGE } from "@/lib/match/constants";

interface Props {
  status: HubStatus;
  /** Icon size — CSS string e.g. "10.42vw" */
  size?: string;
}

/**
 * Hub status icon — SVG recreation of SF Symbol rendering.
 * Active: large green circle + smaller checkmark badge (bottom-right)
 * Warning: orange circle with exclamation mark
 * Inactive: gray circle with X mark
 *
 * Renders as inline-block to flow with text in ShiftIndicator.
 */
export function HubStatusIcon({ status, size = "10.42vw" }: Props) {
  const isWarning = status === "warning";

  return (
    <span
      className={isWarning ? "animate-hub-warning" : undefined}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        verticalAlign: "middle",
        lineHeight: 0,
      }}
    >
      {(status === "active" || status === "both") && <ActiveIcon />}
      {status === "warning" && <WarningIcon />}
      {(status === "inactive" || status === "none") && <InactiveIcon />}
    </span>
  );
}

/**
 * Matches Figma's checkmark.circle.fill SF Symbol:
 * Large green circle + smaller badge circle at bottom-right with checkmark.
 */
function ActiveIcon() {
  return (
    <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", display: "block" }}>
      {/* Large green circle (background) */}
      <circle cx="38" cy="38" r="38" fill={COLOR_GREEN} />
      {/* Badge circle: dark ring + green fill */}
      <circle cx="74" cy="74" r="25" fill="#1a1a1a" />
      <circle cx="74" cy="74" r="21" fill={COLOR_GREEN} />
      {/* Checkmark inside badge */}
      <path
        d="M63 74 L71 82 L86 66"
        stroke="#1a1a1a"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", display: "block" }}>
      {/* Large orange circle */}
      <circle cx="38" cy="38" r="38" fill={COLOR_ORANGE} />
      {/* Badge circle */}
      <circle cx="74" cy="74" r="25" fill="#1a1a1a" />
      <circle cx="74" cy="74" r="21" fill={COLOR_ORANGE} />
      {/* Exclamation mark */}
      <line x1="74" y1="62" x2="74" y2="77" stroke="#1a1a1a" strokeWidth="5" strokeLinecap="round" />
      <circle cx="74" cy="84" r="2.5" fill="#1a1a1a" />
    </svg>
  );
}

function InactiveIcon() {
  return (
    <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", display: "block" }}>
      {/* Large gray circle */}
      <circle cx="38" cy="38" r="38" fill="#555" />
      {/* Badge circle */}
      <circle cx="74" cy="74" r="25" fill="#1a1a1a" />
      <circle cx="74" cy="74" r="21" fill="#555" />
      {/* X mark */}
      <path
        d="M65 65 L83 83 M83 65 L65 83"
        stroke="#999"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
