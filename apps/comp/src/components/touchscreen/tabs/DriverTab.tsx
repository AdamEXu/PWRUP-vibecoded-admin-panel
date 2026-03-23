"use client";

import { useState } from "react";
import { DriverRobotViewer } from "@/components/robot3d/DriverRobotViewer";
import { useRobotJointsRef } from "@/components/robot3d/useRobotJoints";
import { useIsRedAlliance } from "@/lib/match/useMatchState";
import rigConfig from "../../../../public/cad/robot-rig.json";

export function DriverTab({ isActive }: { isActive?: boolean }) {
  const [stateIndex, setStateIndex] = useState(0);
  const { jointValuesRef } = useRobotJointsRef();
  const isRedAlliance = useIsRedAlliance();

  return (
    <div className="relative h-full w-full bg-black">
      <DriverRobotViewer
        modelUrl={`/${rigConfig.model}`}
        jointsRef={jointValuesRef}
        stateIndex={stateIndex}
        isRedAlliance={isRedAlliance}
        isActive={isActive}
      />

      {/* State pose buttons */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            onClick={() => setStateIndex(i)}
            className={[
              "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all duration-200",
              stateIndex === i
                ? "bg-white text-black shadow-lg shadow-white/20"
                : "bg-white/10 text-white/60 hover:bg-white/20",
            ].join(" ")}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
