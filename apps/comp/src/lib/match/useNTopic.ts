"use client";

import { useEffect, useRef, useState } from "react";
import { NetworkTables, type NetworkTablesTypeInfo } from "ntcore-ts-client";
import { useSettings } from "@/lib/settings";

/**
 * Generic, single-topic NetworkTables subscription hook.
 *
 * Follows the same lifecycle pattern as usePathNetworkTable:
 *   - Connects via singleton NT instance (shared with other hooks)
 *   - Tracks connection state
 *   - On disconnect: keeps the last received value (no blanking)
 *   - Cleans up subscription and listener on unmount / setting change
 */
export function useNTopic<T>(
  topicPath: string,
  typeInfo: NetworkTablesTypeInfo,
  defaultValue: T,
): { value: T; isConnected: boolean } {
  const { settings } = useSettings();
  const [value, setValue] = useState<T>(defaultValue);
  const [isConnected, setIsConnected] = useState(false);

  // Keep a ref to the latest value so we don't reset on disconnect
  const lastValueRef = useRef<T>(defaultValue);

  const robotIp = settings.networkTables.host.trim();
  const port = settings.networkTables.port;

  useEffect(() => {
    if (!robotIp) {
      setIsConnected(false);
      return;
    }

    const nt = NetworkTables.getInstanceByURI(robotIp, port);
    const topic = nt.createTopic<T>(topicPath, typeInfo, defaultValue);

    const removeListener = nt.addRobotConnectionListener((connected) => {
      setIsConnected(connected);
      // Don't reset value on disconnect — keep last known state
    }, true);

    const subUid = topic.subscribe((next) => {
      if (next === null || next === undefined) return;
      lastValueRef.current = next;
      setValue(next);
    });

    return () => {
      removeListener();
      topic.unsubscribe(subUid);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robotIp, port, topicPath]);

  return { value, isConnected };
}
