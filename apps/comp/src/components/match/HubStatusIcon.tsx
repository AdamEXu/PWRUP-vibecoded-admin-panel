"use client";

import type { AimMode } from "@/lib/match/types";
import { COLOR_ORANGE } from "@/lib/match/constants";

interface Props {
  aimMode: AimMode;
  /** Icon size — CSS string e.g. "10.42vw" */
  size?: string;
}

const SF_SYMBOLS: Record<AimMode, { glyph: string; color: string }> = {
  shooter_disabled: { glyph: "􀁎", color: "#3c3c3c" },
  gps_auto: { glyph: "􀎼", color: "#3b82f6" },
  manual_aiming: { glyph: "􀍺", color: COLOR_ORANGE },
};

export function HubStatusIcon({ aimMode, size = "10.42vw" }: Props) {
  const { glyph, color } = SF_SYMBOLS[aimMode];

  return (
    <span
      aria-hidden="true"
      className="sf-symbol select-none"
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
