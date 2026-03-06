// src/components/dashboard/CombinedDashboard.tsx - Purpose: unified dashboard with Pi Dashboard and System Management tabs
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@pwrup/shared-ui/tabs";
import {
  GlobalOverview,
  PiSystemManager,
  MultiPiGrid,
  TopicConfig,
  PingStatus,
} from "@/components/dashboard";
import { useMultiPiDashboard } from "@/lib/hooks/useMultiPiDashboard";
import { useSettings } from "@/lib/settings";
import {
  HostCard,
  type HostStatus,
  type PingDataPoint,
  AddHostForm,
} from "@/components/system";
import {
  getSystemStatus,
  setConfig,
  startProcesses,
  stopProcesses,
  setProcesses,
} from "@/lib/watchdogApi";

const STORAGE_KEY = "blitz.system.hosts";
const CONFIG_HISTORY_KEY = "blitz.system.configHistory";

type HostConfigHistory = {
  last?: string;
  previous?: string;
};

type HostConfigHistoryMap = Record<string, HostConfigHistory>;

function loadHostsFromStorage(): string[] {
  if (typeof window === "undefined" || typeof window.localStorage?.getItem !== "function") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.every((h) => typeof h === "string")) {
        return parsed as string[];
      }
    }
  } catch {
    // ignore corrupted storage
  }
  return [];
}

function saveHostsToStorage(hosts: string[]): void {
  if (typeof window === "undefined" || typeof window.localStorage?.setItem !== "function") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hosts));
  } catch {
    // storage might be unavailable
  }
}

function loadConfigHistoryFromStorage(): HostConfigHistoryMap {
  if (typeof window === "undefined" || typeof window.localStorage?.getItem !== "function") return {};
  try {
    const raw = window.localStorage.getItem(CONFIG_HISTORY_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const result: HostConfigHistoryMap = {};
    for (const [host, value] of Object.entries(
      parsed as Record<string, unknown>
    )) {
      if (!value || typeof value !== "object") continue;
      const typed = value as { last?: unknown; previous?: unknown };
      const last = typeof typed.last === "string" ? typed.last : undefined;
      const previous =
        typeof typed.previous === "string" ? typed.previous : undefined;
      if (last !== undefined || previous !== undefined) {
        result[host] = { last, previous };
      }
    }
    return result;
  } catch {
    // ignore corrupted storage
  }
  return {};
}

function saveConfigHistoryToStorage(history: HostConfigHistoryMap): void {
  if (typeof window === "undefined" || typeof window.localStorage?.setItem !== "function") return;
  try {
    window.localStorage.setItem(CONFIG_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // storage might be unavailable
  }
}

function PiDashboardContent() {
  const {
    piSystems,
    globalStats,
    topic,
    setTopic,
    addPiSystem,
    removePiSystem,
    clearLogs,
  } = useMultiPiDashboard();

  const piNames = useMemo(
    () => Array.from(piSystems.keys()),
    [piSystems]
  );

  return (
    <div className="space-y-6">
      <TopicConfig topic={topic} onTopicChange={setTopic} />

      <GlobalOverview stats={globalStats} />

      <PingStatus piNames={piNames} />

      <PiSystemManager
        piSystems={piSystems}
        topic={topic}
        onAddPi={addPiSystem}
        onRemovePi={removePiSystem}
      />

      <div>
        <h2 className="text-lg font-semibold mb-4">System Details</h2>
        <MultiPiGrid piSystems={piSystems} onClearLogs={clearLogs} />
      </div>
    </div>
  );
}

function SystemManagementContent() {
  const { settings } = useSettings();
  const defaultBaseUrl = useMemo(
    () => `http://${settings.host}:5000`,
    [settings.host]
  );

  const [hosts, setHosts] = useState<string[]>(() => {
    const stored = loadHostsFromStorage();
    return stored.length > 0 ? stored : [defaultBaseUrl];
  });

  const [hostStatuses, setHostStatuses] = useState<Record<string, HostStatus>>(
    {}
  );
  const [pingHistories, setPingHistories] = useState<
    Record<string, PingDataPoint[]>
  >({});
  const [hostConfigHistory, setHostConfigHistory] =
    useState<HostConfigHistoryMap>({});
  const fetchedHostsRef = useRef<Set<string>>(new Set());
  const hasLoadedConfigHistoryRef = useRef(false);

  useEffect(() => {
    saveHostsToStorage(hosts);
  }, [hosts]);

  useEffect(() => {
    const loaded = loadConfigHistoryFromStorage();
    setHostConfigHistory(loaded);
    hasLoadedConfigHistoryRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedConfigHistoryRef.current) return;
    saveConfigHistoryToStorage(hostConfigHistory);
  }, [hostConfigHistory]);

  const refreshHostStatus = useCallback(async (hostUrl: string) => {
    setHostStatuses((prev) => ({
      ...prev,
      [hostUrl]: {
        systemInfo: prev[hostUrl]?.systemInfo || "",
        activeProcesses: prev[hostUrl]?.activeProcesses || [],
        possibleProcesses: prev[hostUrl]?.possibleProcesses || [],
        configSet: prev[hostUrl]?.configSet || false,
        ping: prev[hostUrl]?.ping || null,
        loading: true,
        error: null,
      },
    }));

    const startTime = performance.now();
    try {
      const status = await getSystemStatus(hostUrl);
      const endTime = performance.now();
      const ping = Math.round(endTime - startTime);

      const now = new Date();
      const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
      const pingPoint: PingDataPoint = {
        time: timeLabel,
        ping,
        timestamp: now.getTime(),
      };

      setPingHistories((prev) => {
        const history = prev[hostUrl] || [];
        const newHistory = [...history, pingPoint];
        return {
          ...prev,
          [hostUrl]: newHistory.slice(-60),
        };
      });

      setHostStatuses((prev) => ({
        ...prev,
        [hostUrl]: {
          systemInfo: status.system_info,
          activeProcesses: status.active_processes || [],
          possibleProcesses: status.possible_processes || [],
          configSet: status.config_set,
          ping,
          loading: false,
          error: null,
        },
      }));
    } catch (e) {
      setHostStatuses((prev) => ({
        ...prev,
        [hostUrl]: {
          systemInfo: prev[hostUrl]?.systemInfo || "",
          activeProcesses: prev[hostUrl]?.activeProcesses || [],
          possibleProcesses: prev[hostUrl]?.possibleProcesses || [],
          configSet: prev[hostUrl]?.configSet || false,
          ping: null,
          loading: false,
          error: (e as Error).message,
        },
      }));
    }
  }, []);

  useEffect(() => {
    hosts.forEach((host) => {
      if (!fetchedHostsRef.current.has(host)) {
        fetchedHostsRef.current.add(host);
        refreshHostStatus(host);
      }
    });
  }, [hosts, refreshHostStatus]);

  const addHost = useCallback((url: string) => {
    setHosts((prev) => {
      if (prev.includes(url)) return prev;
      return [...prev, url];
    });
  }, []);

  const removeHost = useCallback((url: string) => {
    setHosts((prev) => prev.filter((h) => h !== url));
    setHostStatuses((prev) => {
      const next = { ...prev };
      delete next[url];
      return next;
    });
    setPingHistories((prev) => {
      const next = { ...prev };
      delete next[url];
      return next;
    });
    setHostConfigHistory((prev) => {
      const next = { ...prev };
      delete next[url];
      return next;
    });
    fetchedHostsRef.current.delete(url);
  }, []);

  const handleStartProcess = useCallback(
    async (hostUrl: string, processTypes: string[]) => {
      setHostStatuses((prev) => ({
        ...prev,
        [hostUrl]: {
          systemInfo: prev[hostUrl]?.systemInfo || "",
          activeProcesses: prev[hostUrl]?.activeProcesses || [],
          possibleProcesses: prev[hostUrl]?.possibleProcesses || [],
          configSet: prev[hostUrl]?.configSet || false,
          ping: prev[hostUrl]?.ping || null,
          loading: true,
          error: null,
        },
      }));

      try {
        await startProcesses(hostUrl, processTypes);
        await refreshHostStatus(hostUrl);
      } catch (e) {
        setHostStatuses((prev) => ({
          ...prev,
          [hostUrl]: {
            systemInfo: prev[hostUrl]?.systemInfo || "",
            activeProcesses: prev[hostUrl]?.activeProcesses || [],
            possibleProcesses: prev[hostUrl]?.possibleProcesses || [],
            configSet: prev[hostUrl]?.configSet || false,
            loading: false,
            error: (e as Error).message,
          },
        }));
      }
    },
    [refreshHostStatus]
  );

  const handleStopProcess = useCallback(
    async (hostUrl: string, processTypes: string[]) => {
      setHostStatuses((prev) => ({
        ...prev,
        [hostUrl]: {
          systemInfo: prev[hostUrl]?.systemInfo || "",
          activeProcesses: prev[hostUrl]?.activeProcesses || [],
          possibleProcesses: prev[hostUrl]?.possibleProcesses || [],
          configSet: prev[hostUrl]?.configSet || false,
          ping: prev[hostUrl]?.ping || null,
          loading: true,
          error: null,
        },
      }));

      try {
        await stopProcesses(hostUrl, processTypes);
        await refreshHostStatus(hostUrl);
      } catch (e) {
        setHostStatuses((prev) => ({
          ...prev,
          [hostUrl]: {
            systemInfo: prev[hostUrl]?.systemInfo || "",
            activeProcesses: prev[hostUrl]?.activeProcesses || [],
            possibleProcesses: prev[hostUrl]?.possibleProcesses || [],
            configSet: prev[hostUrl]?.configSet || false,
            loading: false,
            error: (e as Error).message,
          },
        }));
      }
    },
    [refreshHostStatus]
  );

  const handleSetConfig = useCallback(
    async (hostUrl: string, config: string) => {
      try {
        await setConfig(hostUrl, config);
        setHostConfigHistory((prev) => {
          const current = prev[hostUrl];
          const updated: HostConfigHistory = {
            last: config,
            previous: current?.last,
          };
          return {
            ...prev,
            [hostUrl]: updated,
          };
        });
        await refreshHostStatus(hostUrl);
      } catch (e) {
        setHostStatuses((prev) => ({
          ...prev,
          [hostUrl]: {
            systemInfo: prev[hostUrl]?.systemInfo || "",
            activeProcesses: prev[hostUrl]?.activeProcesses || [],
            possibleProcesses: prev[hostUrl]?.possibleProcesses || [],
            configSet: prev[hostUrl]?.configSet || false,
            loading: false,
            error: (e as Error).message,
          },
        }));
      }
    },
    [refreshHostStatus]
  );

  const handleRollbackConfig = useCallback(
    async (hostUrl: string) => {
      const history = hostConfigHistory[hostUrl];
      const savedConfig = history?.last;
      if (!savedConfig) return;
      await handleSetConfig(hostUrl, savedConfig);
    },
    [hostConfigHistory, handleSetConfig]
  );

  const handleSetProcesses = useCallback(
    async (hostUrl: string, processes: string[]) => {
      setHostStatuses((prev) => ({
        ...prev,
        [hostUrl]: {
          systemInfo: prev[hostUrl]?.systemInfo || "",
          activeProcesses: prev[hostUrl]?.activeProcesses || [],
          possibleProcesses: prev[hostUrl]?.possibleProcesses || [],
          configSet: prev[hostUrl]?.configSet || false,
          ping: prev[hostUrl]?.ping || null,
          loading: true,
          error: null,
        },
      }));

      try {
        await setProcesses(hostUrl, processes);
        await refreshHostStatus(hostUrl);
      } catch (e) {
        setHostStatuses((prev) => ({
          ...prev,
          [hostUrl]: {
            systemInfo: prev[hostUrl]?.systemInfo || "",
            activeProcesses: prev[hostUrl]?.activeProcesses || [],
            possibleProcesses: prev[hostUrl]?.possibleProcesses || [],
            configSet: prev[hostUrl]?.configSet || false,
            loading: false,
            error: (e as Error).message,
          },
        }));
      }
    },
    [refreshHostStatus]
  );

  return (
    <div className="space-y-6">
      <AddHostForm onAdd={addHost} defaultPort={5000} />

      {hosts.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No hosts added. Add a host above to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {hosts.map((hostUrl) => (
            <HostCard
              key={hostUrl}
              hostUrl={hostUrl}
              status={
                hostStatuses[hostUrl] || {
                  systemInfo: "",
                  activeProcesses: [],
                  possibleProcesses: [],
                  configSet: false,
                  ping: null,
                  loading: false,
                }
              }
              pingHistory={pingHistories[hostUrl] || []}
              onRefresh={() => refreshHostStatus(hostUrl)}
              onStartProcess={(processes) =>
                handleStartProcess(hostUrl, processes)
              }
              onStopProcess={(processes) =>
                handleStopProcess(hostUrl, processes)
              }
              onSetConfig={(config) => handleSetConfig(hostUrl, config)}
              onSetProcesses={(processes) =>
                handleSetProcesses(hostUrl, processes)
              }
              onRollbackConfig={() => handleRollbackConfig(hostUrl)}
              canRollbackConfig={!!hostConfigHistory[hostUrl]?.last}
              onRemove={() => removeHost(hostUrl)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CombinedDashboard() {
  return (
    <Tabs defaultValue="pi-dashboard" className="w-full">
      <TabsList>
        <TabsTrigger value="pi-dashboard">Pi Dashboard</TabsTrigger>
        <TabsTrigger value="system-management">System Management</TabsTrigger>
      </TabsList>
      <TabsContent value="pi-dashboard" className="mt-6">
        <PiDashboardContent />
      </TabsContent>
      <TabsContent value="system-management" className="mt-6">
        <SystemManagementContent />
      </TabsContent>
    </Tabs>
  );
}
