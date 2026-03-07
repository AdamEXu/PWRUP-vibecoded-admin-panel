"use client";

import type { HeaderColor } from "@/lib/match/types";
import { MainTimer } from "./MainTimer";

interface Props {
  headerColor: HeaderColor;
  fmsMatchTime: number;
  totalTimeRemaining: number;
}

const COLOR_MAP: Record<Exclude<HeaderColor, "hidden">, string> = {
  green: "#70cd35",
  yellow: "#ffd900",
  purple: "#a600ff",
};

/**
 * 1920×180 header bar at the top of the HUD.
 *
 * - Colored (green/yellow/purple) per hub state and special modes
 * - Invisible when hub is inactive
 * - Contains the main match countdown timer
 */
export function HeaderBar({ headerColor, fmsMatchTime, totalTimeRemaining }: Props) {
  const isHidden = headerColor === "hidden";
  const bgColor = isHidden ? "transparent" : COLOR_MAP[headerColor];

  return (
    <div
      className="flex items-center justify-center"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "16.67vh",
        backgroundColor: bgColor,
        zIndex: 10,
      }}
    >
      <MainTimer fmsMatchTime={fmsMatchTime} totalTimeRemaining={totalTimeRemaining} />
    </div>
  );
}
