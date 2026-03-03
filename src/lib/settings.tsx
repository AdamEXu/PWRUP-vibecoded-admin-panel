"use client";
// src/lib/settings.tsx - Purpose: provide global connection settings (host/port) with persistence
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface NetworkTablesSettings {
  host: string;
  port: number;
  sharedTable: string;
  selectedPathTopic: string;
}

export interface ConnectionSettings {
  host: string;
  port: number;
  networkTables: NetworkTablesSettings;
}

interface SettingsContextValue {
  settings: ConnectionSettings;
  setSettings: (next: ConnectionSettings) => void;
  resetDefaults: () => void;
}

const DEFAULTS: ConnectionSettings = {
  host: "10.47.65.7",
  port: 8080,
  networkTables: {
    host: "10.47.65.2",
    port: 5810,
    sharedTable: "PathPlanner",
    selectedPathTopic: "SelectedPath",
  },
};
const STORAGE_KEY = "blitz.settings.connection";

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<ConnectionSettings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  const normalizeTopicPart = useCallback((value: string, fallback: string): string => {
    const cleaned = value.trim().replace(/^\/+|\/+$/g, "");
    return cleaned.length > 0 ? cleaned : fallback;
  }, []);

  const splitTopicPath = useCallback((topicPath: string): { table: string; entry: string } => {
    const cleaned = topicPath.trim().replace(/^\/+/, "");
    const parts = cleaned.split("/").filter((part) => part.trim().length > 0);
    if (parts.length >= 2) {
      return {
        table: parts[0]!,
        entry: parts.slice(1).join("/"),
      };
    }
    return {
      table: DEFAULTS.networkTables.sharedTable,
      entry: DEFAULTS.networkTables.selectedPathTopic,
    };
  }, []);

  const normalizeSettings = useCallback((parsed: Partial<ConnectionSettings>): ConnectionSettings => {
    const nextNtPort =
      typeof parsed.networkTables?.port === "number" &&
      Number.isFinite(parsed.networkTables.port) &&
      parsed.networkTables.port > 0 &&
      parsed.networkTables.port <= 65535
        ? Math.round(parsed.networkTables.port)
        : DEFAULTS.networkTables.port;

    const nextNtHost =
      typeof parsed.networkTables?.host === "string" && parsed.networkTables.host.trim().length > 0
        ? parsed.networkTables.host.trim()
        : DEFAULTS.networkTables.host;

    let nextSharedTable = normalizeTopicPart(
      typeof parsed.networkTables?.sharedTable === "string"
        ? parsed.networkTables.sharedTable
        : "",
      DEFAULTS.networkTables.sharedTable,
    );
    const legacySelectedPathTopic =
      typeof (parsed.networkTables as { autonomousSelectedEntry?: unknown } | undefined)?.autonomousSelectedEntry ===
      "string"
        ? ((parsed.networkTables as { autonomousSelectedEntry?: string }).autonomousSelectedEntry ?? "")
        : "";
    let nextSelectedEntry = normalizeTopicPart(
      typeof parsed.networkTables?.selectedPathTopic === "string"
        ? parsed.networkTables.selectedPathTopic
        : legacySelectedPathTopic,
      DEFAULTS.networkTables.selectedPathTopic,
    );

    // Migrate from the previous single-entry naming to request/state topic root.
    if (nextSelectedEntry === "AutonomousSelected") {
      nextSelectedEntry = DEFAULTS.networkTables.selectedPathTopic;
    }

    // Backward compatibility with legacy `currentPathTopic` setting.
    const legacyTopicPath =
      typeof (parsed.networkTables as { currentPathTopic?: unknown } | undefined)?.currentPathTopic === "string"
        ? ((parsed.networkTables as { currentPathTopic?: string }).currentPathTopic ?? "")
        : "";
    if (legacyTopicPath.trim().length > 0) {
      const parsedLegacy = splitTopicPath(legacyTopicPath);
      nextSharedTable = normalizeTopicPart(parsedLegacy.table, DEFAULTS.networkTables.sharedTable);
      nextSelectedEntry = normalizeTopicPart(parsedLegacy.entry, DEFAULTS.networkTables.selectedPathTopic);
    }

    // Backward compatibility for previous team-number-derived NT host settings.
    const legacyTeamNumber =
      typeof (parsed.networkTables as { teamNumber?: unknown } | undefined)?.teamNumber === "number"
        ? Number((parsed.networkTables as { teamNumber?: number }).teamNumber)
        : NaN;
    const legacyRobotIpLastOctet =
      typeof (parsed.networkTables as { robotIpLastOctet?: unknown } | undefined)?.robotIpLastOctet === "number"
        ? Number((parsed.networkTables as { robotIpLastOctet?: number }).robotIpLastOctet)
        : 2;
    const shouldUseLegacyTeamFallback =
      (!parsed.networkTables || typeof parsed.networkTables.host !== "string" || parsed.networkTables.host.trim().length === 0) &&
      Number.isFinite(legacyTeamNumber) &&
      legacyTeamNumber > 0;
    const migratedHostFromTeam = shouldUseLegacyTeamFallback
      ? frcTeamToRobotIp(legacyTeamNumber, legacyRobotIpLastOctet)
      : nextNtHost;

    return {
      host:
        typeof parsed.host === "string" && parsed.host.length > 0
          ? parsed.host
          : DEFAULTS.host,
      port:
        typeof parsed.port === "number" && Number.isFinite(parsed.port)
          ? parsed.port
          : DEFAULTS.port,
      networkTables: {
        host: migratedHostFromTeam,
        port: nextNtPort,
        sharedTable: nextSharedTable,
        selectedPathTopic: nextSelectedEntry,
      },
    };
  }, [normalizeTopicPart, splitTopicPath]);

  const persistSettings = useCallback((next: ConnectionSettings) => {
    try {
      if (typeof window !== "undefined" && typeof window.localStorage?.setItem === "function") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
    } catch {
      // storage might be unavailable
    }
  }, []);

  // Load from localStorage once on mount (client-side only)
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && typeof window.localStorage?.getItem === "function") {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<ConnectionSettings>;
          const next = normalizeSettings(parsed);
          setSettingsState(next);
        }
      }
    } catch {
      // ignore corrupted storage
    } finally {
      setHydrated(true);
    }
  }, [normalizeSettings]);

  const setSettings = useCallback((next: ConnectionSettings) => {
    setSettingsState(next);
    persistSettings(next);
  }, [persistSettings]);

  const resetDefaults = useCallback(() => {
    setSettings(DEFAULTS);
  }, [setSettings]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let cancelled = false;

    async function autoDiscover() {
      try {
        const response = await fetch("/api/discovery/watchdog?timeoutMs=2500", {
          cache: "no-store",
        });
        if (!response.ok || cancelled) {
          return;
        }

        const payload = (await response.json()) as {
          ok?: boolean;
          found?: boolean;
          host?: string;
          port?: number;
        };

        if (!payload.ok || !payload.found) {
          return;
        }

        const host = typeof payload.host === "string" ? payload.host.trim() : "";
        const port =
          typeof payload.port === "number" && Number.isFinite(payload.port)
            ? Math.round(payload.port)
            : NaN;

        if (!host || !Number.isFinite(port) || port <= 0 || port > 65535) {
          return;
        }

        setSettingsState((prev) => {
          if (cancelled) return prev;
          const next = normalizeSettings({
            ...prev,
            host,
            port,
          });
          if (
            prev.host === next.host &&
            prev.port === next.port &&
            prev.networkTables.host === next.networkTables.host &&
            prev.networkTables.port === next.networkTables.port &&
            prev.networkTables.sharedTable === next.networkTables.sharedTable &&
            prev.networkTables.selectedPathTopic === next.networkTables.selectedPathTopic
          ) {
            return prev;
          }
          persistSettings(next);
          return next;
        });
      } catch {
        // Ignore discovery failures and keep existing settings.
      }
    }

    void autoDiscover();

    return () => {
      cancelled = true;
    };
  }, [hydrated, normalizeSettings, persistSettings]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, setSettings, resetDefaults }),
    [settings, setSettings, resetDefaults]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}

export function frcTeamToRobotIp(teamNumber: number, lastOctet = 2): string {
  const team = Math.max(0, Math.floor(teamNumber));
  const octet = Math.min(254, Math.max(1, Math.floor(lastOctet)));
  const upper = Math.floor(team / 100);
  const lower = team % 100;
  return `10.${upper}.${lower}.${octet}`;
}

export function ntPathFromTableAndEntry(table: string, entry: string): string {
  const normalizedTable = table.trim().replace(/^\/+|\/+$/g, "");
  const normalizedEntry = entry.trim().replace(/^\/+|\/+$/g, "");
  return `/${normalizedTable}/${normalizedEntry}`;
}

export function ntSelectedPathTopics(table: string, selectedPathTopic: string): {
  requestTopic: string;
  stateTopic: string;
  requestTopicWithoutLeadingSlash: string;
  stateTopicWithoutLeadingSlash: string;
} {
  const basePath = ntPathFromTableAndEntry(table, selectedPathTopic);
  const basePathWithoutLeadingSlash = basePath.replace(/^\/+/, "");

  return {
    requestTopic: `${basePath}/Request`,
    stateTopic: `${basePath}/State`,
    requestTopicWithoutLeadingSlash: `${basePathWithoutLeadingSlash}/Request`,
    stateTopicWithoutLeadingSlash: `${basePathWithoutLeadingSlash}/State`,
  };
}
