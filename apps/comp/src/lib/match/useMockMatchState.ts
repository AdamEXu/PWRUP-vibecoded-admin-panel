"use client";

import { useState, useEffect, useMemo } from "react";
import type { MatchState } from "./types";
import {
  computeMatchPhase,
  computeTotalTimeRemaining,
  computeShiftTimeRemaining,
  computeHubStatus,
  computeHeaderColor,
  getShiftIndex,
  isAutonomous,
} from "./matchTimeline";
import { HUB_WARNING_S } from "./constants";

type MockScenario = "auto" | "shift1" | "shift2" | "warning" | "endgame" | "camera";

function getScenarioStartTime(scenario: MockScenario): { fmsMatchTime: number; inAuto: boolean } {
  switch (scenario) {
    case "auto":     return { fmsMatchTime: 15,  inAuto: true  };
    case "shift1":   return { fmsMatchTime: 120, inAuto: false };
    case "shift2":   return { fmsMatchTime: 95,  inAuto: false };
    case "warning":  return { fmsMatchTime: 108, inAuto: false }; // shift1 warning zone
    case "endgame":  return { fmsMatchTime: 25,  inAuto: false };
    case "camera":   return { fmsMatchTime: 95,  inAuto: false };
  }
}

/**
 * Simulates a running match for UI development.
 * Activated via ?mock or ?mock=<scenario> in the URL.
 *
 * Scenarios: auto | shift1 (default) | shift2 | warning | endgame | camera
 * Example: http://localhost:3001/?mock=warning
 */
export function useMockMatchState(): MatchState {
  const scenario = useMemo<MockScenario>(() => {
    if (typeof window === "undefined") return "shift1";
    const val = new URLSearchParams(window.location.search).get("mock") ?? "";
    const valid: MockScenario[] = ["auto", "shift1", "shift2", "warning", "endgame", "camera"];
    return valid.includes(val as MockScenario) ? (val as MockScenario) : "shift1";
  }, []);

  const start = useMemo(() => getScenarioStartTime(scenario), [scenario]);

  const [fmsMatchTime, setFmsMatchTime] = useState(start.fmsMatchTime);

  useEffect(() => {
    setFmsMatchTime(start.fmsMatchTime);
    const id = setInterval(() => {
      setFmsMatchTime((t) => Math.max(0, parseFloat((t - 0.1).toFixed(1))));
    }, 100);
    return () => clearInterval(id);
  }, [start]);

  const fmsControlData = start.inAuto ? 0x03 : 0x01; // enabled + auto | enabled teleop
  const isRedAlliance = true;
  const gameSpecificMessage = "R"; // red hub deactivates first
  const driverOverride = false;
  const autoAlignActive = scenario === "camera";

  const inAuto = isAutonomous(fmsControlData);
  const matchPhase = computeMatchPhase(fmsMatchTime, inAuto);
  const totalTimeRemaining = computeTotalTimeRemaining(fmsMatchTime, inAuto);
  const shiftIndex = getShiftIndex(matchPhase);
  const shiftTimeRemaining = computeShiftTimeRemaining(fmsMatchTime, matchPhase);
  const hubStatus = computeHubStatus(matchPhase, shiftTimeRemaining, shiftIndex, isRedAlliance, gameSpecificMessage);
  const shiftTimeWithBuffer = hubStatus === "warning" ? shiftTimeRemaining + HUB_WARNING_S : shiftTimeRemaining;
  const headerColor = computeHeaderColor(hubStatus, isRedAlliance, matchPhase, driverOverride);

  return {
    isRedAlliance,
    gameSpecificMessage,
    fmsControlData,
    fmsMatchTime,
    robotPoseX: 3.5,
    robotPoseY: 4.1,
    robotHeading: 0.5,
    autoAlignActive,
    autoAlignDistance: 1.8,
    autoAlignReady: false,
    driverOverride,
    isConnected: true,
    matchPhase,
    totalTimeRemaining,
    shiftTimeRemaining,
    shiftTimeWithBuffer,
    hubStatus,
    headerColor,
  };
}
