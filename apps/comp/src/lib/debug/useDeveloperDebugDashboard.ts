"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getMainWindowMockState as fetchMainWindowMockState,
  hasBridge,
  hasMainWindowMockControls,
  setMainWindowMockState as updateMainWindowMockState,
  subscribeAutobahnStatus,
  subscribeNtTopic,
  type MainWindowMockState,
} from "@/lib/blitzRenderer";
import { useSettings } from "@/lib/settings";
import {
  buildNtDebugTopicCatalog,
  type NtDebugTopicDescriptor,
  type NtDebugTopicValue,
} from "./ntTopicCatalog";

interface NtTopicLiveState {
  value: NtDebugTopicValue;
  hasValue: boolean;
  isConnected: boolean;
  lastUpdatedMs: number | null;
}

export interface DeveloperDebugTopicRow {
  descriptor: NtDebugTopicDescriptor;
  live: NtTopicLiveState;
  hasOverride: boolean;
  overrideValue: NtDebugTopicValue | null;
  effectiveValue: NtDebugTopicValue;
}

export interface DebugOverridePreset {
  id: string;
  label: string;
  description: string;
  overrides: Array<{
    topicId: string;
    value: NtDebugTopicValue;
  }>;
}

const DEFAULT_MAIN_WINDOW_MOCK_STATE: MainWindowMockState = {
  enabled: false,
  scenario: null,
  url: null,
};

const MOCK_SCENARIOS = [
  "autonomous",
  "transition_shift",
  "shift1",
  "shift2",
  "shift3",
  "shift4",
  "endgame",
  "warning",
  "inactive",
  "camera",
] as const;

const DEBUG_OVERRIDE_PRESETS: readonly DebugOverridePreset[] = [
  {
    id: "auto-start-ready",
    label: "Auto Start Ready",
    description: "Robot enabled in autonomous with healthy baseline telemetry.",
    overrides: [
      { topicId: "matchHud.seq", value: 1 },
      { topicId: "matchHud.connected", value: true },
      { topicId: "matchHud.isRedAlliance", value: true },
      { topicId: "matchHud.enabled", value: true },
      { topicId: "matchHud.autonomous", value: true },
      { topicId: "matchHud.phase", value: 1 },
      { topicId: "matchHud.hubStatus", value: 1 },
      { topicId: "matchHud.headerColor", value: 1 },
      { topicId: "matchHud.totalTimeRemaining", value: 158.2 },
      { topicId: "matchHud.periodTimeRemaining", value: 18.2 },
      { topicId: "matchHud.showShiftIndicator", value: true },
      { topicId: "matchHud.showBuffer", value: false },
      { topicId: "matchHud.gameSpecificMessage", value: "R" },
    ],
  },
  {
    id: "shift-warning-buffer",
    label: "Shift Warning Buffer",
    description: "Teleop warning state with buffer countdown and active shift indicators.",
    overrides: [
      { topicId: "matchHud.seq", value: 24 },
      { topicId: "matchHud.connected", value: true },
      { topicId: "matchHud.enabled", value: true },
      { topicId: "matchHud.autonomous", value: false },
      { topicId: "matchHud.phase", value: 3 },
      { topicId: "matchHud.hubStatus", value: 3 },
      { topicId: "matchHud.headerColor", value: 2 },
      { topicId: "matchHud.totalTimeRemaining", value: 89.6 },
      { topicId: "matchHud.periodTimeRemaining", value: 109.6 },
      { topicId: "matchHud.shiftTimeRemaining", value: 6.2 },
      { topicId: "matchHud.shiftTimeWithBuffer", value: 2.4 },
      { topicId: "matchHud.bufferRemaining", value: 2.4 },
      { topicId: "matchHud.showShiftIndicator", value: true },
      { topicId: "matchHud.showBuffer", value: true },
    ],
  },
  {
    id: "endgame-clutch",
    label: "Endgame Clutch",
    description: "Late-match endgame timing with both hubs active and minimal time remaining.",
    overrides: [
      { topicId: "matchHud.seq", value: 58 },
      { topicId: "matchHud.connected", value: true },
      { topicId: "matchHud.enabled", value: true },
      { topicId: "matchHud.autonomous", value: false },
      { topicId: "matchHud.phase", value: 7 },
      { topicId: "matchHud.hubStatus", value: 1 },
      { topicId: "matchHud.headerColor", value: 1 },
      { topicId: "matchHud.totalTimeRemaining", value: 12.8 },
      { topicId: "matchHud.periodTimeRemaining", value: 12.8 },
      { topicId: "matchHud.shiftTimeRemaining", value: 0 },
      { topicId: "matchHud.shiftTimeWithBuffer", value: 0 },
      { topicId: "matchHud.bufferRemaining", value: 0 },
      { topicId: "matchHud.showShiftIndicator", value: true },
      { topicId: "matchHud.showBuffer", value: false },
    ],
  },
  {
    id: "auto-align-live",
    label: "Auto Align Live",
    description: "Auto-align active with camera topic, distance, and ready signal.",
    overrides: [
      { topicId: "matchHud.seq", value: 91 },
      { topicId: "matchHud.connected", value: true },
      { topicId: "matchHud.autoAlignActive", value: true },
      { topicId: "matchHud.autoAlignReady", value: true },
      { topicId: "matchHud.autoAlignDistance", value: 1.37 },
      { topicId: "matchHud.driverOverride", value: false },
      { topicId: "matchHud.cameraTopic", value: "camera/front_left/video" },
      { topicId: "laneAlignment.shouldAdjustVelocity", value: true },
      { topicId: "laneAlignment.adjustingVelocity", value: true },
    ],
  },
  {
    id: "pathplanner-sync",
    label: "PathPlanner Sync",
    description: "PathPlanner selection synced with a concrete autonomous name.",
    overrides: [
      { topicId: "pathplanner.state", value: "ThreePieceCenterRush" },
      { topicId: "pathplanner.request", value: "ThreePieceCenterRush" },
      { topicId: "matchHud.connected", value: true },
      { topicId: "matchHud.seq", value: 103 },
    ],
  },
  {
    id: "fault-disconnected",
    label: "Fault Disconnected",
    description: "Connection fault profile for testing disconnected and fallback states.",
    overrides: [
      { topicId: "matchHud.connected", value: false },
      { topicId: "matchHud.enabled", value: false },
      { topicId: "matchHud.autonomous", value: false },
      { topicId: "matchHud.phase", value: 0 },
      { topicId: "matchHud.hubStatus", value: 0 },
      { topicId: "matchHud.headerColor", value: 0 },
      { topicId: "matchHud.showShiftIndicator", value: false },
      { topicId: "matchHud.showBuffer", value: false },
      { topicId: "pathplanner.state", value: "NONE" },
      { topicId: "pathplanner.request", value: "NONE" },
      { topicId: "laneAlignment.shouldAdjustVelocity", value: false },
      { topicId: "laneAlignment.adjustingVelocity", value: false },
    ],
  },
];

function createDefaultLiveState(descriptor: NtDebugTopicDescriptor): NtTopicLiveState {
  return {
    value: descriptor.defaultValue,
    hasValue: false,
    isConnected: false,
    lastUpdatedMs: null,
  };
}

export function useDeveloperDebugDashboard() {
  const bridgeAvailable = hasBridge();
  const mockControlsAvailable = hasMainWindowMockControls();
  const { settings } = useSettings();
  const [autobahnConnected, setAutobahnConnected] = useState(false);
  const [overrides, setOverrides] = useState<Map<string, NtDebugTopicValue>>(new Map());
  const [liveByTopicId, setLiveByTopicId] = useState<Map<string, NtTopicLiveState>>(new Map());
  const [lastOverrideAppliedMs, setLastOverrideAppliedMs] = useState<number | null>(null);
  const [mainWindowMockState, setMainWindowMockState] =
    useState<MainWindowMockState>(DEFAULT_MAIN_WINDOW_MOCK_STATE);
  const [isMockPending, setIsMockPending] = useState(false);
  const [mockError, setMockError] = useState<string | null>(null);

  const topics = useMemo(
    () => buildNtDebugTopicCatalog(settings.networkTables),
    [settings.networkTables],
  );

  const refreshMainWindowMockState = useCallback(async () => {
    if (!bridgeAvailable) {
      setMainWindowMockState(DEFAULT_MAIN_WINDOW_MOCK_STATE);
      return;
    }

    if (!mockControlsAvailable) {
      setMainWindowMockState(DEFAULT_MAIN_WINDOW_MOCK_STATE);
      setMockError(
        "Mock controls are unavailable in the current bridge runtime. Restart Electron to load the updated preload.",
      );
      return;
    }

    setMockError(null);

    try {
      const snapshot = await fetchMainWindowMockState();
      setMainWindowMockState(snapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMockError(message);
    }
  }, [bridgeAvailable, mockControlsAvailable]);

  useEffect(() => {
    void refreshMainWindowMockState();
  }, [refreshMainWindowMockState]);

  useEffect(() => {
    setLiveByTopicId((prev) => {
      let changed = false;
      const next = new Map<string, NtTopicLiveState>();

      topics.forEach((topic) => {
        const existing = prev.get(topic.id);
        if (existing) {
          next.set(topic.id, existing);
          return;
        }
        next.set(topic.id, createDefaultLiveState(topic));
        changed = true;
      });

      if (prev.size !== next.size) {
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [topics]);

  useEffect(() => {
    if (!bridgeAvailable) {
      setAutobahnConnected(false);
      return;
    }

    let disposed = false;
    const unsubscribe = subscribeAutobahnStatus((connected) => {
      if (!disposed) {
        setAutobahnConnected(connected);
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [bridgeAvailable]);

  useEffect(() => {
    if (!bridgeAvailable) {
      setLiveByTopicId((prev) => {
        let changed = false;
        const next = new Map(prev);
        topics.forEach((topic) => {
          const existing = next.get(topic.id) ?? createDefaultLiveState(topic);
          if (existing.isConnected) {
            next.set(topic.id, { ...existing, isConnected: false });
            changed = true;
          } else if (!next.has(topic.id)) {
            next.set(topic.id, existing);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
      return;
    }

    let disposed = false;
    const cleanups: Array<() => void> = [];

    topics.forEach((topic) => {
      void subscribeNtTopic(
        {
          topicPath: topic.topicPath,
          typeInfo: topic.typeInfo,
          defaultValue: topic.defaultValue,
        },
        (update) => {
          if (disposed) {
            return;
          }

          setLiveByTopicId((prev) => {
            const next = new Map(prev);
            next.set(topic.id, {
              value: update.value as NtDebugTopicValue,
              hasValue: update.hasValue,
              isConnected: update.isConnected,
              lastUpdatedMs: Date.now(),
            });
            return next;
          });
        },
      ).then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }
        cleanups.push(cleanup);
      });
    });

    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => {
        cleanup();
      });
    };
  }, [bridgeAvailable, topics]);

  useEffect(() => {
    setOverrides((prev) => {
      const validTopicIds = new Set(topics.map((topic) => topic.id));
      let changed = false;
      const next = new Map(prev);

      next.forEach((_value, topicId) => {
        if (!validTopicIds.has(topicId)) {
          next.delete(topicId);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [topics]);

  const setOverride = useCallback((topicId: string, value: NtDebugTopicValue) => {
    setLastOverrideAppliedMs(Date.now());
    setOverrides((prev) => {
      if (prev.get(topicId) === value) {
        return prev;
      }
      const next = new Map(prev);
      next.set(topicId, value);
      return next;
    });
  }, []);

  const clearOverride = useCallback((topicId: string) => {
    setLastOverrideAppliedMs(Date.now());
    setOverrides((prev) => {
      if (!prev.has(topicId)) {
        return prev;
      }
      const next = new Map(prev);
      next.delete(topicId);
      return next;
    });
  }, []);

  const clearAllOverrides = useCallback(() => {
    setLastOverrideAppliedMs(Date.now());
    setOverrides((prev) => (prev.size === 0 ? prev : new Map()));
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const preset = DEBUG_OVERRIDE_PRESETS.find((candidate) => candidate.id === presetId);
    if (!preset) {
      return;
    }

    const nextOverrides = new Map<string, NtDebugTopicValue>();
    preset.overrides.forEach((item) => {
      nextOverrides.set(item.topicId, item.value);
    });

    setLastOverrideAppliedMs(Date.now());
    setOverrides(nextOverrides);
  }, []);

  const setMainWindowMockScenario = useCallback(
    async (scenario: string | null) => {
      if (!bridgeAvailable) {
        return;
      }

      if (!mockControlsAvailable) {
        setMockError(
          "Mock controls are unavailable in the current bridge runtime. Restart Electron to load the updated preload.",
        );
        return;
      }

      const normalizedScenario = scenario && scenario.trim() ? scenario.trim() : null;
      setIsMockPending(true);
      setMockError(null);

      try {
        const snapshot = await updateMainWindowMockState(normalizedScenario);
        setMainWindowMockState(snapshot);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setMockError(message);
      } finally {
        setIsMockPending(false);
      }
    },
    [bridgeAvailable, mockControlsAvailable],
  );

  const rows: DeveloperDebugTopicRow[] = useMemo(
    () =>
      topics.map((topic) => {
        const live = liveByTopicId.get(topic.id) ?? createDefaultLiveState(topic);
        const hasOverride = overrides.has(topic.id);
        const overrideValue = hasOverride ? overrides.get(topic.id) ?? null : null;
        const effectiveValue = hasOverride
          ? (overrides.get(topic.id) as NtDebugTopicValue)
          : live.value;

        return {
          descriptor: topic,
          live,
          hasOverride,
          overrideValue,
          effectiveValue,
        };
      }),
    [liveByTopicId, overrides, topics],
  );

  const ntConnected = useMemo(
    () => rows.some((row) => row.live.isConnected),
    [rows],
  );

  return {
    bridgeAvailable,
    settings,
    topics,
    rows,
    autobahnConnected,
    ntConnected,
    overrideCount: overrides.size,
    lastOverrideAppliedMs,
    presets: DEBUG_OVERRIDE_PRESETS,
    mockScenarios: MOCK_SCENARIOS,
    mainWindowMockState,
    mockControlsAvailable,
    isMockPending,
    mockError,
    setOverride,
    clearOverride,
    clearAllOverrides,
    applyPreset,
    setMainWindowMockScenario,
    refreshMainWindowMockState,
  };
}
