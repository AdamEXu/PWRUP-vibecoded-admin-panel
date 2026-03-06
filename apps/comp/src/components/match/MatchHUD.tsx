"use client";

import { useMatchState } from "@/lib/match/useMatchState";
import { HeaderBar } from "./HeaderBar";
import { ShiftIndicator } from "./ShiftIndicator";
import { MiniMap } from "./MiniMap";
import { CameraOverlay } from "./CameraOverlay";
import { ConnectionLost } from "./ConnectionLost";

/**
 * Root match HUD component — the entire comp app UI.
 *
 * 1920×1080 absolute-positioned layout (designed for fullscreen Electron).
 * Purely reactive to NT data — no user interaction.
 *
 * Layout at 1920×1080:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  HeaderBar (1920×180) — timer, alliance color / purple      │
 * │─────────────────────────────────────────────────────────────│
 * │  [Hub icon + shift timer + buffer text]  top-left           │
 * │                                                             │
 * │  MiniMap (840×600)           CameraOverlay (576×432)        │
 * │  bottom-left area            top-right (when auto-aligning) │
 * │                                                             │
 * │  [NT Disconnected]           bottom-left corner             │
 * └─────────────────────────────────────────────────────────────┘
 */
export function MatchHUD() {
  const state = useMatchState();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000",
        overflow: "hidden",
      }}
    >
      {/* ── 1. Header bar (timer + alliance color) ──────────────────────── */}
      <HeaderBar
        headerColor={state.headerColor}
        fmsMatchTime={state.fmsMatchTime}
        totalTimeRemaining={state.totalTimeRemaining}
      />

      {/* ── 2. Shift countdown + hub status icon ────────────────────────── */}
      <ShiftIndicator
        hubStatus={state.hubStatus}
        matchPhase={state.matchPhase}
        shiftTimeRemaining={state.shiftTimeRemaining}
        shiftTimeWithBuffer={state.shiftTimeWithBuffer}
      />

      {/* ── 3. Field minimap with robot position ────────────────────────── */}
      <MiniMap
        poseX={state.robotPoseX}
        poseY={state.robotPoseY}
        heading={state.robotHeading}
        isRedAlliance={state.isRedAlliance}
      />

      {/* ── 4. Auto-align camera overlay (only when active) ─────────────── */}
      <CameraOverlay
        active={state.autoAlignActive}
        distanceToTarget={state.autoAlignDistance}
        isReady={state.autoAlignReady}
      />

      {/* ── 5. NT connection lost indicator ─────────────────────────────── */}
      <ConnectionLost visible={!state.isConnected} />
    </div>
  );
}
