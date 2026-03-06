"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULTS,
  frcTeamToRobotIp,
  ntPathFromTableAndEntry,
  ntSelectedPathTopics,
  type ConnectionSettings,
  type SharedSettingsPayload,
} from "./settings-schema";

interface SettingsContextValue {
  settings: ConnectionSettings;
  setSettings: (next: ConnectionSettings) => void;
  resetDefaults: () => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function normalizeTopicPart(value: string, fallback: string): string {
  const cleaned = value.trim().replace(/^\/+|\/+$/g, "");
  return cleaned.length > 0 ? cleaned : fallback;
}

function splitTopicPath(topicPath: string): { table: string; entry: string } {
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
}

function normalizeSettings(parsed: Partial<ConnectionSettings>): ConnectionSettings {
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
    typeof parsed.networkTables?.sharedTable === "string" ? parsed.networkTables.sharedTable : "",
    DEFAULTS.networkTables.sharedTable,
  );

  const legacySelectedPathTopic =
    typeof (parsed.networkTables as { autonomousSelectedEntry?: unknown } | undefined)
      ?.autonomousSelectedEntry === "string"
      ? ((parsed.networkTables as { autonomousSelectedEntry?: string }).autonomousSelectedEntry ?? "")
      : "";

  let nextSelectedEntry = normalizeTopicPart(
    typeof parsed.networkTables?.selectedPathTopic === "string"
      ? parsed.networkTables.selectedPathTopic
      : legacySelectedPathTopic,
    DEFAULTS.networkTables.selectedPathTopic,
  );

  if (nextSelectedEntry === "AutonomousSelected") {
    nextSelectedEntry = DEFAULTS.networkTables.selectedPathTopic;
  }

  const legacyTopicPath =
    typeof (parsed.networkTables as { currentPathTopic?: unknown } | undefined)?.currentPathTopic === "string"
      ? ((parsed.networkTables as { currentPathTopic?: string }).currentPathTopic ?? "")
      : "";

  if (legacyTopicPath.trim().length > 0) {
    const parsedLegacy = splitTopicPath(legacyTopicPath);
    nextSharedTable = normalizeTopicPart(parsedLegacy.table, DEFAULTS.networkTables.sharedTable);
    nextSelectedEntry = normalizeTopicPart(parsedLegacy.entry, DEFAULTS.networkTables.selectedPathTopic);
  }

  const legacyTeamNumber =
    typeof (parsed.networkTables as { teamNumber?: unknown } | undefined)?.teamNumber === "number"
      ? Number((parsed.networkTables as { teamNumber?: number }).teamNumber)
      : NaN;
  const legacyRobotIpLastOctet =
    typeof (parsed.networkTables as { robotIpLastOctet?: unknown } | undefined)?.robotIpLastOctet === "number"
      ? Number((parsed.networkTables as { robotIpLastOctet?: number }).robotIpLastOctet)
      : 2;

  const shouldUseLegacyTeamFallback =
    (!parsed.networkTables ||
      typeof parsed.networkTables.host !== "string" ||
      parsed.networkTables.host.trim().length === 0) &&
    Number.isFinite(legacyTeamNumber) &&
    legacyTeamNumber > 0;

  const migratedHostFromTeam = shouldUseLegacyTeamFallback
    ? frcTeamToRobotIp(legacyTeamNumber, legacyRobotIpLastOctet)
    : nextNtHost;

  return {
    host: typeof parsed.host === "string" && parsed.host.trim().length > 0 ? parsed.host.trim() : DEFAULTS.host,
    port:
      typeof parsed.port === "number" && Number.isFinite(parsed.port) && parsed.port > 0 && parsed.port <= 65535
        ? Math.round(parsed.port)
        : DEFAULTS.port,
    networkTables: {
      host: migratedHostFromTeam,
      port: nextNtPort,
      sharedTable: nextSharedTable,
      selectedPathTopic: nextSelectedEntry,
    },
  };
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<ConnectionSettings>(DEFAULTS);
  const versionRef = useRef(0);

  const applyPayload = useCallback((payload: SharedSettingsPayload) => {
    versionRef.current = payload.version;
    setSettingsState(normalizeSettings(payload.settings));
  }, []);

  const fetchSharedSettings = useCallback(async () => {
    const response = await fetch("/api/settings/connection", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch shared settings (${response.status})`);
    }
    const payload = (await response.json()) as SharedSettingsPayload;
    applyPayload(payload);
  }, [applyPayload]);

  const persistSharedSettings = useCallback(
    async (next: ConnectionSettings) => {
      const response = await fetch("/api/settings/connection", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: next }),
      });

      if (!response.ok) {
        throw new Error(`Failed to persist shared settings (${response.status})`);
      }

      const payload = (await response.json()) as SharedSettingsPayload;
      applyPayload(payload);
    },
    [applyPayload],
  );

  useEffect(() => {
    void fetchSharedSettings().catch(() => {
      // If shared storage is temporarily unavailable, keep defaults until stream recovers.
    });
  }, [fetchSharedSettings]);

  useEffect(() => {
    const stream = new EventSource("/api/settings/connection/stream");

    stream.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as SharedSettingsPayload;
        if (payload.version <= versionRef.current) {
          return;
        }
        applyPayload(payload);
      } catch {
        // Ignore malformed events.
      }
    };

    return () => {
      stream.close();
    };
  }, [applyPayload]);

  const setSettings = useCallback(
    (next: ConnectionSettings) => {
      const normalized = normalizeSettings(next);
      setSettingsState(normalized);
      void persistSharedSettings(normalized).catch(() => {
        void fetchSharedSettings().catch(() => {
          // Keep optimistic value if refresh fails.
        });
      });
    },
    [fetchSharedSettings, persistSharedSettings],
  );

  const resetDefaults = useCallback(() => {
    setSettings(DEFAULTS);
  }, [setSettings]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, setSettings, resetDefaults }),
    [settings, setSettings, resetDefaults],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}

export {
  DEFAULTS,
  frcTeamToRobotIp,
  ntPathFromTableAndEntry,
  ntSelectedPathTopics,
  type ConnectionSettings,
  type SharedSettingsPayload,
};
