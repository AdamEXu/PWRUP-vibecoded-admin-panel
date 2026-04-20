"use client";

import { useEffect, useMemo, useState } from "react";
import { NetworkTablesTypeInfos } from "ntcore-ts-client";
import { hasBridge, subscribeNtTopic } from "@/lib/blitzRenderer";
import { ADJUSTING_VELOCITY_TOPIC } from "./laneAlignmentTopics";

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
}

const EMPTY_SIGNAL: LaneTopicSignal = {
  hasValue: false,
  value: false,
  updatedAt: null,
  isConnected: false,
};

export function useLaneAlignmentSignal(): LaneAlignmentSignalState {
  const [adjustingVelocity, setAdjustingVelocity] =
    useState<LaneTopicSignal>(EMPTY_SIGNAL);

  useEffect(() => {
    if (!hasBridge()) {
      setAdjustingVelocity(EMPTY_SIGNAL);
      return;
    }

    let disposed = false;
    let cleanupAdjusting = () => {};

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
      cleanupAdjusting();
    };
  }, []);

  return useMemo(() => ({
    hasValue: adjustingVelocity.hasValue,
    value: adjustingVelocity.hasValue ? adjustingVelocity.value : null,
    updatedAt: adjustingVelocity.updatedAt,
    isConnected: adjustingVelocity.isConnected,
  }), [adjustingVelocity]);
}
