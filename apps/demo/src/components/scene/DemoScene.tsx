"use client";

import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { RobotModel }         from "./RobotModel";
import { FieldModel }         from "./FieldModel";
import { CameraController }   from "./CameraController";
import { ScriptedAnimation }  from "./ScriptedAnimation";
import { CAMERA_SETPOINTS }   from "@/lib/cameraSetpoints";
import type { TabId }         from "@/lib/tabs";
import type { JointValue }    from "@/lib/useTabAnimation";

interface DemoSceneProps {
  tab: TabId;
  /** Increment to reset the scripted animation without remounting the Canvas */
  resetKey?: number;
  onOrbitStart?: () => void;
  onAnimationLoop?: () => void;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 10, 5]}  intensity={1.0} />
      <directionalLight position={[-4, 4, -4]} intensity={0.3} />
      <directionalLight position={[0, 6, -8]}  intensity={0.18} />
    </>
  );
}

export function DemoScene({ tab, resetKey, onOrbitStart, onAnimationLoop }: DemoSceneProps) {
  const jointValuesRef = useRef<JointValue[]>([]);
  const startTimeRef   = useRef<number>(performance.now());

  // Reset animation timer when tab or resetKey changes
  const prevTabRef      = useRef(tab);
  const prevResetKeyRef = useRef(resetKey);

  if (prevTabRef.current !== tab || prevResetKeyRef.current !== resetKey) {
    prevTabRef.current      = tab;
    prevResetKeyRef.current = resetKey;
    startTimeRef.current    = performance.now();
  }

  const setpoint = CAMERA_SETPOINTS[tab] ?? CAMERA_SETPOINTS.overview;
  const showField = tab === "vision";

  return (
    <div className="fixed inset-0 z-0" style={{ background: "#000" }}>
      <Canvas
        camera={{ position: [1.38, 0.45, 1.38], fov: 50, near: 0.01, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.75]}
        frameloop="always"
        style={{ width: "100%", height: "100%" }}
      >
        <Lights />
        <Suspense fallback={null}>
          <RobotModel jointValuesRef={jointValuesRef} />
          <FieldModel targetOpacity={showField ? 1 : 0} />
          <ScriptedAnimation
            tab={tab}
            jointValuesRef={jointValuesRef}
            startTimeRef={startTimeRef}
            onLoop={onAnimationLoop}
          />
          <CameraController
            setpoint={setpoint}
            onOrbitStart={onOrbitStart}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
