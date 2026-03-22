"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import * as THREE from "three";
import { useSettings } from "@/lib/settings";
import { useRobotJoints } from "@/components/robot3d/useRobotJoints";
import type { JointValue } from "@/components/robot3d/RobotViewer";
import type { MatchPhase } from "@/lib/match/types";
import fieldMeta from "../../../public/cad/field-meta.json";
import rigConfig from "../../../public/cad/robot-rig.json";

// ── Game piece node names to hide ───────────────────────────────────────────
const GAME_PIECE_NODES = new Set(
  fieldMeta.gamePieces.flatMap((gp) => gp.stagedObjects)
);

// ── Tuning constants ────────────────────────────────────────────────────────
const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";
const FIELD_URL = "/cad/field-2026.glb?v=2";
const ROBOT_URL = "/cad/Robot-Full.glb";

// Camera distance range: zoom=0 → far, zoom=1 → close
const ZOOM_NEAR = 2;
// At ZOOM_FAR, the 8.21m short axis fills ~80% of the viewport width
// (FOV=50°, aspect≈1.4 → hFOV≈66° → width = 2*d*tan(33°) ≈ 1.3*d; 8.21/(0.8*1.3) ≈ 7.9)
const ZOOM_FAR = 11.05;
// Polar angle range: angle=0 → top-down, angle=1 → level
const POLAR_TOP = 0.08;  // nearly top-down
const POLAR_LOW = 1.35;  // nearly level
// Lerp factors per frame (~60fps target)
const LERP_POS = 0.08;   // robot position follow
const LERP_THETA = 0.05; // follow-mode azimuth
const LERP_CAM = 0.06;   // idle camera transition
// Idle/showcase camera parameters

const IDLE_AZIMUTH_SPEED = 0.0; // static (no orbit in idle for now)
const IDLE_THETA_OFFSET = Math.PI * 0.75; // offset so camera isn't directly behind

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number) {
  // Shortest-path lerp for angles
  let diff = ((b - a + Math.PI) % (2 * Math.PI)) - Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
}

// ── Model loader (field + robot) ──────────────────────────────────────────
// When useWrapper=true, the GLTF scene is placed inside a wrapper Group.
// The wrapper is what gets added to the Three.js scene and returned as rootRef.
// The inner GLTF scene gets the Z-up→Y-up rotation; position/heading go on the wrapper.
const BUMPER_RED = new THREE.Color(0xdd1111);
const BUMPER_BLUE = new THREE.Color(0x1111dd);

function useGLTFModel(url: string, useWrapper = false, bumperNodeNames: string[] = []) {
  const { scene: threeScene } = useThree();
  const rootRef = useRef<THREE.Object3D | null>(null);
  const innerRef = useRef<THREE.Object3D | null>(null);
  const restQuatsRef = useRef<Map<string, THREE.Quaternion>>(new Map());
  const restPosRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const bumperMatsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    loadedRef.current = false;
    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_DECODER_PATH);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(url, (gltf) => {
      if (rootRef.current) threeScene.remove(rootRef.current);
      bumperMatsRef.current = [];
      const bumperSet = new Set(bumperNodeNames);
      gltf.scene.traverse((node) => {
        restQuatsRef.current.set(node.name, node.quaternion.clone());
        restPosRef.current.set(node.name, node.position.clone());
        if ((node as THREE.Mesh).isMesh) {
          const mat = (node as THREE.Mesh).material;
          const mats = Array.isArray(mat) ? mat : [mat];
          for (const m of mats) {
            // PBR materials need env maps to look right; force diffuse so lights work
            if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
              (m as THREE.MeshStandardMaterial).metalness = 0;
              (m as THREE.MeshStandardMaterial).roughness = 1;
            }
            if (m.transparent) {
              m.depthWrite = false;
            }
          }
          // Collect bumper materials (clone so we own them)
          if (bumperSet.has(node.name)) {
            const mesh = node as THREE.Mesh;
            const bumperMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const m of bumperMats) {
              if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                const cloned = (m as THREE.MeshStandardMaterial).clone();
                mesh.material = cloned;
                bumperMatsRef.current.push(cloned);
              }
            }
          }
        }
      });
      // Robot CAD is Z-up → rotate to Y-up; AdvantageScope field model is already Y-up
      if (useWrapper) {
        gltf.scene.rotation.x = -Math.PI / 2;
      }

      if (useWrapper) {
        // Wrapper group: position/heading go here, Z-up→Y-up stays on inner scene
        const wrapper = new THREE.Group();
        wrapper.add(gltf.scene);
        rootRef.current = wrapper;
        innerRef.current = gltf.scene;
        threeScene.add(wrapper);
      } else {
        gltf.scene.traverse((obj) => {
          if (GAME_PIECE_NODES.has(obj.name)) obj.visible = false;
        });
        rootRef.current = gltf.scene;
        innerRef.current = gltf.scene;
        threeScene.add(gltf.scene);
      }
      loadedRef.current = true;
    });

    return () => {
      if (rootRef.current) {
        threeScene.remove(rootRef.current);
        rootRef.current = null;
        innerRef.current = null;
      }
      draco.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { rootRef, innerRef, restQuatsRef, restPosRef, bumperMatsRef };
}

// ── Scene component ─────────────────────────────────────────────────────────
interface SceneProps {
  poseX: number;
  poseY: number;
  heading: number;
  isRedAlliance: boolean;
  matchPhase: MatchPhase;
  joints: JointValue[];
}

function Scene({ poseX, poseY, heading, isRedAlliance, matchPhase, joints }: SceneProps) {
  const { camera } = useThree();
  const { mapSettings } = useSettings();
  const isIdle = !mapSettings.disableIdle && (matchPhase === "pre_match" || matchPhase === "post_match");

  // Load field (static) — rootRef keeps it attached to the scene
  useGLTFModel(FIELD_URL);

  // Load robot — use wrapper so heading (Y rotation) doesn't conflict with Z-up→Y-up (X rotation)
  const { rootRef: robotRef, innerRef: robotInnerRef, restQuatsRef, restPosRef, bumperMatsRef } =
    useGLTFModel(ROBOT_URL, true, rigConfig.bumperNodes);

  // Recolor bumpers when alliance changes
  useEffect(() => {
    const color = isRedAlliance ? BUMPER_RED : BUMPER_BLUE;
    for (const mat of bumperMatsRef.current) {
      mat.color.copy(color);
    }
  }, [isRedAlliance, bumperMatsRef]);

  // Robot position in Three.js world space
  // WPILib 2026: X=0 is red wall, X=16.54 is blue wall (flipped vs prior years)
  // Negate X so red robots land at +worldX and blue at -worldX (matching the field model)
  // Three.js: center field at origin, Z = WPILib Y - half
  const HALF_W = 8.27;
  const HALF_H = 4.105;
  const robotWorldX = HALF_W - poseX; // negated: red at +X, blue at -X
  const robotWorldZ = poseY - HALF_H;

  // Smooth camera target (robot position, lerped)
  const camTargetRef = useRef(new THREE.Vector3(robotWorldX, 0, robotWorldZ));
  // Smooth camera azimuth theta
  const camThetaRef = useRef(0);
  // Current camera spherical
  // angle=0 → level/front (POLAR_LOW), angle=1 → top-down (POLAR_TOP)
  const camPhiRef = useRef(POLAR_LOW - mapSettings.angle * (POLAR_LOW - POLAR_TOP));
  // zoom=0 → far out (ZOOM_FAR), zoom=1 → close in (ZOOM_NEAR)
  const camDistRef = useRef(ZOOM_FAR + mapSettings.zoom * (ZOOM_NEAR - ZOOM_FAR));
  // Always-fresh ref so useFrame never has a stale mapSettings closure
  const mapSettingsRef = useRef(mapSettings);
  mapSettingsRef.current = mapSettings;

  useFrame(() => {
    const wrapper = robotRef.current;
    const inner = robotInnerRef.current;

    // ── Robot position + heading on the wrapper group ─────────────────
    if (wrapper) {
      wrapper.position.set(robotWorldX, 0, robotWorldZ);
      // WPILib 2026: heading CCW+, 0 = facing +poseX (toward blue wall = -worldX)
      // Model default forward is +worldZ; with negated X, correct formula is heading - π/2
      wrapper.rotation.y = heading - Math.PI / 2;
    }

    // ── Apply joints on the inner scene (which has the Z-up→Y-up rotation) ──
    if (inner) {
      for (const joint of joints) {
        const node = inner.getObjectByName(joint.nodeName);
        if (!node) continue;
        const restQuat = restQuatsRef.current.get(joint.nodeName);
        const restPos = restPosRef.current.get(joint.nodeName);
        if (!restQuat || !restPos) continue;

        if (joint.type === "revolute") {
          const axis = new THREE.Vector3(...joint.axis).normalize();
          const q = new THREE.Quaternion().setFromAxisAngle(axis, joint.value);
          node.quaternion.copy(restQuat).multiply(q);
        } else {
          const axis = new THREE.Vector3(...joint.axis).normalize();
          node.position.copy(restPos).addScaledVector(axis, joint.value);
        }
      }
    }

    // ── Camera target: lerp toward robot world position ───────────────
    // At zoom=0 (max out), center on field short axis (Z=0) so full width is visible.
    // At zoom=1 (max in), follow robot normally.
    const zoomFactor = mapSettingsRef.current.zoom;
    const targetZ = lerp(0, robotWorldZ, zoomFactor);
    camTargetRef.current.lerp(
      new THREE.Vector3(robotWorldX, 0.3, targetZ),
      LERP_POS,
    );

    // ── Desired camera parameters ─────────────────────────────────────
    const targetPhi = POLAR_LOW - mapSettingsRef.current.angle * (POLAR_LOW - POLAR_TOP);
    const targetDist = ZOOM_FAR + mapSettingsRef.current.zoom * (ZOOM_NEAR - ZOOM_FAR);

    camPhiRef.current = lerp(camPhiRef.current, targetPhi, 0.1);
    camDistRef.current = lerp(camDistRef.current, targetDist, 0.1);

    let targetTheta: number;

    if (isIdle) {
      // Showcase: fixed pleasant azimuth only; angle/zoom still follow sliders
      targetTheta = lerpAngle(camThetaRef.current, IDLE_THETA_OFFSET, LERP_CAM);
    } else {

      if (mapSettings.mode === "follow") {
        // Camera is behind robot (climber side): robot heading points toward intake
        // With negated X and model default forward +worldZ: camera behind = heading + π/2
        const desiredTheta = heading + Math.PI / 2;
        targetTheta = lerpAngle(camThetaRef.current, desiredTheta, LERP_THETA);
      } else {
        // Driver mode: fixed from driver station end, based on alliance
        // Blue: drivers at -X end, looking toward +X → theta = 0
        // Red: drivers at +X end, looking toward -X → theta = π
        const driverTheta = isRedAlliance ? -Math.PI*0.5 : Math.PI*0.5;
        targetTheta = lerpAngle(camThetaRef.current, driverTheta, 0.08);
      }
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
  poseX: number;
  poseY: number;
  heading: number;
  isRedAlliance: boolean;
  matchPhase: MatchPhase;
}

function MiniMap3DInner(props: MiniMap3DProps) {
  const { jointValues } = useRobotJoints();

  return (
    <Scene
      poseX={props.poseX}
      poseY={props.poseY}
      heading={props.heading}
      isRedAlliance={props.isRedAlliance}
      matchPhase={props.matchPhase}
      joints={jointValues}
    />
  );
}

export function MiniMap3D(props: MiniMap3DProps) {
  return (
    <div
      className="fixed"
      style={{
        left: "28.125vw",
        top: "44.44vh",
        width: "43.75vw",
        bottom: 0,
        pointerEvents: "none",
        maskImage: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' preserveAspectRatio='none'><defs><filter id='s'><feGaussianBlur stdDeviation='10'/></filter></defs><rect x='14' y='10' width='172' height='220' rx='60' fill='white' filter='url(%23s)'/></svg>\")",
        WebkitMaskImage: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' preserveAspectRatio='none'><defs><filter id='s'><feGaussianBlur stdDeviation='10'/></filter></defs><rect x='14' y='10' width='172' height='220' rx='60' fill='white' filter='url(%23s)'/></svg>\")",
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
      }}
    >
      <Canvas
        camera={{ position: [0, 8, 0], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, logarithmicDepthBuffer: true, alpha: true }}
        frameloop="always"
        style={{ width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <MiniMap3DInner {...props} />
      </Canvas>
    </div>
  );
}
