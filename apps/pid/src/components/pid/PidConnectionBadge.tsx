"use client";

import { useEffect, useMemo, useState } from "react";
import { NetworkTables } from "ntcore-ts-client";
import { Badge } from "@pwrup/shared-ui/badge";
import { useSettings } from "@/lib/settings";

export function PidConnectionBadge() {
  const { settings } = useSettings();
  const [isConnected, setIsConnected] = useState(false);

  const robotIp = useMemo(
    () => settings.networkTables.host.trim(),
    [settings.networkTables.host],
  );

  useEffect(() => {
    if (!robotIp) {
      setIsConnected(false);
      return;
    }

    const nt = NetworkTables.getInstanceByURI(robotIp, settings.networkTables.port);
    const removeListener = nt.addRobotConnectionListener((connected) => {
      setIsConnected(connected);
    }, true);

    return () => {
      removeListener();
    };
  }, [robotIp, settings.networkTables.port]);

  return (
    <Badge variant={isConnected ? "secondary" : "outline"} className="gap-1.5 px-3 py-1">
      <span
        className={`size-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-amber-400"}`}
      />
      {isConnected ? "NT4 Connected" : "NT4 Waiting"}
    </Badge>
  );
}
