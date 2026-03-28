"use client";

import { useRef, useEffect } from "react";
import type { TabId } from "./tabs";

export interface JointValue {
  nodeName: string;
  axis: [number, number, number];
  value: number;
  type: "revolute" | "prismatic";
}

/** Robot world pose for scripted paths (WPILib field coordinates, meters). */
export interface RobotPose {
  x: number;
  z: number;
  heading: number;
}

interface AnimationState {
  t: number; // elapsed time in seconds
  looping: boolean;
  phase: number; // phase offset for loops
}

const TURRET = { nodeName: "TurretRControl",      axis: [0, 1, 0] as [number, number, number], type: "revolute"  as const };
const GEAR   = { nodeName: "TurretGearRControl",  axis: [0, 1, 0] as [number, number, number], type: "revolute"  as const };
const WRIST  = { nodeName: "IndexWristRControl",  axis: [1, 0, 0] as [number, number, number], type: "revolute"  as const };
const CLIMB_I = { nodeName: "ClimberControlInner",axis: [0, 0, 1] as [number, number, number], type: "prismatic" as const };
const CLIMB_O = { nodeName: "ClimberControlOuter",axis: [0, 0, 1] as [number, number, number], type: "prismatic" as const };

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Compute a ping-pong value: 0 → 1 → 0 over period seconds */
function pingPong(t: number, period: number): number {
  const p = (t % period) / period;
  return p < 0.5 ? easeInOut(p * 2) : easeInOut((1 - p) * 2);
}

export function computeJointsForTab(tab: TabId, t: number): JointValue[] {
  switch (tab) {
    case "overview": {
      const angle = t * 0.4; // slow continuous spin
      return [
        { ...TURRET, value: -angle },
        { ...GEAR,   value:  angle },
      ];
    }

    case "intake": {
      // Wrist lowers (0 → -2.22 rad) over 1.5s, holds briefly, rises back — 4s period
      const raw = pingPong(t, 4.0);
      const wristAngle = -2.22 * raw;
      return [
        { ...WRIST, value: wristAngle },
        { ...TURRET, value: 0 },
        { ...GEAR,   value: 0 },
      ];
    }

    case "vision": {
      // Turret tracks a slow spin while robot follows path
      const angle = t * 0.25;
      return [
        { ...TURRET, value: -angle },
        { ...GEAR,   value:  angle },
      ];
    }

    case "climber": {
      // Climber extends (0 → -0.31m) over 2s, retracts — 5s period
      const raw = pingPong(t, 5.0);
      const height = -0.31 * raw;
      return [
        { ...CLIMB_I, value: height },
        { ...CLIMB_O, value: -height },
      ];
    }

    case "drive": {
      // Turret slow spin as a proxy visual (no swerve nodes in rig)
      const angle = t * 0.6;
      return [
        { ...TURRET, value: -angle },
        { ...GEAR,   value:  angle },
      ];
    }

    case "dashboard":
    case "team":
    default:
      return [
        { ...TURRET, value: 0 },
        { ...GEAR,   value: 0 },
        { ...WRIST,  value: 0 },
        { ...CLIMB_I, value: 0 },
        { ...CLIMB_O, value: 0 },
      ];
  }
}

/** Scripted oval path for Vision tab (field coordinates, meters). */
export function computeVisionPose(t: number): RobotPose {
  // Oval: 4m wide, 2m tall, centered at field center (8.27, 4.105)
  const speed = 0.5; // rad/s
  const angle = t * speed;
  const rx = 3.5, rz = 1.5;
  const cx = 8.27, cz = 4.105;
  return {
    x: cx + rx * Math.cos(angle),
    z: cz + rz * Math.sin(angle),
    heading: angle + Math.PI / 2, // tangent to path
  };
}

/** Scripted drive path around the neutral area (field center, WPILib coordinates). */
export function computeDrivePose(t: number): RobotPose {
  const speed = 0.4; // rad/s — slightly slower for a more dramatic show
  const angle = t * speed;
  const rx = 2.5, rz = 1.2; // ~5m × 2.4m oval in the neutral zone
  const cx = 8.27, cz = 4.105; // field center
  return {
    x: cx + rx * Math.cos(angle),
    z: cz + rz * Math.sin(angle),
    heading: angle + Math.PI / 2, // tangent to path
  };
}

/**
 * Hook that returns a ref containing the current joint values for the active tab.
 * The ref is updated every animation frame (via requestAnimationFrame), so Three.js
 * can read from it in useFrame without triggering React re-renders.
 */
export function useTabAnimationRef(tab: TabId): React.RefObject<JointValue[]> {
  const jointValuesRef = useRef<JointValue[]>([]);
  const startTimeRef = useRef<number>(performance.now());
  const prevTabRef = useRef<TabId>(tab);

  useEffect(() => {
    if (prevTabRef.current !== tab) {
      startTimeRef.current = performance.now();
      prevTabRef.current = tab;
    }
  }, [tab]);

  // We return the ref directly; Three.js useFrame will update it.
  // The initial value is computed here so it's not empty on first frame.
  useEffect(() => {
    startTimeRef.current = performance.now();
  }, [tab]);

  // Provide a getter so CameraController / ScriptedAnimation can call it
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const startRef = startTimeRef;

  // Expose a getElapsed helper on the ref object (non-standard but harmless)
  (jointValuesRef as { getElapsed?: () => number }).getElapsed = () =>
    (performance.now() - startRef.current) / 1000;
  (jointValuesRef as { getTab?: () => TabId }).getTab = () => tabRef.current;

  return jointValuesRef;
}
