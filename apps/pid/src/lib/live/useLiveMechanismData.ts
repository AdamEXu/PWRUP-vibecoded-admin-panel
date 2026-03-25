"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NetworkTables, NetworkTablesTypeInfos } from "ntcore-ts-client";
import { liveTopicPath } from "@/lib/analysis/mechanisms";
import type {
  MechanismDefinition,
  NormalizedTrace,
  SignalName,
  SignalSample,
} from "@/lib/analysis/types";
import { usePidAppSettings } from "@/lib/pid-settings";
import { useSettings } from "@/lib/settings";

type SignalBuffer = Record<SignalName, SignalSample[]>;

const EMPTY_TRACE: NormalizedTrace = {
  setpoint: [],
  measurement: [],
  effort: [],
  feedforward: [],
  current: [],
  velocity: [],
};

function createEmptyBuffer(): SignalBuffer {
  return {
    setpoint: [],
    measurement: [],
    effort: [],
    feedforward: [],
    current: [],
    velocity: [],
  };
}

function pruneSamples(
  samples: SignalSample[],
  liveWindowSeconds: number,
  maxSamplesPerSignal: number,
  currentTimeSec: number,
) {
  const cutoff = currentTimeSec - liveWindowSeconds;
  const next = samples.filter((sample) => sample.timeSec >= cutoff);
  if (next.length > maxSamplesPerSignal) {
    next.splice(0, next.length - maxSamplesPerSignal);
  }
  return next;
}

function toTrace(buffer: SignalBuffer): NormalizedTrace {
  return {
    setpoint: buffer.setpoint,
    measurement: buffer.measurement,
    effort: buffer.effort,
    feedforward: buffer.feedforward,
    current: buffer.current,
    velocity: buffer.velocity,
  };
}

export function useLiveMechanismData(mechanism: MechanismDefinition) {
  const { settings } = useSettings();
  const { settings: appSettings } = usePidAppSettings();
  const bufferRef = useRef<SignalBuffer>(createEmptyBuffer());
  const activeSourceRef = useRef<Partial<Record<SignalName, string>>>({});
  const publishTimerRef = useRef<number | null>(null);
  const [trace, setTrace] = useState<NormalizedTrace>(EMPTY_TRACE);
  const [isConnected, setIsConnected] = useState(false);
  const [sourceMap, setSourceMap] = useState<Partial<Record<SignalName, string>>>({});

  const topicPlan = useMemo(() => {
    const entries: Array<{ signal: SignalName; topicPath: string }> = [];
    for (const [signal, config] of Object.entries(mechanism.signals) as Array<
      [SignalName, MechanismDefinition["signals"][SignalName]]
    >) {
      if (!config) {
        continue;
      }

      for (const key of config.candidateKeys) {
        entries.push({ signal, topicPath: liveTopicPath(key) });
      }
    }
    return entries;
  }, [mechanism]);

  useEffect(() => {
    bufferRef.current = createEmptyBuffer();
    activeSourceRef.current = {};
    setTrace(EMPTY_TRACE);
    setSourceMap({});
  }, [mechanism.id]);

  useEffect(() => {
    const robotIp = settings.networkTables.host.trim();
    if (!robotIp) {
      setIsConnected(false);
      return;
    }

    const nt = NetworkTables.getInstanceByURI(robotIp, settings.networkTables.port);
    const cleanupFns: Array<() => void> = [];

    const flush = () => {
      publishTimerRef.current = null;
      setTrace(toTrace(bufferRef.current));
      setSourceMap({ ...activeSourceRef.current });
    };

    const scheduleFlush = () => {
      if (publishTimerRef.current !== null) {
        return;
      }
      publishTimerRef.current = window.setTimeout(flush, 120);
    };

    const removeConnectionListener = nt.addRobotConnectionListener((connected) => {
      setIsConnected(connected);
    }, true);
    cleanupFns.push(removeConnectionListener);

    for (const entry of topicPlan) {
      const topic = nt.createTopic<number>(
        entry.topicPath,
        NetworkTablesTypeInfos.kDouble,
        0,
      );

      const subUid = topic.subscribe((value) => {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          return;
        }

        const timeSec = performance.now() / 1000;
        const current = bufferRef.current[entry.signal] ?? [];
        const next = pruneSamples(
          [...current, { timeSec, value }],
          appSettings.liveWindowSeconds,
          appSettings.maxSamplesPerSignal,
          timeSec,
        );
        bufferRef.current[entry.signal] = next;
        if (!activeSourceRef.current[entry.signal]) {
          activeSourceRef.current[entry.signal] = entry.topicPath;
        }
        scheduleFlush();
      });

      cleanupFns.push(() => topic.unsubscribe(subUid));
    }

    return () => {
      for (const cleanup of cleanupFns) {
        cleanup();
      }
      if (publishTimerRef.current !== null) {
        window.clearTimeout(publishTimerRef.current);
        publishTimerRef.current = null;
      }
    };
  }, [
    appSettings.liveWindowSeconds,
    appSettings.maxSamplesPerSignal,
    settings.networkTables.host,
    settings.networkTables.port,
    topicPlan,
  ]);

  return {
    trace,
    isConnected,
    sourceMap,
    clear: () => {
      bufferRef.current = createEmptyBuffer();
      activeSourceRef.current = {};
      setTrace(EMPTY_TRACE);
      setSourceMap({});
    },
  };
}
