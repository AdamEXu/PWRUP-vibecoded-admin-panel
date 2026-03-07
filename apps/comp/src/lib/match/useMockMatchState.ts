"use client";

import { useState, useEffect, useMemo } from "react";
import type { MatchState } from "./types";
import {
  computeDerivedMatchState,
} from "./matchTimeline";
import {
  AUTO_DURATION_S,
  CAMERA_ALIGN_TOPIC,
  SHIFT1_END_S,
  SHIFT2_END_S,
  SHIFT3_END_S,
  SHIFT4_END_S,
  TELEOP_DURATION_S,
  TRANSITION_END_S,
} from "./constants";

type MockScenario =
  | "autonomous"
  | "transition_shift"
  | "shift1"
  | "shift2"
  | "shift3"
  | "shift4"
  | "endgame"
  | "warning"
  | "inactive"
  | "camera";

const SCENARIO_ALIASES: Record<string, MockScenario> = {
  // Official period names
  autonomous: "autonomous",
  transition_shift: "transition_shift",
  shift1: "shift1",
  shift2: "shift2",
  shift3: "shift3",
  shift4: "shift4",
  endgame: "endgame",

  // URL-friendly variants
  "transition-shift": "transition_shift",
  "end-game": "endgame",

  // Legacy aliases
  auto: "autonomous",
  transition: "transition_shift",
  warning: "warning",
  inactive: "inactive",
  camera: "camera",
};

function parseScenario(raw: string): MockScenario {
  return SCENARIO_ALIASES[raw.toLowerCase()] ?? "autonomous";
}

function getScenarioStartTime(scenario: MockScenario): { fmsMatchTime: number; inAuto: boolean } {
  const transitionMidpoint = (TELEOP_DURATION_S + TRANSITION_END_S) / 2;
  const shift1Midpoint = (TRANSITION_END_S + SHIFT1_END_S) / 2;
  const shift2Midpoint = (SHIFT1_END_S + SHIFT2_END_S) / 2;
  const shift3Midpoint = (SHIFT2_END_S + SHIFT3_END_S) / 2;
  const shift4Midpoint = (SHIFT3_END_S + SHIFT4_END_S) / 2;
  const endgameMidpoint = (SHIFT4_END_S + 0) / 2;

  switch (scenario) {
    case "autonomous": return { fmsMatchTime: AUTO_DURATION_S, inAuto: true };
    case "transition_shift": return { fmsMatchTime: transitionMidpoint, inAuto: false };
    case "shift1": return { fmsMatchTime: shift1Midpoint, inAuto: false };
    case "shift2": return { fmsMatchTime: shift2Midpoint, inAuto: false };
    case "shift3": return { fmsMatchTime: shift3Midpoint, inAuto: false };
    case "shift4": return { fmsMatchTime: shift4Midpoint, inAuto: false };
    case "endgame": return { fmsMatchTime: endgameMidpoint, inAuto: false };
    case "warning": return { fmsMatchTime: TRANSITION_END_S - 2, inAuto: false };
    case "inactive": return { fmsMatchTime: shift1Midpoint, inAuto: false };
    case "camera": return { fmsMatchTime: shift2Midpoint, inAuto: false };
  }
}

function computeMockPeriodTimeRemaining(
  fmsMatchTime: number,
  matchPhase: MatchState["matchPhase"],
): number {
  switch (matchPhase) {
    case "autonomous":
    case "endgame":
      return fmsMatchTime;
    case "transition":
      return Math.max(0, fmsMatchTime - TRANSITION_END_S);
    case "shift1":
      return Math.max(0, fmsMatchTime - SHIFT1_END_S);
    case "shift2":
      return Math.max(0, fmsMatchTime - SHIFT2_END_S);
    case "shift3":
      return Math.max(0, fmsMatchTime - SHIFT3_END_S);
    case "shift4":
      return Math.max(0, fmsMatchTime - SHIFT4_END_S);
    default:
      return -1;
  }
}

function stepMockClock(
  prev: { fmsMatchTime: number; inAuto: boolean },
): { fmsMatchTime: number; inAuto: boolean } {
  const nextTime = Math.max(0, parseFloat((prev.fmsMatchTime - 0.1).toFixed(1)));

  // In mock autonomous flow, FMS transitions to teleop at 0:00 and MatchTime
  // resets to 2:20 (140s) for the next period.
  if (prev.inAuto && nextTime <= 0) {
    return { inAuto: false, fmsMatchTime: TELEOP_DURATION_S };
  }

  return { ...prev, fmsMatchTime: nextTime };
}

/**
 * Simulates a running match for UI development.
 * Activated via ?mock or ?mock=<scenario> in the URL.
 *
 * Official period scenarios:
 *   autonomous (default) | transition_shift | shift1 | shift2 | shift3 | shift4 | endgame
 *
 * Debug scenarios:
 *   warning | inactive | camera
 *
 * Legacy aliases still supported:
 *   auto -> autonomous, transition -> transition_shift
 *
 * Example: http://localhost:3001/?mock=warning
 */
export function useMockMatchState(): MatchState {
  const scenario = useMemo<MockScenario>(() => {
    if (typeof window === "undefined") return "autonomous";
    const val = new URLSearchParams(window.location.search).get("mock") ?? "";
    return parseScenario(val);
  }, []);

  const start = useMemo(() => getScenarioStartTime(scenario), [scenario]);

  const [clock, setClock] = useState(start);

  useEffect(() => {
    setClock(start);
    const id = setInterval(() => {
      setClock((prev) => stepMockClock(prev));
    }, 100);
    return () => clearInterval(id);
  }, [start]);

  const fmsMatchTime = clock.fmsMatchTime;
  const fmsControlData = clock.inAuto ? 0x03 : 0x01; // enabled + auto | enabled teleop
  const isRedAlliance = true;
  const gameSpecificMessage = "R"; // red hub deactivates first
  const driverOverride = false;
  const autoAlignActive = scenario === "camera";
  const autoAlignReady = false;

  const derived = computeDerivedMatchState({
    fmsControlData,
    fmsMatchTime,
    isRedAlliance,
    gameSpecificMessage,
    driverOverride,
    autoAlignActive,
    autoAlignReady,
  });
  const phaseLocalTimeRemaining = computeMockPeriodTimeRemaining(fmsMatchTime, derived.matchPhase);
  const showShiftIndicator = [
    "autonomous",
    "transition",
    "shift1",
    "shift2",
    "shift3",
    "shift4",
    "endgame",
  ].includes(derived.matchPhase);
  const showBuffer = ["shift1", "shift2", "shift3", "shift4"].includes(derived.matchPhase)
    && (derived.hubStatus === "active" || derived.hubStatus === "warning");
  const bufferRemaining = derived.hubStatus === "warning" ? derived.shiftTimeWithBuffer : 0;

  return {
    isRedAlliance,
    gameSpecificMessage,
    fmsControlData,
    fmsMatchTime: phaseLocalTimeRemaining,
    robotPoseX: 3.5,
    robotPoseY: 4.1,
    robotHeading: 0.5,
    autoAlignActive,
    autoAlignDistance: 1.8,
    autoAlignReady,
    driverOverride,
    bufferRemaining,
    showShiftIndicator,
    showBuffer,
    cameraTopic: CAMERA_ALIGN_TOPIC,
    isConnected: true,
    ...derived,
  };
}
