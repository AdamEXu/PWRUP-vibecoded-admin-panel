"use client";

import type { HubStatus } from "@/lib/match/types";
import { COLOR_GREEN, COLOR_ORANGE } from "@/lib/match/constants";

interface Props {
  status: HubStatus;
  /** Icon size in px */
  size?: number;
}

/**
 * Hub status icon — rendered as inline SVG matching SF Symbol aesthetics.
 *
 * active  → green filled circle with checkmark  (checkmark.circle.fill)
 * warning → yellow/orange ring                  (exclamationmark.circle)  + pulse
 * inactive→ gray X circle                       (xmark.circle.fill)
 * both    → green filled circle with checkmark  (both hubs active)
 * none    → gray X circle
 */
export function HubStatusIcon({ status, size = 56 }: Props) {
  const isWarning = status === "warning";

  return (
    <span className={isWarning ? "animate-hub-warning inline-block" : "inline-block"}>
      {(status === "active" || status === "both") && (
        <ActiveIcon size={size} />
      )}
      {status === "warning" && (
        <WarningIcon size={size} />
      )}
      {(status === "inactive" || status === "none") && (
        <InactiveIcon size={size} />
      )}
    </span>
  );
}

function ActiveIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="28" fill={COLOR_GREEN} />
      <path
        d="M16 28.5L23.5 36L40 20"
        stroke="#000"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="25.5" stroke={COLOR_ORANGE} strokeWidth="5" />
      <path
        d="M28 16V30"
        stroke={COLOR_ORANGE}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="28" cy="39" r="2.5" fill={COLOR_ORANGE} />
    </svg>
  );
}

function InactiveIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="28" fill="#444" />
      <path
        d="M20 20L36 36M36 20L20 36"
        stroke="#888"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
