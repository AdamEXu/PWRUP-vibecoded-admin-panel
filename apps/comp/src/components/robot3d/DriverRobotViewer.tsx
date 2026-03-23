"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as THREE from "three";
import type { JointValue } from "./RobotViewer";
import cameraPoses from "../../../public/cad/camera-poses.json";
import rigConfig from "../../../public/cad/robot-rig.json";
import { useSettings } from "@/lib/settings";

const BUMPER_RED = new THREE.Color(0xdd1111);
const BUMPER_BLUE = new THREE.Color(0x1111dd);

// ---------------------------------------------------------------------------
// Tunable constants (adjust these to taste)
// ---------------------------------------------------------------------------
const TRANSITION_DURATION_MS = 400;
const IDLE_TIMEOUT_MS = 1000;
const IDLE_TRANSITION_DURATION_MS = 600;
const ORBIT_DAMPING_FACTOR = 0.08;
const ORBIT_ROTATE_SPEED = 0.5;
const ORBIT_ZOOM_SPEED = 0.8;
const MIN_POLAR_ANGLE = 0.1;
const MAX_POLAR_ANGLE = Math.PI / 2 - 0.05;
const MIN_DISTANCE = 0.5;
const MAX_DISTANCE = 4;

// ---------------------------------------------------------------------------
// Easing — easeOutCubic is snappy (fast start, gentle stop)
// ---------------------------------------------------------------------------
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ---------------------------------------------------------------------------
// Spherical helpers
// ---------------------------------------------------------------------------

/** Wrap angle difference to [-PI, PI] for shortest-path interpolation */
function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
}

/** Compute spherical coords of camera position relative to a target */
function toSpherical(pos: Vec3Tuple, target: Vec3Tuple): THREE.Spherical {
  const offset = new THREE.Vector3(
    pos[0] - target[0],
    pos[1] - target[1],
    pos[2] - target[2],
  );
  return new THREE.Spherical().setFromVector3(offset);
}

/** Convert spherical coords back to cartesian, offset from a target */
function fromSpherical(
  radius: number,
  phi: number,
  theta: number,
  target: Vec3Tuple,
): Vec3Tuple {
  const offset = new THREE.Vector3().setFromSpherical(
    new THREE.Spherical(radius, phi, theta),
  );
  return [
    target[0] + offset.x,
    target[1] + offset.y,
    target[2] + offset.z,
  ];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Vec3Tuple = [number, number, number];

interface CameraPose {
  position: Vec3Tuple;
  target: Vec3Tuple;
  fov: number;
}

interface TransitionState {
  // Spherical coords relative to their respective targets
  startRadius: number;
  startPhi: number;
  startTheta: number;
  endRadius: number;
  endPhi: number;
  endTheta: number;
  // Targets interpolated linearly
  startTarget: Vec3Tuple;
  endTarget: Vec3Tuple;
  // FOV
  startFov: number;
  endFov: number;
  // Timing
  startTime: number;
  duration: number;
}

// ---------------------------------------------------------------------------
// DriverScene — inner Three.js scene
// ---------------------------------------------------------------------------
function DriverScene({
  modelUrl,
  jointsRef,
  stateIndex,
  isRedAlliance,
}: {
  modelUrl: string;
  jointsRef: React.RefObject<JointValue[]>;
  stateIndex: number;
  isRedAlliance: boolean;
}) {
  const { camera, gl, scene, invalidate } = useThree();
  const perspCamera = camera as THREE.PerspectiveCamera;

  // Refs
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRootRef = useRef<THREE.Object3D | null>(null);
  const restQuatsRef = useRef<Map<string, THREE.Quaternion>>(new Map());
  const restPosRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const bumperMatsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const jointNodeCacheRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const jointAxisCacheRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const _tmpQuat = useRef(new THREE.Quaternion());
  const lastInputEndRef = useRef(performance.now());
  const isDraggingRef = useRef(false);
  const idleTriggeredRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const transitionRef = useRef<TransitionState | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTargetRef = useRef<CameraPose>({
    position: cameraPoses.initial.position as Vec3Tuple,
    target: cameraPoses.initial.target as Vec3Tuple,
    fov: cameraPoses.initial.fov,
  });
  const prevStateIndexRef = useRef(stateIndex);

  // ---- OrbitControls setup ----
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = ORBIT_DAMPING_FACTOR;
    controls.enablePan = false;
    controls.rotateSpeed = ORBIT_ROTATE_SPEED;
    controls.zoomSpeed = ORBIT_ZOOM_SPEED;
    controls.minPolarAngle = MIN_POLAR_ANGLE;
    controls.maxPolarAngle = MAX_POLAR_ANGLE;
    controls.minDistance = MIN_DISTANCE;
    controls.maxDistance = MAX_DISTANCE;

    // Set initial target
    controls.target.set(...(cameraPoses.initial.target as Vec3Tuple));

    const onChange = () => { invalidate(); };
    const onStart = () => {
      isDraggingRef.current = true;
      idleTriggeredRef.current = false;
      if (idleTimeoutRef.current) { clearTimeout(idleTimeoutRef.current); idleTimeoutRef.current = null; }
      // Cancel any active idle-return transition
      if (isTransitioningRef.current) {
        isTransitioningRef.current = false;
        transitionRef.current = null;
      }
    };
    const onEnd = () => {
      isDraggingRef.current = false;
      lastInputEndRef.current = performance.now();
      idleTriggeredRef.current = false;
      // Schedule a frame after idle timeout so useFrame can trigger the idle-return transition
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = setTimeout(() => { invalidate(); }, IDLE_TIMEOUT_MS + 50);
    };

    controls.addEventListener("change", onChange);
    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);

    controlsRef.current = controls;
    return () => {
      if (idleTimeoutRef.current) { clearTimeout(idleTimeoutRef.current); idleTimeoutRef.current = null; }
      controls.removeEventListener("change", onChange);
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl.domElement]);

  // ---- Load GLB model ----
  useEffect(() => {
    const draco = new DRACOLoader();
    draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(modelUrl, (gltf) => {
      if (sceneRootRef.current) scene.remove(sceneRootRef.current);

      bumperMatsRef.current = [];
      jointNodeCacheRef.current.clear();
      const bumperSet = new Set(rigConfig.bumperNodes);
      // Capture rest transforms before any joint is applied
      gltf.scene.traverse((node) => {
        restQuatsRef.current.set(node.name, node.quaternion.clone());
        restPosRef.current.set(node.name, node.position.clone());
        if ((node as THREE.Mesh).isMesh && bumperSet.has(node.name)) {
          const mesh = node as THREE.Mesh;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of mats) {
            if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
              const cloned = (m as THREE.MeshStandardMaterial).clone();
              mesh.material = cloned;
              bumperMatsRef.current.push(cloned);
            }
          }
        }
      });

      // Rotate from Z-up to Y-up
      gltf.scene.rotation.x = -Math.PI / 2;
      sceneRootRef.current = gltf.scene;
      scene.add(gltf.scene);
    });

    return () => {
      if (sceneRootRef.current) {
        scene.remove(sceneRootRef.current);
        sceneRootRef.current = null;
      }
      draco.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]);

  // Helper to start a spherical camera transition
  function startTransition(pose: CameraPose, duration: number) {
    const controls = controlsRef.current;
    if (!controls) return;

    const currentTarget: Vec3Tuple = [controls.target.x, controls.target.y, controls.target.z];
    const currentPos: Vec3Tuple = [camera.position.x, camera.position.y, camera.position.z];

    const startSph = toSpherical(currentPos, currentTarget);
    const endSph = toSpherical(pose.position, pose.target);

    transitionRef.current = {
      startRadius: startSph.radius,
      startPhi: startSph.phi,
      startTheta: startSph.theta,
      endRadius: endSph.radius,
      endPhi: endSph.phi,
      endTheta: endSph.theta,
      startTarget: currentTarget,
      endTarget: pose.target,
      startFov: perspCamera.fov,
      endFov: pose.fov,
      startTime: performance.now(),
      duration,
    };
    isTransitioningRef.current = true;
  }

  // ---- Recolor bumpers when alliance changes ----
  useEffect(() => {
    const color = isRedAlliance ? BUMPER_RED : BUMPER_BLUE;
    for (const mat of bumperMatsRef.current) {
      mat.color.copy(color);
    }
    invalidate();
  }, [isRedAlliance]);

  // ---- State transition trigger ----
  useEffect(() => {
    if (stateIndex === prevStateIndexRef.current) return;
    prevStateIndexRef.current = stateIndex;

    const pose = cameraPoses.states[stateIndex];
    if (!pose) return;

    const targetPose: CameraPose = {
      position: pose.position as Vec3Tuple,
      target: pose.target as Vec3Tuple,
      fov: pose.fov,
    };
    startTransition(targetPose, TRANSITION_DURATION_MS);
    idleTriggeredRef.current = false;
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateIndex]);

  // ---- Per-frame update ----
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Apply joints
    const root = sceneRootRef.current;
    if (root) {
      for (const joint of jointsRef.current ?? []) {
        let node = jointNodeCacheRef.current.get(joint.nodeName);
        if (!node) {
          const found = root.getObjectByName(joint.nodeName);
          if (!found) continue;
          jointNodeCacheRef.current.set(joint.nodeName, found);
          node = found;
        }

        const restQuat = restQuatsRef.current.get(joint.nodeName);
        const restP = restPosRef.current.get(joint.nodeName);
        if (!restQuat || !restP) continue;

        let axis = jointAxisCacheRef.current.get(joint.nodeName);
        if (!axis) {
          axis = new THREE.Vector3(...joint.axis).normalize();
          jointAxisCacheRef.current.set(joint.nodeName, axis);
        }

        if (joint.type === "revolute") {
          _tmpQuat.current.setFromAxisAngle(axis, joint.value);
          node.quaternion.copy(restQuat).multiply(_tmpQuat.current);
        } else {
          node.position.copy(restP).addScaledVector(axis, joint.value);
        }
      }
    }

    // ---- Camera transition (spherical interpolation) ----
    if (isTransitioningRef.current && transitionRef.current) {
      const t = transitionRef.current;
      const raw = (performance.now() - t.startTime) / t.duration;

      if (raw >= 1) {
        // Snap to final pose
        camera.position.set(
          ...fromSpherical(t.endRadius, t.endPhi, t.endTheta, t.endTarget),
        );
        controls.target.set(...t.endTarget);
        perspCamera.fov = t.endFov;
        perspCamera.updateProjectionMatrix();
        isTransitioningRef.current = false;
        idleTargetRef.current = {
          position: fromSpherical(t.endRadius, t.endPhi, t.endTheta, t.endTarget),
          target: t.endTarget,
          fov: t.endFov,
        };
        lastInputEndRef.current = performance.now();
        idleTriggeredRef.current = false;
      } else {
        const e = easeOutCubic(Math.min(raw, 1));

        // Interpolate target linearly
        const lerpTarget: Vec3Tuple = [
          THREE.MathUtils.lerp(t.startTarget[0], t.endTarget[0], e),
          THREE.MathUtils.lerp(t.startTarget[1], t.endTarget[1], e),
          THREE.MathUtils.lerp(t.startTarget[2], t.endTarget[2], e),
        ];

        // Interpolate spherical coords (shortest path for theta)
        const radius = THREE.MathUtils.lerp(t.startRadius, t.endRadius, e);
        const phi = THREE.MathUtils.lerp(t.startPhi, t.endPhi, e);
        const theta = lerpAngle(t.startTheta, t.endTheta, e);

        // Convert back to cartesian
        const pos = fromSpherical(radius, phi, theta, lerpTarget);

        camera.position.set(...pos);
        controls.target.set(...lerpTarget);
        perspCamera.fov = THREE.MathUtils.lerp(t.startFov, t.endFov, e);
        perspCamera.updateProjectionMatrix();
      }
      controls.update();
      return;
    }

    // ---- Idle return: trigger after last touch/mouse release ----
    if (!isDraggingRef.current && !idleTriggeredRef.current) {
      const idleMs = performance.now() - lastInputEndRef.current;
      if (idleMs > IDLE_TIMEOUT_MS) {
        idleTriggeredRef.current = true;
        startTransition(idleTargetRef.current, IDLE_TRANSITION_DURATION_MS);
      }
    }

    controls.update();

    // With frameloop="demand", keep requesting frames while animating
    if (isTransitioningRef.current) invalidate();
  });

  return (
    <>
      {/* Lighting — dramatic, Tesla-style */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={1.0} />
      <directionalLight position={[-3, 4, -2]} intensity={0.4} />
      <spotLight position={[0, 6, 0]} angle={0.6} penumbra={1} intensity={0.5} />
    </>
  );
}

// ---------------------------------------------------------------------------
// DriverRobotViewer — public component
// ---------------------------------------------------------------------------
export function DriverRobotViewer({
  modelUrl,
  jointsRef,
  stateIndex,
  isRedAlliance = false,
  isActive,
}: {
  modelUrl: string;
  jointsRef: React.RefObject<JointValue[]>;
  stateIndex: number;
  isRedAlliance?: boolean;
  isActive?: boolean;
}) {
  const { visualSettings } = useSettings();
  return (
    <Canvas
      camera={{
        position: cameraPoses.initial.position as [number, number, number],
        fov: cameraPoses.initial.fov,
        near: 0.01,
        far: 50,
      }}
      gl={{ antialias: true }}
      dpr={visualSettings.renderScale * ((typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1)}
      frameloop={isActive === false ? "never" : "always"}
      style={{ width: "100%", height: "100%", background: "#000" }}
    >
      <DriverScene modelUrl={modelUrl} jointsRef={jointsRef} stateIndex={stateIndex} isRedAlliance={isRedAlliance} />
    </Canvas>
  );
}
