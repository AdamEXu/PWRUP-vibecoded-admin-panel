// src/lib/hooks/useDashboardData.ts - Purpose: single-Pi dashboard data stream
"use client";

import { useState, useCallback, useEffect } from "react";
import {
  PiStatus,
  LogMessage,
  StatusType,
  StatusBase,
} from "@pwrup/shared-proto/status/PiStatus";
import {
  getBridge,
  hasBridge,
  subscribeAutobahnStatus,
  subscribeAutobahnTopic,
} from "@/lib/blitzRenderer";

const DASHBOARD_TOPIC = "tripoli/logs";

export function useDashboardData() {
  const [piStats, setPiStats] = useState<PiStatus | null>(null);
  const [logMessages, setLogMessages] = useState<LogMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const bridgeAvailable = hasBridge();

  useEffect(() => {
    if (!bridgeAvailable) {
      return;
    }

    let disposed = false;
    const unsubscribe = subscribeAutobahnStatus((connected) => {
      if (!disposed) {
        setIsConnected(connected);
      }
    });

    void getBridge()
      .autobahn
      .getStatus()
      .then((connected) => {
        if (!disposed) {
          setIsConnected(connected);
        }
      })
      .catch(() => {
        if (!disposed) {
          setIsConnected(false);
        }
      });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [bridgeAvailable]);

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

  useEffect(() => {
    if (!hasBridge()) {
      return;
    }

    let disposed = false;
    let unsubscribe = () => {};

    void subscribeAutobahnTopic(DASHBOARD_TOPIC, async (update) => {
      if (disposed || !update.payload) {
        return;
      }
      await handleStatusMessage(update.payload);
    }).then((cleanup) => {
      if (disposed) {
        cleanup();
        return;
      }
      unsubscribe = cleanup;
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [handleStatusMessage]);

  const clearLogs = useCallback(() => {
    setLogMessages([]);
  }, []);

  return {
    piStats,
    logMessages,
    isConnected: bridgeAvailable ? isConnected : false,
    clearLogs,
  };
}
