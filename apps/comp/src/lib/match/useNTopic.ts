"use client";

import { useEffect, useRef, useState } from "react";
import type {
  NetworkTablesTypeInfo,
  NetworkTablesTypes,
} from "ntcore-ts-client";
import { hasBridge, subscribeNtTopic } from "@/lib/blitzRenderer";

/**
 * Generic, single-topic NetworkTables subscription hook.
 *
 * In Electron runtime, subscriptions are owned by the main-process bridge so
 * both visible windows share one upstream NT connection.
 */
export function useNTopic<T extends NetworkTablesTypes>(
  topicPath: string,
  typeInfo: NetworkTablesTypeInfo,
  defaultValue: T,
): { value: T; isConnected: boolean } {
  const [value, setValue] = useState<T>(defaultValue);
  const [isConnected, setIsConnected] = useState(false);
  const lastValueRef = useRef<T>(defaultValue);

  useEffect(() => {
    if (!hasBridge()) {
      setIsConnected(false);
      return;
    }

    let disposed = false;
    let unsubscribe = () => {};

    void subscribeNtTopic<T>(
      {
        topicPath,
        typeInfo,
        defaultValue,
      },
      (update) => {
        if (disposed) {
          return;
        }

        setIsConnected(update.isConnected);
        if (update.hasValue) {
          lastValueRef.current = update.value;
          setValue(update.value);
        } else {
          setValue(lastValueRef.current);
        }
      },
    ).then((cleanup) => {
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
  }, [defaultValue, topicPath, typeInfo]);

  return { value, isConnected };
}
