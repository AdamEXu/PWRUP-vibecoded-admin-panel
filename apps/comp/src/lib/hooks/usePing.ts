// src/lib/hooks/usePing.ts - Purpose: ping/pong latency measurement for Pi systems
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Ping, Pong } from "@pwrup/shared-proto/status/PiStatus";
import {
  getBridge,
  hasBridge,
  subscribeAutobahnStatus,
  subscribeAutobahnTopic,
} from "@/lib/blitzRenderer";

export interface PingResult {
  piName: string;
  latency: number;
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
  const [pingResults, setPingResults] = useState<Map<string, PingResult>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const pendingPingsRef = useRef<Map<string, PendingPing>>(new Map());
  const bridgeAvailable = hasBridge();

  const clearPendingPing = useCallback((piName: string, error?: Error) => {
    const pending = pendingPingsRef.current.get(piName);
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    pendingPingsRef.current.delete(piName);
    if (error && pending.reject) pending.reject(error);
  }, []);

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

  useEffect(() => {
    if (!hasBridge()) {
      return;
    }

    let disposed = false;
    let unsubscribe = () => {};

    const handlePong = async (payload: Uint8Array) => {
      try {
        const pong = Pong.decode(payload);
        const piName = pong.piName;
        if (!piName) return;

        const pending = pendingPingsRef.current.get(piName);
        if (!pending) return;
        if (!pong.timestampMsOriginal || pong.timestampMsOriginal === "0") return;
        if (pong.timestampMsOriginal !== pending.pingTimestampMs) return;

        const roundTripLatency = Math.max(0, Date.now() - pending.sentAtMs);

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

    void subscribeAutobahnTopic("pi-pong", async (update) => {
      if (disposed || !update.payload) {
        return;
      }
      await handlePong(update.payload);
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
  }, [clearPendingPing]);

  const sendPingAwait = useCallback(
    async (piName: string, timeoutMs = 2000): Promise<number> => {
      if (!hasBridge() || !isConnected) {
        throw new Error("Not connected");
      }

      const timestampMs = Date.now();
      const pingTimestampMs = BigInt(timestampMs).toString();
      const pingBytes = Ping.encode(
        Ping.create({ timestamp: pingTimestampMs }),
      ).finish();

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

        void getBridge().autobahn.publish({
          topic: "pi-ping",
          payload: pingBytes,
        });
      });

      return latency;
    },
    [clearPendingPing, isConnected],
  );

  const sendPing = useCallback(
    (piName: string) => {
      if (!hasBridge() || !isConnected) {
        console.warn("[Ping] Cannot send ping - not connected");
        return;
      }

      try {
        const timestampMs = Date.now();
        const pingTimestampMs = BigInt(timestampMs).toString();
        const pingBytes = Ping.encode(
          Ping.create({ timestamp: pingTimestampMs }),
        ).finish();

        clearPendingPing(piName);
        const timeoutId = setTimeout(() => {
          pendingPingsRef.current.delete(piName);
        }, 2000);
        pendingPingsRef.current.set(piName, {
          sentAtMs: timestampMs,
          pingTimestampMs,
          timeoutId,
        });

        void getBridge().autobahn.publish({
          topic: "pi-ping",
          payload: pingBytes,
        });
      } catch (error) {
        console.error("[Ping] Failed to send ping:", error);
        clearPendingPing(piName);
      }
    },
    [clearPendingPing, isConnected],
  );

  const pingAll = useCallback(
    (piNames: string[]) => {
      piNames.forEach((piName) => {
        sendPing(piName);
      });
    },
    [sendPing],
  );

  const runPingTest = useCallback(
    async (piName: string, count = 20, intervalMs = 50) => {
      const samples: Array<number | null> = [];

      for (let i = 0; i < count; i += 1) {
        try {
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
    [sendPingAwait],
  );

  useEffect(() => {
    const pending = pendingPingsRef.current;
    return () => {
      pending.forEach((entry) => clearTimeout(entry.timeoutId));
      pending.clear();
    };
  }, []);

  return {
    pingResults,
    isConnected: bridgeAvailable ? isConnected : false,
    sendPing,
    pingAll,
    runPingTest,
  };
}
