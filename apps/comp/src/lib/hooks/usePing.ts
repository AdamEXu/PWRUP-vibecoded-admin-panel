// src/lib/hooks/usePing.ts - Purpose: ping/pong latency measurement for Pi systems
"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Address, AutobahnClient } from "autobahn-client";
import { Ping, Pong } from "@pwrup/shared-proto/status/PiStatus";
import { useSettings } from "@/lib/settings";

export interface PingResult {
  piName: string;
  latency: number; // in milliseconds
  timestamp: Date;
}

type PendingPing = {
  sentAtMs: number;
  pingTimestampMs: string;
  timeoutId: ReturnType<typeof setTimeout>;
  resolve?: (latencyMs: number) => void;
  reject?: (error: Error) => void;
};

function sleepMs(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function usePing() {
  const { settings } = useSettings();
  const client = useMemo(
    () => new AutobahnClient(new Address(settings.host, settings.port)),
    [settings.host, settings.port]
  );
  const [pingResults, setPingResults] = useState<Map<string, PingResult>>(
    new Map()
  );
  const [isConnected, setIsConnected] = useState(false);
  const pendingPingsRef = useRef<Map<string, PendingPing>>(new Map()); // piName -> pending ping info
  const pongSubscriptionRef = useRef<string | null>(null);

  const clearPendingPing = useCallback((piName: string, error?: Error) => {
    const pending = pendingPingsRef.current.get(piName);
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    pendingPingsRef.current.delete(piName);
    if (error && pending.reject) pending.reject(error);
  }, []);

  // Initialize connection
  useEffect(() => {
    let cancelled = false;

    const checkConnection = () => {
      if (cancelled) return;
      try {
        const connected = client.isConnected();
        setIsConnected(connected);
        return connected;
      } catch {
        setIsConnected(false);
        return false;
      }
    };

    try {
      client.begin();
    } catch (error) {
      console.error("[Ping] Error starting connection:", error);
      setIsConnected(false);
    }

    checkConnection();

    const intervalId = setInterval(() => {
      checkConnection();
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [client]);

  // Subscribe to pong topic
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const pongTopic = "pi-pong";

    const handlePong = async (payload: Uint8Array) => {
      try {
        const pong = Pong.decode(payload);
        const piName = pong.piName;
        if (!piName) return;

        // Find the corresponding ping
        const pending = pendingPingsRef.current.get(piName);
        if (!pending) return;

        // Only accept pongs that correlate to our last ping for this Pi.
        if (!pong.timestampMsOriginal || pong.timestampMsOriginal === "0")
          return;
        if (pong.timestampMsOriginal !== pending.pingTimestampMs) return;

        // Calculate round trip latency
        const roundTripLatency = Math.max(0, Date.now() - pending.sentAtMs);

        // Remove from pending
        clearPendingPing(piName);
        if (pending.resolve) pending.resolve(roundTripLatency);

        setPingResults((prev) => {
          const updated = new Map(prev);
          updated.set(piName, {
            piName,
            latency: roundTripLatency,
            timestamp: new Date(),
          });
          return updated;
        });
      } catch (error) {
        console.error("[Ping] Failed to decode pong:", error);
      }
    };

    try {
      client.subscribe(pongTopic, handlePong);
      pongSubscriptionRef.current = pongTopic;
    } catch (error) {
      console.error("[Ping] Failed to subscribe to pong topic:", error);
    }

    return () => {
      if (pongSubscriptionRef.current) {
        try {
          client.unsubscribe(pongSubscriptionRef.current);
        } catch {
          // Ignore unsubscribe errors
        }
        pongSubscriptionRef.current = null;
      }
    };
  }, [client, isConnected, clearPendingPing]);

  const sendPingAwait = useCallback(
    async (piName: string, timeoutMs: number = 2000): Promise<number> => {
      if (!isConnected || !client.isConnected()) {
        throw new Error("Not connected");
      }

      const timestampMs = Date.now();
      const pingTimestampMs = BigInt(timestampMs).toString();
      const pingTopic = "pi-ping";
      const pingBytes = Ping.encode(
        Ping.create({ timestamp: pingTimestampMs })
      ).finish();

      // Replace any existing pending ping for this Pi.
      clearPendingPing(piName, new Error("Superseded by a newer ping"));

      const latency = await new Promise<number>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          pendingPingsRef.current.delete(piName);
          reject(new Error("Ping timed out"));
        }, timeoutMs);

        pendingPingsRef.current.set(piName, {
          sentAtMs: timestampMs,
          pingTimestampMs,
          timeoutId,
          resolve,
          reject,
        });

        client.publish(pingTopic, pingBytes);
      });

      return latency;
    },
    [client, clearPendingPing, isConnected]
  );

  const sendPing = useCallback(
    (piName: string) => {
      if (!isConnected || !client.isConnected()) {
        console.warn("[Ping] Cannot send ping - not connected");
        return;
      }

      try {
        const pingTopic = "pi-ping";
        const timestampMs = Date.now();
        const pingTimestampMs = BigInt(timestampMs).toString();
        const pingBytes = Ping.encode(
          Ping.create({ timestamp: pingTimestampMs })
        ).finish();

        // Store the sent timestamp for this specific pi (best-effort)
        clearPendingPing(piName);
        const timeoutId = setTimeout(() => {
          pendingPingsRef.current.delete(piName);
        }, 2000);
        pendingPingsRef.current.set(piName, {
          sentAtMs: timestampMs,
          pingTimestampMs,
          timeoutId,
        });

        // Publish ping (all backends will respond)
        client.publish(pingTopic, pingBytes);
      } catch (error) {
        console.error("[Ping] Failed to send ping:", error);
        clearPendingPing(piName);
      }
    },
    [client, clearPendingPing, isConnected]
  );

  const pingAll = useCallback(
    (piNames: string[]) => {
      piNames.forEach((piName) => {
        sendPing(piName);
      });
    },
    [sendPing]
  );

  const runPingTest = useCallback(
    async (piName: string, count: number = 20, intervalMs: number = 50) => {
      const samples: Array<number | null> = [];

      for (let i = 0; i < count; i += 1) {
        try {
          // Wait for each response to avoid pending ping overwrites.
          const latency = await sendPingAwait(piName, 2000);
          samples.push(latency);
        } catch {
          samples.push(null);
        }

        if (i < count - 1) {
          await sleepMs(intervalMs);
        }
      }

      return samples;
    },
    [sendPingAwait]
  );

  useEffect(() => {
    const pending = pendingPingsRef.current;
    return () => {
      pending.forEach((p) => clearTimeout(p.timeoutId));
      pending.clear();
    };
  }, []);

  return {
    pingResults,
    sendPing,
    pingAll,
    isConnected,
    runPingTest,
  };
}
