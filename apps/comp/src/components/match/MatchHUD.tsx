"use client";

import { useState } from "react";
import { useSettings } from "@/lib/settings";
import { useMatchState } from "@/lib/match/useMatchState";
import { useMockMatchState } from "@/lib/match/useMockMatchState";
import { HeaderBar } from "./HeaderBar";
import { ShiftIndicator } from "./ShiftIndicator";
import { MiniMap } from "./MiniMap";
import { CameraOverlay } from "./CameraOverlay";
import { ConnectionLost } from "./ConnectionLost";

/**
 * Root match HUD — fullscreen, purely reactive to NT data, no interaction.
 *
 * Layout (responsive via vw/vh):
 *   Header bar (16.7vh) — timer centered, colored by alliance/phase
 *   Body row:
 *     Left col (43.75vw) — ShiftIndicator + MiniMap placeholder (flex-1)
 *     Right (30vw)       — CameraOverlay (only when auto-aligning)
 */
export function MatchHUD() {
  const [isMock] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("mock")
  );
  const { hudVisibility } = useSettings();
  const realState = useMatchState();
  const mockState = useMockMatchState();
  const state = isMock ? mockState : realState;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Header bar — colored strip + centered timer */}
      {hudVisibility.showTimers && (
        <HeaderBar
          headerColor={state.headerColor}
          fmsMatchTime={state.fmsMatchTime}
          totalTimeRemaining={state.totalTimeRemaining}
        />
      )}

      {/* Shift indicator — centered at ~31% down */}
      {hudVisibility.showStatus && (
        <ShiftIndicator
          hubStatus={state.hubStatus}
          matchPhase={state.matchPhase}
          periodTimeRemaining={state.fmsMatchTime}
          shiftTimeRemaining={state.shiftTimeRemaining}
          shiftTimeWithBuffer={state.shiftTimeWithBuffer}
          bufferRemaining={state.bufferRemaining}
          showBuffer={state.showBuffer}
          showShiftIndicator={state.showShiftIndicator}
        />
      )}

      {/* Minimap — centered, 28.125% from left, fills to bottom */}
      {hudVisibility.showMap && (
        <MiniMap
          poseX={state.robotPoseX}
          poseY={state.robotPoseY}
          heading={state.robotHeading}
          isRedAlliance={state.isRedAlliance}
        />
      )}

      {/* Camera overlay — top-right, only when auto-aligning */}
      {hudVisibility.showCamera && (
        <CameraOverlay
          active={state.autoAlignActive}
          distanceToTarget={state.autoAlignDistance}
          isReady={state.autoAlignReady}
          cameraTopic={state.cameraTopic}
        />
      )}

      <ConnectionLost visible={!state.isConnected} />
    </div>
  );
}
