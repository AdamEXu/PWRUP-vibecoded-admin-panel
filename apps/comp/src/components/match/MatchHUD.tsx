"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings";
import { hasBridge, subscribeLaneToastPreview } from "@/lib/blitzRenderer";
import { useLaneAlignmentSignal } from "@/lib/match/useLaneAlignmentSignal";
import { useMatchState } from "@/lib/match/useMatchState";
import { useMockMatchState } from "@/lib/match/useMockMatchState";
import { HeaderBar } from "./HeaderBar";
import { ShiftIndicator } from "./ShiftIndicator";
import { MiniMap } from "./MiniMap";
import { CameraOverlay } from "./CameraOverlay";
import { ConnectionLost } from "./ConnectionLost";

const LANE_ALIGNMENT_TOAST_ID = "lane-alignment-status";
const LANE_ALIGNMENT_SYMBOL = "􀨕";

function showLaneAlignmentToast(
  enabled: boolean,
  options?: {
    preview?: boolean;
    dedupe?: boolean;
  },
) {
  const preview = options?.preview ?? false;
  const dedupe = options?.dedupe ?? true;

  const showToast = enabled ? toast.success : toast.error;

  showToast(
    <span className="inline-flex items-center gap-2">
      <span className="sf-symbol text-[1.05rem] leading-none">{LANE_ALIGNMENT_SYMBOL}</span>
      <span className="font-medium">
        Lane Alignment {enabled ? "ON" : "OFF"}
        {preview ? " (Preview)" : ""}
      </span>
    </span>,
    {
      ...(dedupe ? { id: LANE_ALIGNMENT_TOAST_ID } : {}),
      duration: 1800,
      className: "!bg-[#0a0a0a] !border-[#2a2a2a] !shadow-lg",
    },
  );
}

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
  const laneAlignmentSignal = useLaneAlignmentSignal();
  const hasSeenLaneAlignmentValueRef = useRef(false);
  const lastLaneAlignmentValueRef = useRef<boolean | null>(null);

  const { hudVisibility } = useSettings();
  const realState = useMatchState();
  const mockState = useMockMatchState();
  const state = isMock ? mockState : realState;

  useEffect(() => {
    if (!laneAlignmentSignal.hasValue || laneAlignmentSignal.value === null) {
      return;
    }

    const nextValue = laneAlignmentSignal.value;

    if (!hasSeenLaneAlignmentValueRef.current) {
      hasSeenLaneAlignmentValueRef.current = true;
      lastLaneAlignmentValueRef.current = nextValue;
      return;
    }

    if (lastLaneAlignmentValueRef.current === nextValue) {
      return;
    }

    lastLaneAlignmentValueRef.current = nextValue;
    showLaneAlignmentToast(nextValue);
  }, [
    laneAlignmentSignal.hasValue,
    laneAlignmentSignal.updatedAt,
    laneAlignmentSignal.value,
  ]);

  useEffect(() => {
    if (!hasBridge()) {
      return;
    }

    return subscribeLaneToastPreview((enabled) => {
      const previewValue = Boolean(enabled);
      showLaneAlignmentToast(previewValue, { preview: true, dedupe: false });
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isOptionOrAltN = event.altKey && (
        event.code === "KeyN"
        || key === "n"
        || key === "dead"
      );

      if (event.repeat || !isOptionOrAltN) {
        return;
      }

      event.preventDefault();
      const previewValue = !event.shiftKey;
      showLaneAlignmentToast(previewValue, { preview: true, dedupe: false });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

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
          aimMode={state.aimMode}
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
