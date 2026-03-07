"use client";

import type { HubStatus } from "@/lib/match/types";
import { COLOR_GREEN, COLOR_YELLOW } from "@/lib/match/constants";

interface Props {
  status: HubStatus;
  /** Icon size — CSS string e.g. "10.42vw" */
  size?: string;
}

const SF_SYMBOLS: Record<HubStatus, { glyph: string; color: string }> = {
  active: { glyph: "􂀃", color: COLOR_GREEN },
  both: { glyph: "􂀃", color: COLOR_GREEN },
  warning: { glyph: "􂁔", color: COLOR_YELLOW },
  inactive: { glyph: "􂁈", color: "#3c3c3c" },
  none: { glyph: "􂁈", color: "#3c3c3c" },
};

export function HubStatusIcon({ status, size = "10.42vw" }: Props) {
  const { glyph, color } = SF_SYMBOLS[status];

  return (
    <span
      aria-hidden="true"
      className={`sf-symbol select-none${status === "warning" ? " animate-hub-warning" : ""}`}
      style={{
        display: "inline-block",
        fontSize: size,
        color,
        verticalAlign: "baseline",
        lineHeight: "normal",
      }}
    >
      {glyph}
    </span>
  );
}
