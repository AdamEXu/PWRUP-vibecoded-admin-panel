"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as THREE from "three";
import type { CameraSetpoint } from "@/lib/cameraSetpoints";

const TRANSITION_DURATION = 0.4; // seconds
const SNAP_BACK_DELAY = 1.0;     // seconds of orbit idle before snap-back

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface CameraControllerProps {
  setpoint: CameraSetpoint;
  /** Called when user starts orbiting (for hint dismissal) */
  onOrbitStart?: () => void;
}

export function CameraController({ setpoint, onOrbitStart }: CameraControllerProps) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const phaseRef = useRef<"transitioning" | "orbit" | "snapback">("transitioning");
  const transitionRef = useRef({ t: 0, from: { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 50 } });
  const orbitIdleRef = useRef(0);
  const onOrbitStartRef = useRef(onOrbitStart);
  onOrbitStartRef.current = onOrbitStart;

  // Target setpoint as refs for useFrame
  const setpointRef = useRef(setpoint);
  setpointRef.current = setpoint;

  // On setpoint change → start transition
  const prevSetpointRef = useRef(setpoint);
  if (prevSetpointRef.current !== setpoint) {
    prevSetpointRef.current = setpoint;
    phaseRef.current = "transitioning";
    transitionRef.current.t = 0;
    transitionRef.current.from.pos.copy(camera.position);
    if (controlsRef.current) {
      transitionRef.current.from.target.copy(controlsRef.current.target);
    } else {
      transitionRef.current.from.target.set(0, 0.25, 0);
    }
    transitionRef.current.from.fov = (camera as THREE.PerspectiveCamera).fov;
    if (controlsRef.current) controlsRef.current.enabled = false;
  }

  // Set up OrbitControls
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.3;
    controls.maxDistance = 8;
    controls.enabled = false; // starts disabled; enabled after first transition
    controlsRef.current = controls;

    const handleStart = () => {
      if (phaseRef.current === "orbit") {
        orbitIdleRef.current = 0;
        onOrbitStartRef.current?.();
      }
    };
    const handleChange = () => {
      orbitIdleRef.current = 0;
    };

    controls.addEventListener("start", handleStart);
    controls.addEventListener("change", handleChange);

    return () => {
      controls.removeEventListener("start", handleStart);
      controls.removeEventListener("change", handleChange);
      controls.dispose();
    };
  }, [camera, gl.domElement]);

  useFrame((_, delta) => {
    const sp = setpointRef.current;
    const targetPos = new THREE.Vector3(...sp.position);
    const targetTarget = new THREE.Vector3(...sp.target);
    const targetFov = sp.fov;

    if (phaseRef.current === "transitioning") {
      const tr = transitionRef.current;
      tr.t = Math.min(tr.t + delta / TRANSITION_DURATION, 1);
      const ease = easeOutCubic(tr.t);

      camera.position.lerpVectors(tr.from.pos, targetPos, ease);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(tr.from.target, targetTarget, ease);
        controlsRef.current.update();
      }
      (camera as THREE.PerspectiveCamera).fov =
        tr.from.fov + (targetFov - tr.from.fov) * ease;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();

      if (tr.t >= 1) {
        phaseRef.current = "orbit";
        orbitIdleRef.current = 0;
        if (controlsRef.current) controlsRef.current.enabled = true;
      }
    } else if (phaseRef.current === "orbit") {
      orbitIdleRef.current += delta;
      if (controlsRef.current) controlsRef.current.update();

      if (orbitIdleRef.current >= SNAP_BACK_DELAY) {
        // Start snap-back
        phaseRef.current = "snapback";
        transitionRef.current.t = 0;
        transitionRef.current.from.pos.copy(camera.position);
        if (controlsRef.current) {
          transitionRef.current.from.target.copy(controlsRef.current.target);
          controlsRef.current.enabled = false;
        }
        transitionRef.current.from.fov = (camera as THREE.PerspectiveCamera).fov;
      }
    } else if (phaseRef.current === "snapback") {
      const tr = transitionRef.current;
      tr.t = Math.min(tr.t + delta / TRANSITION_DURATION, 1);
      const ease = easeOutCubic(tr.t);

      camera.position.lerpVectors(tr.from.pos, targetPos, ease);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(tr.from.target, targetTarget, ease);
        controlsRef.current.update();
      }
      (camera as THREE.PerspectiveCamera).fov =
        tr.from.fov + (targetFov - tr.from.fov) * ease;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();

      if (tr.t >= 1) {
        phaseRef.current = "orbit";
        orbitIdleRef.current = 0;
        if (controlsRef.current) controlsRef.current.enabled = true;
      }
    }
  });

  return null;
}
