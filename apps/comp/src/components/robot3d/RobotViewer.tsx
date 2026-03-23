"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as THREE from "three";
import rigConfig from "../../../public/cad/robot-rig.json";
import { useSettings } from "@/lib/settings";

const BUMPER_RED = new THREE.Color(0xdd1111);
const BUMPER_BLUE = new THREE.Color(0x1111dd);

// Singleton DRACOLoader — shared across all useLoader calls in this module
const _dracoLoader = new DRACOLoader();
_dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");

export interface JointValue {
  /** Exact node name from the GLB */
  nodeName: string;
  /** Rotation axis in local space, e.g. [0,1,0] */
  axis: [number, number, number];
  /** Angle in radians (revolute) or meters (prismatic) */
  value: number;
  type: "revolute" | "prismatic";
}

function Scene({ modelUrl, joints, isRedAlliance }: { modelUrl: string; joints: JointValue[]; isRedAlliance: boolean | null }) {
  const { camera, gl, scene } = useThree();
  const jointAxisCacheRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const _tmpQuat = useRef(new THREE.Quaternion());

  // OrbitControls
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.2;
    controls.maxDistance = 6;
    return () => controls.dispose();
  }, [camera, gl.domElement]);

  // Load GLB — result is cached globally by useLoader; suspends until ready
  const gltf = useLoader(GLTFLoader, modelUrl, (l) => l.setDRACOLoader(_dracoLoader));

  // Clone the cached scene and derive all per-instance data once per model
  const { clonedScene, nodeMap, restQuats, restPos, bumperMats } = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.rotation.x = -Math.PI / 2;

    const nodeMap = new Map<string, THREE.Object3D>();
    const restQuats = new Map<string, THREE.Quaternion>();
    const restPos = new Map<string, THREE.Vector3>();
    const bumperMats: THREE.MeshStandardMaterial[] = [];
    const bumperSet = new Set(rigConfig.bumperNodes);

    clone.traverse((node) => {
      nodeMap.set(node.name, node);
      restQuats.set(node.name, node.quaternion.clone());
      restPos.set(node.name, node.position.clone());

      if ((node as THREE.Mesh).isMesh && bumperSet.has(node.name)) {
        const mesh = node as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            const clonedMat = (m as THREE.MeshStandardMaterial).clone();
            mesh.material = clonedMat;
            bumperMats.push(clonedMat);
          }
        }
      }
    });

    return { clonedScene: clone, nodeMap, restQuats, restPos, bumperMats };
  }, [gltf.scene]);

  // Attach/detach cloned scene
  useEffect(() => {
    scene.add(clonedScene);
    return () => { scene.remove(clonedScene); };
  }, [clonedScene, scene]);

  // Recolor bumpers when alliance changes — null means no value yet, keep model color
  useEffect(() => {
    if (isRedAlliance == null) return;
    const color = isRedAlliance ? BUMPER_RED : BUMPER_BLUE;
    for (const mat of bumperMats) mat.color.copy(color);
  }, [isRedAlliance, bumperMats]);

  // Apply joints every frame
  useFrame(() => {
    for (const joint of joints) {
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
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 8, 4]} intensity={1.2} />
      <directionalLight position={[-4, 2, -4]} intensity={0.3} />
      <gridHelper args={[3, 30, "#333", "#222"]} />
    </>
  );
}

export function RobotViewer({ modelUrl, joints, isRedAlliance = null }: { modelUrl: string; joints: JointValue[]; isRedAlliance?: boolean | null }) {
  const { visualSettings } = useSettings();
  return (
    <Canvas
      camera={{ position: [1.5, 1, 1.5], fov: 50, near: 0.01, far: 50 }}
      gl={{ antialias: true }}
      dpr={visualSettings.renderScale * ((typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1)}
      frameloop="always"
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <Scene modelUrl={modelUrl} joints={joints} isRedAlliance={isRedAlliance} />
      </Suspense>
    </Canvas>
  );
}
