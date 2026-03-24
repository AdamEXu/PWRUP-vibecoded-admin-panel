// src/lib/hooks/useMultiPiDashboard.ts - Purpose: manage multiple Pi subscriptions and aggregate stats
"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  PiStatus,
  LogMessage,
  StatusType,
  StatusBase,
} from "@pwrup/shared-proto/status/PiStatus";
import { hasBridge, subscribeAutobahnStatus, subscribeAutobahnTopic } from "@/lib/blitzRenderer";

export interface PiSystemData {
  name: string;
  status: PiStatus | null;
  logs: LogMessage[];
  lastSeen: Date | null;
  isConnected: boolean;
}

export interface GlobalStats {
  totalPis: number;
  activePis: number;
  avgCpuUsage: number;
  avgMemoryUsage: number;
  totalNetworkIn: number;
  totalNetworkOut: number;
}

const DEFAULT_TOPIC = "pi-technical-log";

export function useMultiPiDashboard() {
  const [piSystems, setPiSystems] = useState<Map<string, PiSystemData>>(new Map());
  const [topic, setTopic] = useState<string>(DEFAULT_TOPIC);
  const [isConnected, setIsConnected] = useState(false);
  const removedPiSystemsRef = useRef<Set<string>>(new Set());
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

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [bridgeAvailable]);

  const handleLogMessage = useCallback(async (payload: Uint8Array) => {
    try {
      const baseMessage = StatusBase.decode(payload);

      if (baseMessage.type !== StatusType.LOG_MESSAGE) {
        return;
      }

      const logMsg = LogMessage.decode(payload);
      const piName = logMsg.piName || null;

      if (!piName || removedPiSystemsRef.current.has(piName)) {
        return;
      }

      setPiSystems((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(piName) || {
          name: piName,
          status: null,
          logs: [],
          lastSeen: null,
          isConnected: false,
        };

        const newLogs = [...existing.logs, logMsg].slice(-100);
        updated.set(piName, {
          ...existing,
          logs: newLogs,
          lastSeen: new Date(),
          isConnected: true,
        });

        return updated;
      });
    } catch (error) {
      console.error("[Dashboard] Failed to decode log message:", error);
    }
  }, []);

  const handleStatsMessage = useCallback(async (payload: Uint8Array) => {
    try {
      const baseMessage = StatusBase.decode(payload);

      if (baseMessage.type !== StatusType.SYSTEM_STATUS) {
        return;
      }

      const status = PiStatus.decode(payload);
      const piName = status.piName || null;

      if (!piName || removedPiSystemsRef.current.has(piName)) {
        return;
      }

      setPiSystems((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(piName) || {
          name: piName,
          status: null,
          logs: [],
          lastSeen: null,
          isConnected: false,
        };

        updated.set(piName, {
          ...existing,
          status,
          lastSeen: new Date(),
          isConnected: true,
        });

        return updated;
      });
    } catch (error) {
      console.error("[Dashboard] Failed to decode stats message:", error);
    }
  }, []);

  useEffect(() => {
    if (!topic.trim() || !hasBridge()) {
      return;
    }

    let disposed = false;
    let unsubscribeLogs = () => {};
    let unsubscribeStats = () => {};

    void subscribeAutobahnTopic(topic, async (update) => {
      if (disposed || !update.payload) {
        return;
      }
      await handleLogMessage(update.payload);
    }).then((cleanup) => {
      if (disposed) {
        cleanup();
        return;
      }
      unsubscribeLogs = cleanup;
    });

    void subscribeAutobahnTopic(`${topic}/stats`, async (update) => {
      if (disposed || !update.payload) {
        return;
      }
      await handleStatsMessage(update.payload);
    }).then((cleanup) => {
      if (disposed) {
        cleanup();
        return;
      }
      unsubscribeStats = cleanup;
    });

    return () => {
      disposed = true;
      unsubscribeLogs();
      unsubscribeStats();
    };
  }, [handleLogMessage, handleStatsMessage, topic]);

  const addPiSystem = useCallback((piName: string) => {
    if (!piName.trim()) return;

    removedPiSystemsRef.current.delete(piName);

    setPiSystems((prev) => {
      const updated = new Map(prev);
      if (!updated.has(piName)) {
        updated.set(piName, {
          name: piName,
          status: null,
          logs: [],
          lastSeen: null,
          isConnected: false,
        });
      }
      return updated;
    });
  }, []);

  const removePiSystem = useCallback((piName: string) => {
    removedPiSystemsRef.current.add(piName);

    setPiSystems((prev) => {
      const updated = new Map(prev);
      updated.delete(piName);
      return updated;
    });
  }, []);

  const clearLogs = useCallback((piName: string) => {
    setPiSystems((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(piName);
      if (existing) {
        updated.set(piName, { ...existing, logs: [] });
      }
      return updated;
    });
  }, []);

  const globalStats: GlobalStats = useMemo(() => {
    const systems = Array.from(piSystems.values());
    const activeSystems = systems.filter((system) => system.status && system.isConnected);

    const average = (values: number[]) =>
      values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

    return {
      totalPis: systems.length,
      activePis: activeSystems.length,
      avgCpuUsage: average(activeSystems.map((system) => system.status?.cpuUsageTotal || 0)),
      avgMemoryUsage: average(activeSystems.map((system) => system.status?.memoryUsage || 0)),
      totalNetworkIn: activeSystems.reduce(
        (sum, system) => sum + (system.status?.netUsageIn || 0),
        0,
      ),
      totalNetworkOut: activeSystems.reduce(
        (sum, system) => sum + (system.status?.netUsageOut || 0),
        0,
      ),
    };
  }, [piSystems]);

  return {
    piSystems,
    globalStats,
    isConnected: bridgeAvailable ? isConnected : false,
    topic,
    setTopic,
    addPiSystem,
    removePiSystem,
    clearLogs,
  };
}
