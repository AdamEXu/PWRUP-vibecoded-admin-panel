// src/lib/useSubscription.ts - Purpose: hook to wire a topic subscription lifecycle
"use client";

import { useEffect, useRef } from "react";
import type { AutobahnClient } from "autobahn-client";

/**
 * Subscribe to a pub/sub topic and invoke `callback` on each message.
 *
 * @param topic    The topic string to subscribe to.
 * @param callback Called with the raw payload bytes whenever a message arrives.
 * @param client   The AutobahnClient instance (should be created outside and reused).
 */
export function useSubscription(
  topic: string,
  callback: (payload: Uint8Array) => Promise<void>,
  client: AutobahnClient,
  enabled: boolean = true
) {
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    client.subscribe(topic, async (payload) => {
      await callbackRef.current(payload);
    });

    return () => {
      client.unsubscribe(topic);
    };
  }, [topic, client, enabled]);
}
