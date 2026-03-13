"use client";

import { useEffect, useMemo, useState } from "react";
import { NetworkTablesTypeInfos } from "ntcore-ts-client";
import { hasBridge, subscribeNtTopic } from "@/lib/blitzRenderer";
import {
  ADJUSTING_VELOCITY_TOPIC,
  SHOULD_ADJUST_VELOCITY_TOPIC,
} from "./laneAlignmentTopics";

interface LaneTopicSignal {
  hasValue: boolean;
  value: boolean;
  updatedAt: number | null;
  isConnected: boolean;
}

export interface LaneAlignmentSignalState {
  hasValue: boolean;
  value: boolean | null;
  updatedAt: number | null;
  isConnected: boolean;
  source: "shouldAdjustVelocity" | "adjustingVelocity" | null;
  topics: {
    shouldAdjustVelocity: LaneTopicSignal;
    adjustingVelocity: LaneTopicSignal;
  };
}

const EMPTY_SIGNAL: LaneTopicSignal = {
  hasValue: false,
  value: false,
  updatedAt: null,
  isConnected: false,
};

export function useLaneAlignmentSignal(): LaneAlignmentSignalState {
  const [shouldAdjustVelocity, setShouldAdjustVelocity] =
    useState<LaneTopicSignal>(EMPTY_SIGNAL);
  const [adjustingVelocity, setAdjustingVelocity] =
    useState<LaneTopicSignal>(EMPTY_SIGNAL);

  useEffect(() => {
    if (!hasBridge()) {
      setShouldAdjustVelocity(EMPTY_SIGNAL);
      setAdjustingVelocity(EMPTY_SIGNAL);
      return;
    }

    let disposed = false;
    let cleanupShould = () => {};
    let cleanupAdjusting = () => {};

    void subscribeNtTopic<boolean>(
      {
        topicPath: SHOULD_ADJUST_VELOCITY_TOPIC,
        typeInfo: NetworkTablesTypeInfos.kBoolean,
        defaultValue: false,
      },
      (update) => {
        if (disposed) return;

        setShouldAdjustVelocity((prev) => ({
          hasValue: prev.hasValue || update.hasValue,
          value: update.hasValue ? update.value : prev.value,
          updatedAt: update.hasValue ? Date.now() : prev.updatedAt,
          isConnected: update.isConnected,
        }));
      },
    ).then((cleanup) => {
      if (disposed) {
        cleanup();
        return;
      }
      cleanupShould = cleanup;
    });

    void subscribeNtTopic<boolean>(
      {
        topicPath: ADJUSTING_VELOCITY_TOPIC,
        typeInfo: NetworkTablesTypeInfos.kBoolean,
        defaultValue: false,
      },
      (update) => {
        if (disposed) return;

        setAdjustingVelocity((prev) => ({
          hasValue: prev.hasValue || update.hasValue,
          value: update.hasValue ? update.value : prev.value,
          updatedAt: update.hasValue ? Date.now() : prev.updatedAt,
          isConnected: update.isConnected,
        }));
      },
    ).then((cleanup) => {
      if (disposed) {
        cleanup();
        return;
      }
      cleanupAdjusting = cleanup;
    });

    return () => {
      disposed = true;
      cleanupShould();
      cleanupAdjusting();
    };
  }, []);

  return useMemo(() => {
    const preferShouldAdjustVelocity = shouldAdjustVelocity.hasValue;
    const source = preferShouldAdjustVelocity
      ? "shouldAdjustVelocity"
      : adjustingVelocity.hasValue
        ? "adjustingVelocity"
        : null;

    const hasValue = source !== null;
    const value = source === null
      ? null
      : source === "shouldAdjustVelocity"
        ? shouldAdjustVelocity.value
        : adjustingVelocity.value;
    const updatedAt = source === null
      ? null
      : source === "shouldAdjustVelocity"
        ? shouldAdjustVelocity.updatedAt
        : adjustingVelocity.updatedAt;

    return {
      hasValue,
      value,
      updatedAt,
      isConnected: shouldAdjustVelocity.isConnected || adjustingVelocity.isConnected,
      source,
      topics: {
        shouldAdjustVelocity,
        adjustingVelocity,
      },
    };
  }, [adjustingVelocity, shouldAdjustVelocity]);
}
