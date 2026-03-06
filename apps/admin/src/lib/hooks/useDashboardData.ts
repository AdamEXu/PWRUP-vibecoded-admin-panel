// src/lib/hooks/useDashboardData.ts - Purpose: single-Pi dashboard data stream
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSubscription } from "@/lib/useSubscription";
import {
  PiStatus,
  LogMessage,
  StatusType,
  StatusBase,
} from "@pwrup/shared-proto/status/PiStatus";
import { Address, AutobahnClient } from "autobahn-client";
import { useSettings } from "@/lib/settings";

export function useDashboardData() {
  const { settings } = useSettings();
  const client = useMemo(
    () => new AutobahnClient(new Address(settings.host, settings.port)),
    [settings.host, settings.port]
  );
  const [piStats, setPiStats] = useState<PiStatus | null>(null);
  const [logMessages, setLogMessages] = useState<LogMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    client.begin();
    setIsConnected(true);
    return () => {
      setIsConnected(false);
    };
  }, [client]);

  const handleStatusMessage = useCallback(async (payload: Uint8Array) => {
    try {
      const baseMessage = StatusBase.decode(payload);

      if (baseMessage.type === StatusType.SYSTEM_STATUS) {
        const status = PiStatus.decode(payload);
        setPiStats(status);
      } else if (baseMessage.type === StatusType.LOG_MESSAGE) {
        const logMsg = LogMessage.decode(payload);
        setLogMessages((prev) => {
          const newMessages = [...prev, logMsg];
          return newMessages.slice(-100);
        });
      }
    } catch (error) {
      console.error("Failed to decode status message:", error);
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogMessages([]);
  }, []);

  useSubscription("tripoli/logs", handleStatusMessage, client);

  return {
    piStats,
    logMessages,
    isConnected,
    clearLogs,
  };
}
