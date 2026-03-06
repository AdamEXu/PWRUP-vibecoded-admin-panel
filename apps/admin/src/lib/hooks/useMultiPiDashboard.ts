// src/lib/hooks/useMultiPiDashboard.ts - Purpose: manage multiple Pi subscriptions and aggregate stats
"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Address, AutobahnClient } from "autobahn-client";
import {
  PiStatus,
  LogMessage,
  StatusType,
  StatusBase,
} from "@pwrup/shared-proto/status/PiStatus";
import { useSettings } from "@/lib/settings";

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
  const { settings } = useSettings();
  const client = useMemo(
    () => new AutobahnClient(new Address(settings.host, settings.port)),
    [settings.host, settings.port]
  );
  const [piSystems, setPiSystems] = useState<Map<string, PiSystemData>>(
    new Map()
  );
  const [topic, setTopic] = useState<string>(DEFAULT_TOPIC);
  const [isConnected, setIsConnected] = useState(false);
  const logSubscriptionRef = useRef<string | null>(null);
  const statsSubscriptionRef = useRef<string | null>(null);
  // Track intentionally removed Pi systems to ignore their messages
  const removedPiSystemsRef = useRef<Set<string>>(new Set());

  // Initialize connection and track connection state
  useEffect(() => {
    let cancelled = false;

    const checkConnection = () => {
      if (cancelled) return;
      const connected = client.isConnected();
      setIsConnected(connected);
      return connected;
    };

    // Start connection
    client.begin();

    // Check immediately
    checkConnection();

    // Poll connection state periodically
    const intervalId = setInterval(() => {
      if (cancelled) return;
      checkConnection();
    }, 500); // Check every 500ms to track connection state changes

    // Cleanup
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [client]);

  const handleLogMessage = useCallback(async (payload: Uint8Array) => {
    try {
      console.log(
        "[Dashboard] Received message on log topic, size:",
        payload.length
      );
      const baseMessage = StatusBase.decode(payload);
      console.log("[Dashboard] Decoded base message, type:", baseMessage.type);

      if (baseMessage.type !== StatusType.LOG_MESSAGE) {
        console.warn(
          "[Dashboard] Message is not LOG_MESSAGE, type:",
          baseMessage.type
        );
        return;
      }

      const logMsg = LogMessage.decode(payload);
      const piName = logMsg.piName || null;
      console.log("[Dashboard] Decoded log message from pi:", piName);

      if (!piName) {
        console.warn("Received LOG_MESSAGE without pi_name");
        return;
      }

      // Ignore messages from intentionally removed Pi systems
      if (removedPiSystemsRef.current.has(piName)) {
        console.log("[Dashboard] Ignoring message from removed pi:", piName);
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
      console.log(
        "[Dashboard] Received message on stats topic, size:",
        payload.length
      );
      const baseMessage = StatusBase.decode(payload);
      console.log("[Dashboard] Decoded base message, type:", baseMessage.type);

      if (baseMessage.type !== StatusType.SYSTEM_STATUS) {
        console.warn(
          "[Dashboard] Message is not SYSTEM_STATUS, type:",
          baseMessage.type
        );
        return;
      }

      const status = PiStatus.decode(payload);
      const piName = status.piName || null;
      console.log("[Dashboard] Decoded status message from pi:", piName);

      if (!piName) {
        console.warn("Received SYSTEM_STATUS message without pi_name");
        return;
      }

      // Ignore messages from intentionally removed Pi systems
      if (removedPiSystemsRef.current.has(piName)) {
        console.log("[Dashboard] Ignoring message from removed pi:", piName);
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

  // Subscribe to both log topic and stats topic (only when connected)
  useEffect(() => {
    if (!topic.trim()) {
      return;
    }

    // Wait for connection before subscribing
    if (!isConnected) {
      console.log("[Dashboard] Waiting for connection before subscribing...");
      return;
    }

    const logTopic = topic;
    const statsTopic = `${topic}/stats`;

    console.log(
      "[Dashboard] Subscribing to topics - logs:",
      logTopic,
      "stats:",
      statsTopic
    );

    // Unsubscribe from previous topics if they exist
    if (logSubscriptionRef.current) {
      try {
        client.unsubscribe(logSubscriptionRef.current);
      } catch {
        // Ignore unsubscribe errors
      }
      logSubscriptionRef.current = null;
    }
    if (statsSubscriptionRef.current) {
      try {
        client.unsubscribe(statsSubscriptionRef.current);
      } catch {
        // Ignore unsubscribe errors
      }
      statsSubscriptionRef.current = null;
    }

    // Verify connection is still active before subscribing
    if (!client.isConnected()) {
      console.warn(
        "[Dashboard] Connection not active, will retry when reconnected"
      );
      return;
    }

    // Subscribe to log topic (for LogMessage)
    try {
      console.log("[Dashboard] Subscribing to log topic:", logTopic);
      client.subscribe(logTopic, handleLogMessage);
      logSubscriptionRef.current = logTopic;
      console.log("[Dashboard] ✓ Subscribed to log topic:", logTopic);
    } catch (error) {
      console.error("[Dashboard] ✗ Failed to subscribe to log topic:", error);
      logSubscriptionRef.current = null;
    }

    // Subscribe to stats topic (for PiStatus)
    try {
      console.log("[Dashboard] Subscribing to stats topic:", statsTopic);
      client.subscribe(statsTopic, handleStatsMessage);
      statsSubscriptionRef.current = statsTopic;
      console.log("[Dashboard] ✓ Subscribed to stats topic:", statsTopic);
    } catch (error) {
      console.error("[Dashboard] ✗ Failed to subscribe to stats topic:", error);
      statsSubscriptionRef.current = null;
    }

    return () => {
      if (logSubscriptionRef.current) {
        try {
          client.unsubscribe(logSubscriptionRef.current);
        } catch {
          // Ignore unsubscribe errors
        }
        logSubscriptionRef.current = null;
      }
      if (statsSubscriptionRef.current) {
        try {
          client.unsubscribe(statsSubscriptionRef.current);
        } catch {
          // Ignore unsubscribe errors
        }
        statsSubscriptionRef.current = null;
      }
    };
  }, [topic, client, handleLogMessage, handleStatsMessage, isConnected]);

  const addPiSystem = useCallback((piName: string) => {
    if (!piName.trim()) return;

    // Remove from the removed list if it was previously removed
    removedPiSystemsRef.current.delete(piName);

    // Initialize Pi system data if it doesn't exist
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
    // Add to the removed list to ignore future messages
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
    const activeSystems = systems.filter((s) => s.status && s.isConnected);

    const average = (arr: number[]) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      totalPis: systems.length,
      activePis: activeSystems.length,
      avgCpuUsage: average(
        activeSystems.map((s) => s.status?.cpuUsageTotal || 0)
      ),
      avgMemoryUsage: average(
        activeSystems.map((s) => s.status?.memoryUsage || 0)
      ),
      totalNetworkIn: activeSystems.reduce(
        (sum, s) => sum + (s.status?.netUsageIn || 0),
        0
      ),
      totalNetworkOut: activeSystems.reduce(
        (sum, s) => sum + (s.status?.netUsageOut || 0),
        0
      ),
    };
  }, [piSystems]);

  return {
    piSystems,
    globalStats,
    isConnected,
    topic,
    setTopic,
    addPiSystem,
    removePiSystem,
    clearLogs,
  };
}
