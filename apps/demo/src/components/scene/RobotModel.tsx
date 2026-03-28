"use client";

import { useMemo, useEffect, useRef } from "react";
import { useLoader, useThree, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import * as THREE from "three";
import rigConfig from "../../../public/cad/robot-rig.json";
import type { JointValue, RobotPose } from "@/lib/useTabAnimation";

const BUMPER_GREEN = new THREE.Color(0x70cd35);

const _dracoLoader = new DRACOLoader();
_dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");

// Field coordinate constants (WPILib 2026)
const HALF_W = 8.27;
const HALF_H = 4.105;

interface RobotModelProps {
  jointValuesRef: React.RefObject<JointValue[]>;
  /** When provided, positions the robot on the field using WPILib coordinates. */
  poseRef?: React.RefObject<RobotPose | null>;
}

export function RobotModel({ jointValuesRef, poseRef }: RobotModelProps) {
  const { scene: threeScene } = useThree();
  const gltf = useLoader(GLTFLoader, "/cad/Robot-Full.glb", (l) =>
    l.setDRACOLoader(_dracoLoader)
  );

  const jointAxisCacheRef = useRef<Map<string, THREE.Vector3>>(new Map());
  const _tmpQuat = useRef(new THREE.Quaternion());

  const { root, inner, nodeMap, restQuats, restPos } = useMemo(() => {
    const clone = gltf.scene.clone(true);
    // Z-up (CAD) → Y-up (Three.js)
    clone.rotation.x = -Math.PI / 2;

    const nodeMap = new Map<string, THREE.Object3D>();
    const restQuats = new Map<string, THREE.Quaternion>();
    const restPos = new Map<string, THREE.Vector3>();
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
            const cloned = (m as THREE.MeshStandardMaterial).clone();
            cloned.color.copy(BUMPER_GREEN);
            mesh.material = cloned;
          }
        }
      }
    });

    // Wrap in a group so position/heading (on wrapper) don't conflict with
    // the Z-up→Y-up rotation (on inner clone). Same pattern as MiniMap3D.
    const wrapper = new THREE.Group();
    wrapper.add(clone);

    return { root: wrapper, inner: clone, nodeMap, restQuats, restPos };
  }, [gltf.scene]);

  useEffect(() => {
    threeScene.add(root);
    return () => { threeScene.remove(root); };
  }, [root, threeScene]);

  useFrame(() => {
    // Position robot on field if a pose is provided, otherwise keep at origin
    if (poseRef) {
      const pose = poseRef.current;
      if (pose) {
        // WPILib 2026: X=0 red wall, X=16.54 blue wall
        // Three.js: negate X so red is at +worldX; center field at origin
        root.position.set(HALF_W - pose.x, 0, pose.z - HALF_H);
        // WPILib heading CCW+, 0 = facing +poseX (toward blue wall = -worldX)
        // Model default forward is +worldZ; correct: heading - π/2
        root.rotation.y = pose.heading - Math.PI / 2;
      } else {
        root.position.set(0, 0, 0);
        root.rotation.y = 0;
      }
    }

    // Apply joints on the inner scene (which has the Z-up→Y-up rotation)
    const joints = jointValuesRef.current;
    if (!joints) return;

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

  return null;
}
