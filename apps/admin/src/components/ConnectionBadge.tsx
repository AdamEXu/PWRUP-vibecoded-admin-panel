// src/components/ConnectionBadge.tsx - Purpose: client-side connection status badge using settings
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Address, AutobahnClient } from "autobahn-client";
import { useSettings } from "@/lib/settings";
import { ConnectionStatus } from "@/components/dashboard/ConnectionStatus";

export function ConnectionBadge() {
  const { settings } = useSettings();
  const client = useMemo(
    () => new AutobahnClient(new Address(settings.host, settings.port)),
    [settings.host, settings.port]
  );
  const [connected, setConnected] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Suppress WebSocket errors - Next.js wraps console.error calls
    const originalConsoleError = console.error;

    // Global error handler to catch WebSocket errors
    const errorHandler = (event: ErrorEvent) => {
      if (
        event.message?.includes("WebSocket error") ||
        event.error?.message?.includes("WebSocket error") ||
        (event.error instanceof Error &&
          event.error.message === "" &&
          event.error.stack?.includes("ws.onerror"))
      ) {
        event.preventDefault();
        return;
      }
    };

    window.addEventListener("error", errorHandler);

    // Override console.error to filter WebSocket errors
    console.error = (...args: unknown[]) => {
      // Check if this is a WebSocket error we want to suppress
      const errorMessage = args[0];
      if (
        typeof errorMessage === "string" &&
        errorMessage.includes("WebSocket error")
      ) {
        // Suppress WebSocket connection errors - they're expected when server is unavailable
        return;
      }
      // Check for Error objects with WebSocket in the message
      if (
        errorMessage instanceof Error &&
        errorMessage.message.includes("WebSocket error")
      ) {
        return;
      }
      // Check for empty error objects (common with WebSocket failures)
      if (
        args.length === 1 &&
        errorMessage instanceof Error &&
        errorMessage.message === "" &&
        errorMessage.stack?.includes("ws.onerror")
      ) {
        return;
      }
      originalConsoleError(...args);
    };

    // reflect current state immediately if available
    try {
      setConnected(client.isConnected());
    } catch {
      setConnected(false);
    }

    // attempt to connect and set when resolved/rejected
    // Wrap in try-catch to prevent errors from propagating
    Promise.resolve()
      .then(() => {
        try {
          return client.begin();
        } catch (err) {
          // Silently handle connection errors
          return Promise.reject(err);
        }
      })
      .then(() => {
        if (!cancelled) {
          try {
            setConnected(client.isConnected());
          } catch {
            setConnected(false);
          }
        }
      })
      .catch(() => {
        // Silently handle connection failures - this is expected behavior
        if (!cancelled) {
          setConnected(false);
        }
      });

    // poll isConnected periodically to reflect live state
    pollRef.current = window.setInterval(() => {
      try {
        const state = client.isConnected();
        setConnected((prev) => (prev !== state ? state : prev));
      } catch {
        setConnected(false);
      }
    }, 1000);

    return () => {
      cancelled = true;
      window.removeEventListener("error", errorHandler);
      console.error = originalConsoleError; // Restore original console.error
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [client]);

  return <ConnectionStatus isConnected={connected} />;
}
