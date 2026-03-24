"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import * as THREE from "three";
import { NetworkTablesTypeInfos } from "ntcore-ts-client";
import { useSettings } from "@/lib/settings";
import { useRobotJointsRef } from "@/components/robot3d/useRobotJoints";
import type { JointValue } from "@/components/robot3d/RobotViewer";
import type { MatchPhase } from "@/lib/match/types";
import { NT } from "@/lib/match/constants";
import { hasBridge, subscribeNtTopic } from "@/lib/blitzRenderer";
import fieldMeta from "../../../public/cad/field-meta.json";
import rigConfig from "../../../public/cad/robot-rig.json";

// ── Game piece node names to hide ───────────────────────────────────────────
const GAME_PIECE_NODES = new Set(
  fieldMeta.gamePieces.flatMap((gp) => gp.stagedObjects)
);

// ── Tuning constants ────────────────────────────────────────────────────────
const FIELD_URL = "/cad/field-2026.glb?v=2";
const ROBOT_URL = "/cad/Robot-Full.glb";

// Singleton DRACOLoader — shared across all useLoader calls in this module
const _dracoLoader = new DRACOLoader();
_dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");

// Stable empty array so useGLTFModel's default doesn't trigger useMemo re-runs
const NO_BUMPER_NODES: string[] = [];

// Camera distance range: zoom=0 → far, zoom=1 → close
const ZOOM_NEAR = 2;
// At ZOOM_FAR, the 8.21m short axis fills ~80% of the viewport width
// (FOV=50°, aspect≈1.4 → hFOV≈66° → width = 2*d*tan(33°) ≈ 1.3*d; 8.21/(0.8*1.3) ≈ 7.9)
const ZOOM_FAR = 11.05;
// Polar angle range: angle=0 → top-down, angle=1 → level
const POLAR_TOP = 0.08;  // nearly top-down
const POLAR_LOW = 1.35;  // nearly level
// Lerp rates (normalized to 60fps; delta-time corrected via dtLerp)
const LERP_POS = 0.15;   // robot position follow
const LERP_THETA = 0.10; // follow-mode azimuth

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number) {
  // Shortest-path lerp for angles
  let diff = ((b - a + Math.PI) % (2 * Math.PI)) - Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
}

// Returns a delta-time corrected lerp factor so smoothing feels the same at any framerate.
// rate is the desired per-frame factor at 60fps.
function dtLerp(rate: number, delta: number) {
  return 1 - Math.pow(1 - rate, delta * 60);
}

// ── Model loader (field + robot) ──────────────────────────────────────────
// When useWrapper=true, the GLTF scene is placed inside a wrapper Group.
// The wrapper is what gets added to the Three.js scene and returned as root.
// The inner GLTF scene gets the Z-up→Y-up rotation; position/heading go on the wrapper.
const BUMPER_RED = new THREE.Color(0xdd1111);
const BUMPER_BLUE = new THREE.Color(0x1111dd);

function useGLTFModel(url: string, useWrapper = false, bumperNodeNames: string[] = NO_BUMPER_NODES) {
  const { scene: threeScene } = useThree();

  // Cached globally by useLoader — only parsed once per URL across the entire app
  const gltf = useLoader(GLTFLoader, url, (l) => l.setDRACOLoader(_dracoLoader));

  // Clone the cached scene and derive all per-instance data
  const result = useMemo(() => {
    const clone = gltf.scene.clone(true);

    const nodeMap = new Map<string, THREE.Object3D>();
    const restQuats = new Map<string, THREE.Quaternion>();
    const restPos = new Map<string, THREE.Vector3>();
    const bumperMats: THREE.MeshStandardMaterial[] = [];
    const bumperSet = new Set(bumperNodeNames);

    clone.traverse((node) => {
      nodeMap.set(node.name, node);
      restQuats.set(node.name, node.quaternion.clone());
      restPos.set(node.name, node.position.clone());

      if ((node as THREE.Mesh).isMesh) {
        const mat = (node as THREE.Mesh).material;
        const mats = Array.isArray(mat) ? mat : [mat];
        for (const m of mats) {
          // PBR materials need env maps to look right; force diffuse so lights work
          if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            (m as THREE.MeshStandardMaterial).metalness = 0;
            (m as THREE.MeshStandardMaterial).roughness = 1;
          }
          if (m.transparent) m.depthWrite = false;
        }
        // Collect bumper materials (clone so we own them)
        if (bumperSet.has(node.name)) {
          const mesh = node as THREE.Mesh;
          const bumperMatArr = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const m of bumperMatArr) {
            if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
              const clonedMat = (m as THREE.MeshStandardMaterial).clone();
              mesh.material = clonedMat;
              bumperMats.push(clonedMat);
            }
          }
        }
      }
    });

    // Robot CAD is Z-up → rotate to Y-up; AdvantageScope field model is already Y-up
    if (useWrapper) {
      clone.rotation.x = -Math.PI / 2;
      const wrapper = new THREE.Group();
      wrapper.add(clone);
      return { root: wrapper, inner: clone, nodeMap, restQuats, restPos, bumperMats };
    } else {
      clone.traverse((obj) => {
        if (GAME_PIECE_NODES.has(obj.name)) obj.visible = false;
      });
      return { root: clone, inner: clone, nodeMap, restQuats, restPos, bumperMats };
    }
  }, [gltf.scene, useWrapper, bumperNodeNames]);

  // Attach/detach from Three.js scene
  useEffect(() => {
    threeScene.add(result.root);
    return () => { threeScene.remove(result.root); };
  }, [result.root, threeScene]);

  return result;
}

// ── Scene component ─────────────────────────────────────────────────────────
interface SceneProps {
  poseRef: React.RefObject<{ x: number; y: number; heading: number }>;
  jointValuesRef: React.RefObject<JointValue[]>;
  isRedAlliance: boolean | null;
}

function Scene({ poseRef, jointValuesRef, isRedAlliance }: SceneProps) {
  const { camera } = useThree();
  const { mapSettings } = useSettings();

  // Load field (static)
  useGLTFModel(FIELD_URL);

  // Load robot — use wrapper so heading (Y rotation) doesn't conflict with Z-up→Y-up (X rotation)
  const robot = useGLTFModel(ROBOT_URL, true, rigConfig.bumperNodes);
  const robotRuntimeRef = useRef(robot);
  const jointAxisCacheRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const _tmpQuat = useRef(new THREE.Quaternion());

  useEffect(() => {
    robotRuntimeRef.current = robot;
  }, [robot]);

  // Recolor bumpers when alliance changes — null means no value yet, keep model color
  useEffect(() => {
    if (isRedAlliance == null) return;
    const color = isRedAlliance ? BUMPER_RED : BUMPER_BLUE;
    for (const mat of robot.bumperMats) mat.color.copy(color);
  }, [isRedAlliance, robot.bumperMats]);

  // Robot position in Three.js world space
  // WPILib 2026: X=0 is red wall, X=16.54 is blue wall (flipped vs prior years)
  // Negate X so red robots land at +worldX and blue at -worldX (matching the field model)
  // Three.js: center field at origin, Z = WPILib Y - half
  const HALF_W = 8.27;
  const HALF_H = 4.105;

  // Smooth camera target (robot position, lerped)
  const camTargetRef = useRef(new THREE.Vector3());
  // Smooth camera azimuth theta
  const camThetaRef = useRef(0);
  // Current camera spherical
  // angle=0 → level/front (POLAR_LOW), angle=1 → top-down (POLAR_TOP)
  const camPhiRef = useRef(POLAR_LOW - mapSettings.angle * (POLAR_LOW - POLAR_TOP));
  // zoom=0 → far out (ZOOM_FAR), zoom=1 → close in (ZOOM_NEAR)
  const camDistRef = useRef(ZOOM_FAR + mapSettings.zoom * (ZOOM_NEAR - ZOOM_FAR));
  // Always-fresh ref so useFrame never has a stale mapSettings closure
  const mapSettingsRef = useRef(mapSettings);

  // Reusable Vector3 for camera lerp target (avoids allocation per frame)
  const _tmpCamTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    const { x, y } = poseRef.current;
    camTargetRef.current.set(HALF_W - x, 0, y - HALF_H);
  }, [poseRef]);

  useEffect(() => {
    mapSettingsRef.current = mapSettings;
  }, [mapSettings]);

  useFrame((_, delta) => {
    const { inner, nodeMap, restPos, restQuats, root: wrapper } = robotRuntimeRef.current;

    // Read latest pose + joints directly from refs — no React render cycle needed.
    const { x: poseX, y: poseY, heading } = poseRef.current;
    const robotWorldX = HALF_W - poseX;
    const robotWorldZ = poseY - HALF_H;

    // ── Robot position + heading on the wrapper group ─────────────────
    if (wrapper) {
      wrapper.position.set(robotWorldX, 0, robotWorldZ);
      // WPILib 2026: heading CCW+, 0 = facing +poseX (toward blue wall = -worldX)
      // Model default forward is +worldZ; with negated X, correct formula is heading - π/2
      wrapper.rotation.y = heading - Math.PI / 2;
    }

    // ── Apply joints on the inner scene (which has the Z-up→Y-up rotation) ──
    if (inner) {
      for (const joint of jointValuesRef.current) {
        const node = nodeMap.get(joint.nodeName);
        if (!node) continue;
        const restQuat = restQuats.get(joint.nodeName);
        const restPosVec = restPos.get(joint.nodeName);
        if (!restQuat || !restPosVec) continue;

        let axis = jointAxisCacheRef.current.get(joint.nodeName);
        if (!axis) {
          axis = new THREE.Vector3(...joint.axis).normalize();
          jointAxisCacheRef.current.set(joint.nodeName, axis);
        }

        if (joint.type === "revolute") {
          _tmpQuat.current.setFromAxisAngle(axis, joint.value);
          node.quaternion.copy(restQuat).multiply(_tmpQuat.current);
        } else {
          node.position.copy(restPosVec).addScaledVector(axis, joint.value);
        }
      }
    }

    // ── Camera target: lerp toward robot world position ───────────────
    // At zoom=0 (max out), center on field short axis (Z=0) so full width is visible.
    // At zoom=1 (max in), follow robot normally.
    const zoomFactor = mapSettingsRef.current.zoom;
    const targetZ = lerp(0, robotWorldZ, zoomFactor);
    camTargetRef.current.lerp(
      _tmpCamTarget.current.set(robotWorldX, 0.3, targetZ),
      dtLerp(LERP_POS, delta),
    );

    // ── Desired camera parameters ─────────────────────────────────────
    const targetPhi = POLAR_LOW - mapSettingsRef.current.angle * (POLAR_LOW - POLAR_TOP);
    const targetDist = ZOOM_FAR + mapSettingsRef.current.zoom * (ZOOM_NEAR - ZOOM_FAR);

    camPhiRef.current = lerp(camPhiRef.current, targetPhi, dtLerp(0.1, delta));
    camDistRef.current = lerp(camDistRef.current, targetDist, dtLerp(0.1, delta));

    let targetTheta: number;

    // Idle behavior disabled - always use active mode camera
    if (mapSettings.mode === "follow") {
      // Camera is behind robot (climber side): robot heading points toward intake
      // With negated X and model default forward +worldZ: camera behind = heading + π/2
      const desiredTheta = heading + Math.PI / 2;
      targetTheta = lerpAngle(camThetaRef.current, desiredTheta, dtLerp(LERP_THETA, delta));
    } else {
      // Driver mode: fixed from driver station end, based on alliance
      // Blue: drivers at -X end, looking toward +X → theta = 0
      // Red: drivers at +X end, looking toward -X → theta = π
      const driverTheta = (isRedAlliance ?? false) ? -Math.PI*0.5 : Math.PI*0.5;
      targetTheta = lerpAngle(camThetaRef.current, driverTheta, dtLerp(0.10, delta));
    }

    camThetaRef.current = targetTheta;

    // ── Build camera position from spherical ──────────────────────────
    const r = camDistRef.current;
    const phi = camPhiRef.current;
    const theta = camThetaRef.current;

    const camX = camTargetRef.current.x + r * Math.sin(phi) * Math.sin(theta);
    const camY = camTargetRef.current.y + r * Math.cos(phi);
    const camZ = camTargetRef.current.z + r * Math.sin(phi) * Math.cos(theta);

    camera.position.set(camX, camY, camZ);
    camera.lookAt(camTargetRef.current);
  });

  return (
    <>
      {/* <ambientLight intensity={0.5} /> */}
      <hemisphereLight args={[0xffffff, 0x444444, 0.5]} />
      <directionalLight position={[10, 20, 10]} intensity={0.6} />
      <directionalLight position={[-6, 8, -6]} intensity={0.4} />
      <directionalLight position={[0, 10, -10]} intensity={0.2} />
    </>
  );
}

// ── Root component ───────────────────────────────────────────────────────────
interface MiniMap3DProps {
  isRedAlliance: boolean | null;
  matchPhase: MatchPhase;
}

function MiniMap3DInner(props: MiniMap3DProps) {
  const { jointValuesRef } = useRobotJointsRef();

  // Subscribe to pose topics directly — values land in a ref so useFrame
  // picks them up on the very next animation frame without a React re-render.
  const poseRef = useRef({ x: 8.27, y: 4.105, heading: 0 });

  useEffect(() => {
    if (!hasBridge()) return;

    let disposed = false;
    const cleanups: Array<() => void> = [];

    const sub = (topic: string, apply: (v: number) => void) => {
      void subscribeNtTopic<number>(
        { topicPath: topic, typeInfo: NetworkTablesTypeInfos.kDouble, defaultValue: 0 },
        (update) => {
          if (!disposed && update.hasValue) apply(Number(update.value));
        },
      ).then((cleanup) => {
        if (disposed) cleanup();
        else cleanups.push(cleanup);
      });
    };

    sub(NT.MATCH_HUD_POSE_X,  (v) => { poseRef.current = { ...poseRef.current, x: v }; });
    sub(NT.MATCH_HUD_POSE_Y,  (v) => { poseRef.current = { ...poseRef.current, y: v }; });
    sub(NT.MATCH_HUD_HEADING, (v) => { poseRef.current = { ...poseRef.current, heading: v }; });

    return () => {
      disposed = true;
      cleanups.forEach((c) => c());
    };
  }, []);

  return (
    <Scene
      poseRef={poseRef}
      jointValuesRef={jointValuesRef}
      isRedAlliance={props.isRedAlliance}
    />
  );
}

export function MiniMap3D(props: MiniMap3DProps) {
  const { visualSettings } = useSettings();
  // border-radius: 30% 30% 0 0 reproduces rx='60' on a 200-unit viewBox with
  // preserveAspectRatio='none' (60/200 = 30% of each axis). Bottom corners are 0
  // because the original SVG rect extended past the viewBox (height=220 on 200px
  // viewBox), so the bottom was never rounded.
  //
  // The inset box-shadow overlay replaces feGaussianBlur (stdDeviation=10 on 200
  // viewBox = ~15% feathering = ~6vw at 1920px). It is painted once as a static
  // CSS layer, not re-composited per WebGL frame like the SVG mask was.
  // The background behind the minimap is always black, so fade-to-transparent and
  // fade-to-black are visually identical.
  return (
    <div
      className="fixed"
      style={{
        left: "28.125vw",
        top: "44.44vh",
        width: "43.75vw",
        bottom: "-1vw",
        pointerEvents: "none",
        borderRadius: "30% 30% 0 0",
        overflow: "hidden",
      }}
    >
      <Canvas
        camera={{ position: [0, 8, 0], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, logarithmicDepthBuffer: visualSettings.logarithmicDepthBuffer, alpha: true }}
        dpr={visualSettings.renderScale * ((typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1)}
        frameloop="always"
        style={{ width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <Suspense fallback={null}>
          <MiniMap3DInner {...props} />
        </Suspense>
      </Canvas>
      {/* Static soft-edge vignette — painted once, not re-run per WebGL frame */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          borderRadius: "30% 30% 0 0",
          boxShadow: "inset 0 0 5vw 3.5vw black",
        }}
      />
    </div>
  );
}
