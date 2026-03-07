"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Address, AutobahnClient } from "autobahn-client";
import { RobotPosition } from "@pwrup/shared-proto/util/position";
import { useSettings } from "@/lib/settings";
import { ROBOT_POSITION_TOPIC } from "./constants";

export interface AutobahnRobotPose {
  x: number;
  y: number;
  heading: number;
  hasPose: boolean;
}

export function useAutobahnRobotPose(): AutobahnRobotPose {
  const { settings } = useSettings();
  const client = useMemo(
    () => new AutobahnClient(new Address(settings.host, settings.port)),
    [settings.host, settings.port],
  );
  const [pose, setPose] = useState<AutobahnRobotPose>({
    x: 0,
    y: 0,
    heading: 0,
    hasPose: false,
  });

  const onPose = useCallback(async (payload: Uint8Array) => {
    try {
      const decoded = RobotPosition.decode(payload);

      const x = decoded.position2d?.position?.x ?? decoded.position3d?.position?.x;
      const y = decoded.position2d?.position?.y ?? decoded.position3d?.position?.y;
      if (x === undefined || y === undefined) return;

      const dx = decoded.position2d?.direction?.x ?? decoded.position3d?.direction?.x ?? 0;
      const dy = decoded.position2d?.direction?.y ?? decoded.position3d?.direction?.y ?? 0;
      const heading = (dx === 0 && dy === 0) ? 0 : Math.atan2(dy, dx);

      setPose({
        x,
        y,
        heading,
        hasPose: true,
      });
    } catch {
      // Ignore decode errors
    }
  }, []);

  useEffect(() => {
    try { client.begin(); } catch { /* ignore */ }
  }, [client]);

  useEffect(() => {
    client.subscribe(ROBOT_POSITION_TOPIC, onPose);
    return () => {
      client.unsubscribe(ROBOT_POSITION_TOPIC);
    };
  }, [client, onPose]);

  return pose;
}
