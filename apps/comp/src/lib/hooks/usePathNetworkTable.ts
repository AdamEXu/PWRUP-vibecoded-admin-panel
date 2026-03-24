"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NetworkTablesTypeInfos } from "ntcore-ts-client";
import { ntSelectedPathTopics, useSettings } from "@/lib/settings";
import { getBridge, hasBridge, subscribeNtTopic } from "@/lib/blitzRenderer";

export interface PathNetworkTableState {
  robotIp: string;
  topic: string;
  requestTopic: string;
  stateTopic: string;
  isConnected: boolean;
  selectedAutoFromRobot: string | null;
  lastUpdatedMs: number | null;
  publishSelectedAuto: (autoName: string) => Promise<void>;
  lastPublishMs: number | null;
  publishError: string | null;
}

export function usePathNetworkTable(): PathNetworkTableState {
  const { settings } = useSettings();
  const [isConnected, setIsConnected] = useState(false);
  const [selectedAutoFromRobot, setSelectedAutoFromRobot] = useState<string | null>(null);
  const [lastUpdatedMs, setLastUpdatedMs] = useState<number | null>(null);
  const [lastPublishMs, setLastPublishMs] = useState<number | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const queuedRequestRef = useRef<string | null>(null);

  const robotIp = useMemo(
    () => settings.networkTables.host.trim(),
    [settings.networkTables.host],
  );
  const bridgeAvailable = hasBridge();
  const canSubscribe = bridgeAvailable && robotIp.length > 0;

  const { requestTopic: requestTopicPath, stateTopic: stateTopicPath } = useMemo(
    () =>
      ntSelectedPathTopics(
        settings.networkTables.sharedTable,
        settings.networkTables.selectedPathTopic,
      ),
    [settings.networkTables.selectedPathTopic, settings.networkTables.sharedTable],
  );
  const topic = stateTopicPath;

  const normalizeAutoName = useCallback((autoName: string): string => {
    const trimmed = autoName.trim();
    return trimmed.length > 0 ? trimmed : "NONE";
  }, []);

  const flushQueuedRequest = useCallback(async () => {
    if (!queuedRequestRef.current || !hasBridge()) {
      return;
    }

    const nextValue = queuedRequestRef.current;
    await getBridge().nt.publish({
      topicPath: requestTopicPath,
      typeInfo: NetworkTablesTypeInfos.kString,
      defaultValue: "NONE",
      value: nextValue,
    });
    setPublishError(null);
    setLastPublishMs(Date.now());

    if (queuedRequestRef.current === nextValue) {
      queuedRequestRef.current = null;
    }
  }, [requestTopicPath]);

  useEffect(() => {
    if (!canSubscribe) {
      return;
    }

    let disposed = false;
    let unsubscribe = () => {};

    void subscribeNtTopic<string>(
      {
        topicPath: stateTopicPath,
        typeInfo: NetworkTablesTypeInfos.kString,
        defaultValue: "NONE",
      },
      (update) => {
        if (disposed) {
          return;
        }

        setIsConnected(update.isConnected);

        if (!update.isConnected) {
          setSelectedAutoFromRobot(null);
          setLastUpdatedMs(Date.now());
          return;
        }

        const trimmed = update.value.trim();
        setSelectedAutoFromRobot(!trimmed || trimmed.toUpperCase() === "NONE" ? null : trimmed);
        setLastUpdatedMs(Date.now());
        if (queuedRequestRef.current !== null) {
          void flushQueuedRequest().catch((error) => {
            const message = error instanceof Error ? error.message : String(error);
            setPublishError(message);
          });
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
  }, [canSubscribe, flushQueuedRequest, stateTopicPath]);

  const publishSelectedAuto = useCallback(
    async (autoName: string) => {
      queuedRequestRef.current = normalizeAutoName(autoName);
      setPublishError(null);

      if (!canSubscribe || !isConnected) {
        return;
      }

      try {
        await flushQueuedRequest();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setPublishError(message);
        throw error;
      }
    },
    [canSubscribe, flushQueuedRequest, isConnected, normalizeAutoName],
  );

  return {
    robotIp,
    topic,
    requestTopic: requestTopicPath,
    stateTopic: stateTopicPath,
    isConnected: canSubscribe ? isConnected : false,
    selectedAutoFromRobot: canSubscribe ? selectedAutoFromRobot : null,
    lastUpdatedMs: canSubscribe ? lastUpdatedMs : null,
    publishSelectedAuto,
    lastPublishMs,
    publishError,
  };
}
