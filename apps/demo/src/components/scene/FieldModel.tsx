"use client";

import { useMemo, useEffect, useRef } from "react";
import { useLoader, useThree, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import * as THREE from "three";
import fieldMeta from "../../../public/cad/field-meta.json";

const _dracoLoader = new DRACOLoader();
_dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");

const GAME_PIECE_NODES = new Set(
  fieldMeta.gamePieces.flatMap((gp) => gp.stagedObjects)
);

interface FieldModelProps {
  /** 0 = invisible, 1 = fully visible */
  targetOpacity: number;
}

export function FieldModel({ targetOpacity }: FieldModelProps) {
  const { scene: threeScene } = useThree();
  const gltf = useLoader(GLTFLoader, "/cad/field-2026.glb", (l) =>
    l.setDRACOLoader(_dracoLoader)
  );

  const opacityRef = useRef(0);
  const targetRef = useRef(targetOpacity);
  targetRef.current = targetOpacity;

  const { clonedScene, meshMaterials } = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const meshMaterials: THREE.MeshStandardMaterial[] = [];

    clone.traverse((node) => {
      // Hide fuel game pieces
      if (GAME_PIECE_NODES.has(node.name)) {
        node.visible = false;
        return;
      }

      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            const cloned = (m as THREE.MeshStandardMaterial).clone();
            // Force diffuse-only so lights work without env maps (matches minimap)
            cloned.metalness = 0;
            cloned.roughness = 1;
            cloned.transparent = true;
            cloned.opacity = 0;
            if (cloned.transparent) cloned.depthWrite = false;
            mesh.material = cloned;
            meshMaterials.push(cloned);
          }
        }
      }
    });

    return { clonedScene: clone, meshMaterials };
  }, [gltf.scene]);

  useEffect(() => {
    threeScene.add(clonedScene);
    return () => { threeScene.remove(clonedScene); };
  }, [clonedScene, threeScene]);

  useFrame((_, delta) => {
    // Lerp opacity toward target at ~2 units/sec (0→1 in ~0.5s)
    const speed = 2;
    const current = opacityRef.current;
    const target = targetRef.current;
    const next = current + (target - current) * Math.min(delta * speed * 3, 1);
    opacityRef.current = next;
    for (const mat of meshMaterials) {
      mat.opacity = next;
    }
  });

  return null;
}
