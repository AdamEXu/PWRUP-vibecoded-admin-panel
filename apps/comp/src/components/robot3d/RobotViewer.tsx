"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as THREE from "three";
import rigConfig from "../../../public/cad/robot-rig.json";
import { useSettings } from "@/lib/settings";

const BUMPER_RED = new THREE.Color(0xdd1111);
const BUMPER_BLUE = new THREE.Color(0x1111dd);

export interface JointValue {
  /** Exact node name from the GLB */
  nodeName: string;
  /** Rotation axis in local space, e.g. [0,1,0] */
  axis: [number, number, number];
  /** Angle in radians (revolute) or meters (prismatic) */
  value: number;
  type: "revolute" | "prismatic";
}

function Scene({ modelUrl, joints, isRedAlliance }: { modelUrl: string; joints: JointValue[]; isRedAlliance: boolean }) {
  const { camera, gl, scene } = useThree();
  const sceneRootRef = useRef<THREE.Object3D | null>(null);
  const restQuatsRef = useRef<Map<string, THREE.Quaternion>>(new Map());
  const restPosRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const bumperMatsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const jointNodeCacheRef = useRef<Map<string, THREE.Object3D>>(new Map());
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

  // Load GLB
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

  // Recolor bumpers when alliance changes
  useEffect(() => {
    const color = isRedAlliance ? BUMPER_RED : BUMPER_BLUE;
    for (const mat of bumperMatsRef.current) {
      mat.color.copy(color);
    }
  }, [isRedAlliance]);

  // Apply joints every frame
  useFrame(() => {
    const root = sceneRootRef.current;
    if (!root) return;

    for (const joint of joints) {
      let node = jointNodeCacheRef.current.get(joint.nodeName);
      if (!node) {
        const found = root.getObjectByName(joint.nodeName);
        if (!found) continue;
        jointNodeCacheRef.current.set(joint.nodeName, found);
        node = found;
      }

      const restQuat = restQuatsRef.current.get(joint.nodeName);
      const restPos = restPosRef.current.get(joint.nodeName);
      if (!restQuat || !restPos) continue;

      let axis = jointAxisCacheRef.current.get(joint.nodeName);
      if (!axis) {
        axis = new THREE.Vector3(...joint.axis).normalize();
        jointAxisCacheRef.current.set(joint.nodeName, axis);
      }

      if (joint.type === "revolute") {
        _tmpQuat.current.setFromAxisAngle(axis, joint.value);
        node.quaternion.copy(restQuat).multiply(_tmpQuat.current);
      } else {
        node.position.copy(restPos).addScaledVector(axis, joint.value);
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

export function RobotViewer({ modelUrl, joints, isRedAlliance = false }: { modelUrl: string; joints: JointValue[]; isRedAlliance?: boolean }) {
  const { visualSettings } = useSettings();
  return (
    <Canvas
      camera={{ position: [1.5, 1, 1.5], fov: 50, near: 0.01, far: 50 }}
      gl={{ antialias: true }}
      dpr={visualSettings.renderScale * ((typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1)}
      frameloop="always"
      style={{ width: "100%", height: "100%" }}
    >
      <Scene modelUrl={modelUrl} joints={joints} isRedAlliance={isRedAlliance} />
    </Canvas>
  );
}
