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

// ── Tuning constants ────────────────────────────────────────────────────────
const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";
const FIELD_URL = "/cad/field-2026.glb?v=2";
const ROBOT_URL = "/cad/Robot-Full.glb";

// Camera distance range: zoom=0 → far, zoom=1 → close
const ZOOM_NEAR = 3.5;
const ZOOM_FAR = 14;
// Polar angle range: angle=0 → top-down, angle=1 → level
const POLAR_TOP = 0.08;  // nearly top-down
const POLAR_LOW = 1.35;  // nearly level
// Lerp factors per frame (~60fps target)
const LERP_POS = 0.08;   // robot position follow
const LERP_THETA = 0.05; // follow-mode azimuth
const LERP_CAM = 0.06;   // idle camera transition
// Idle/showcase camera parameters
const IDLE_DISTANCE = 6;
const IDLE_POLAR = 0.7;  // ~40° elevation
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
function useGLTFModel(url: string, useWrapper = false) {
  const { scene: threeScene } = useThree();
  const rootRef = useRef<THREE.Object3D | null>(null);
  const innerRef = useRef<THREE.Object3D | null>(null);
  const restQuatsRef = useRef<Map<string, THREE.Quaternion>>(new Map());
  const restPosRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const loadedRef = useRef(false);

  useEffect(() => {
    loadedRef.current = false;
    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_DECODER_PATH);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(url, (gltf) => {
      if (rootRef.current) threeScene.remove(rootRef.current);
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

  return { rootRef, innerRef, restQuatsRef, restPosRef };
}

// ── Scene component ─────────────────────────────────────────────────────────
interface SceneProps {
  poseX: number;
  poseY: number;
  heading: number;
  isRedAlliance: boolean;
  isIdle: boolean;
  joints: JointValue[];
}

function Scene({ poseX, poseY, heading, isRedAlliance, isIdle, joints }: SceneProps) {
  const { camera } = useThree();
  const { mapSettings } = useSettings();

  // Load field (static) — rootRef keeps it attached to the scene
  useGLTFModel(FIELD_URL);

  // Load robot — use wrapper so heading (Y rotation) doesn't conflict with Z-up→Y-up (X rotation)
  const { rootRef: robotRef, innerRef: robotInnerRef, restQuatsRef, restPosRef } = useGLTFModel(ROBOT_URL, true);

  // Robot position in Three.js world space
  // WPILib: X = long axis (0→16.54), Y = short axis (0→8.21)
  // Three.js: center field at origin, X = WPILib X - half, Z = WPILib Y - half
  const HALF_W = 8.27;
  const HALF_H = 4.105;
  const robotWorldX = poseX - HALF_W;
  const robotWorldZ = poseY - HALF_H;

  // Smooth camera target (robot position, lerped)
  const camTargetRef = useRef(new THREE.Vector3(robotWorldX, 0, robotWorldZ));
  // Smooth camera azimuth theta
  const camThetaRef = useRef(0);
  // Current camera spherical
  const camPhiRef = useRef(POLAR_TOP + mapSettings.angle * (POLAR_LOW - POLAR_TOP));
  const camDistRef = useRef(ZOOM_FAR + (1 - mapSettings.zoom) * (ZOOM_NEAR - ZOOM_FAR));

  useFrame(() => {
    const wrapper = robotRef.current;
    const inner = robotInnerRef.current;

    // ── Robot position + heading on the wrapper group ─────────────────
    if (wrapper) {
      wrapper.position.set(robotWorldX, 0, robotWorldZ);
      // WPILib heading: CCW+ radians, 0 = facing +X
      // Three.js Y rotation: CCW+ when viewed from above
      wrapper.rotation.y = -heading;
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
    camTargetRef.current.lerp(
      new THREE.Vector3(robotWorldX, 0.3, robotWorldZ),
      LERP_POS,
    );

    // ── Desired camera parameters ─────────────────────────────────────
    const targetPhi = POLAR_TOP + mapSettings.angle * (POLAR_LOW - POLAR_TOP);
    const targetDist = ZOOM_FAR + (1 - mapSettings.zoom) * (ZOOM_NEAR - ZOOM_FAR);

    let targetTheta: number;

    if (isIdle) {
      // Showcase: fixed pleasant angle
      targetTheta = lerpAngle(camThetaRef.current, IDLE_THETA_OFFSET, LERP_CAM);
      camPhiRef.current = lerp(camPhiRef.current, IDLE_POLAR, LERP_CAM);
      camDistRef.current = lerp(camDistRef.current, IDLE_DISTANCE, LERP_CAM);
    } else {
      camPhiRef.current = lerp(camPhiRef.current, targetPhi, 0.1);
      camDistRef.current = lerp(camDistRef.current, targetDist, 0.1);

      if (mapSettings.mode === "follow") {
        // Camera is behind robot (climber side): robot heading points toward intake
        // Camera looks from heading + π direction
        const desiredTheta = -heading + Math.PI;
        targetTheta = lerpAngle(camThetaRef.current, desiredTheta, LERP_THETA);
      } else {
        // Driver mode: fixed from driver station end, based on alliance
        // Blue: drivers at -X end, looking toward +X → theta = 0
        // Red: drivers at +X end, looking toward -X → theta = π
        const driverTheta = isRedAlliance ? Math.PI : 0;
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
      <ambientLight intensity={1.5} />
      <hemisphereLight args={[0xffffff, 0x444444, 1.0]} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
      <directionalLight position={[-6, 8, -6]} intensity={0.5} />
      <directionalLight position={[0, 10, -10]} intensity={0.3} />
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
  const isIdle = props.matchPhase === "pre_match" || props.matchPhase === "post_match";

  return (
    <Scene
      poseX={props.poseX}
      poseY={props.poseY}
      heading={props.heading}
      isRedAlliance={props.isRedAlliance}
      isIdle={isIdle}
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
