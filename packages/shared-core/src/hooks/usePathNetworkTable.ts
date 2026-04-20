"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NetworkTables, NetworkTablesTypeInfos } from "ntcore-ts-client";
import { ntSelectedPathTopics, useSettings } from "../settings";

type StringTopicApi = {
  publish: () => Promise<void | unknown>;
  setValue: (value: string) => void;
  subscribe: (callback: (nextValue: string | null) => void) => number;
  unsubscribe: (subUid: number) => void;
};

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

  const requestTopicRef = useRef<StringTopicApi | null>(null);
  const stateTopicRef = useRef<StringTopicApi | null>(null);
  const publishPromiseRef = useRef<Promise<unknown> | null>(null);
  const flushPromiseRef = useRef<Promise<void> | null>(null);
  const isPublishedRef = useRef(false);
  const queuedRequestRef = useRef<string | null>(null);
  const wasConnectedRef = useRef(false);

  const robotIp = useMemo(
    () => settings.networkTables.host.trim(),
    [settings.networkTables.host],
  );

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

  const ensureRequestPublished = useCallback(async () => {
    const requestTopic = requestTopicRef.current;
    if (!requestTopic) {
      throw new Error("NetworkTables request topic is not ready.");
    }
    if (!isConnected) {
      throw new Error("NetworkTables is not connected.");
    }
    if (isPublishedRef.current) return;

    if (!publishPromiseRef.current) {
      publishPromiseRef.current = (async () => {
        await requestTopic.publish();
        isPublishedRef.current = true;
      })().catch((error) => {
        publishPromiseRef.current = null;
        isPublishedRef.current = false;
        throw error;
      });
    }

    await publishPromiseRef.current;
  }, [isConnected]);

  const flushQueuedRequest = useCallback(async () => {
    if (flushPromiseRef.current) {
      return flushPromiseRef.current;
    }

    const run = async () => {
      while (queuedRequestRef.current !== null) {
        const requestTopic = requestTopicRef.current;
        if (!requestTopic) {
          throw new Error("NetworkTables request topic is not ready.");
        }

        const valueToSend = queuedRequestRef.current;
        await ensureRequestPublished();
        requestTopic.setValue(valueToSend);
        setPublishError(null);
        setLastPublishMs(Date.now());

        if (queuedRequestRef.current === valueToSend) {
          queuedRequestRef.current = null;
        }
      }
    };

    flushPromiseRef.current = run().finally(() => {
      flushPromiseRef.current = null;
    });
    return flushPromiseRef.current;
  }, [ensureRequestPublished]);

  useEffect(() => {
    if (!robotIp) {
      setIsConnected(false);
      setSelectedAutoFromRobot(null);
      setLastUpdatedMs(Date.now());
      requestTopicRef.current = null;
      stateTopicRef.current = null;
      publishPromiseRef.current = null;
      flushPromiseRef.current = null;
      isPublishedRef.current = false;
      wasConnectedRef.current = false;
      return;
    }

    const nt = NetworkTables.getInstanceByURI(robotIp, settings.networkTables.port);
    const requestTopic = nt.createTopic<string>(
      requestTopicPath,
      NetworkTablesTypeInfos.kString,
      "NONE",
    );
    const stateTopic = nt.createTopic<string>(stateTopicPath, NetworkTablesTypeInfos.kString, "NONE");

    requestTopicRef.current = requestTopic;
    stateTopicRef.current = stateTopic;
    publishPromiseRef.current = null;
    flushPromiseRef.current = null;
    isPublishedRef.current = false;
    wasConnectedRef.current = false;

    const removeConnectionListener = nt.addRobotConnectionListener((connected) => {
      setIsConnected(connected);

      if (!connected) {
        setSelectedAutoFromRobot(null);
        setLastUpdatedMs(Date.now());
        publishPromiseRef.current = null;
        flushPromiseRef.current = null;
        isPublishedRef.current = false;
      } else if (!wasConnectedRef.current && queuedRequestRef.current !== null) {
        void flushQueuedRequest().catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          setPublishError(message);
        });
      }

      wasConnectedRef.current = connected;
    }, true);

    const subUid = stateTopic.subscribe((nextValue) => {
      if (typeof nextValue !== "string") return;

      const trimmed = nextValue.trim();
      setSelectedAutoFromRobot(!trimmed || trimmed.toUpperCase() === "NONE" ? null : trimmed);
      setLastUpdatedMs(Date.now());
    });

    return () => {
      removeConnectionListener();
      stateTopic.unsubscribe(subUid);
      requestTopicRef.current = null;
      stateTopicRef.current = null;
      publishPromiseRef.current = null;
      flushPromiseRef.current = null;
      isPublishedRef.current = false;
      wasConnectedRef.current = false;
    };
  }, [flushQueuedRequest, requestTopicPath, robotIp, settings.networkTables.port, stateTopicPath]);

  const publishSelectedAuto = useCallback(
    async (autoName: string) => {
      if (!requestTopicRef.current) {
        throw new Error("NetworkTables request topic is not ready.");
      }

      queuedRequestRef.current = normalizeAutoName(autoName);
      setPublishError(null);

      if (!isConnected) {
        // Queue latest request while disconnected; it will be sent on next connect.
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
    [flushQueuedRequest, isConnected, normalizeAutoName],
  );

  useEffect(() => {
    if (!isConnected || queuedRequestRef.current === null) return;

    void flushQueuedRequest().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      setPublishError(message);
    });
  }, [flushQueuedRequest, isConnected]);

  return {
    robotIp,
    topic,
    requestTopic: requestTopicPath,
    stateTopic: stateTopicPath,
    isConnected,
    selectedAutoFromRobot,
    lastUpdatedMs,
    publishSelectedAuto,
    lastPublishMs,
    publishError,
  };
}
