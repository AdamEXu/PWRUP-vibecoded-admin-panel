"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface PidAppSettings {
  replayDirectory: string;
  liveWindowSeconds: number;
  maxSamplesPerSignal: number;
  minimumConfidencePercent: number;
}

const STORAGE_KEY = "pwrup.pid.settings.v1";

const DEFAULT_SETTINGS: PidAppSettings = {
  replayDirectory: "replays",
  liveWindowSeconds: 30,
  maxSamplesPerSignal: 1200,
  minimumConfidencePercent: 45,
};

interface PidAppSettingsContextValue {
  settings: PidAppSettings;
  updateSettings: (patch: Partial<PidAppSettings>) => void;
  resetSettings: () => void;
}

const PidAppSettingsContext = createContext<PidAppSettingsContextValue | undefined>(
  undefined,
);

function normalizeSettings(value: Partial<PidAppSettings> | null | undefined): PidAppSettings {
  return {
    replayDirectory:
      typeof value?.replayDirectory === "string" && value.replayDirectory.trim().length > 0
        ? value.replayDirectory.trim()
        : DEFAULT_SETTINGS.replayDirectory,
    liveWindowSeconds:
      typeof value?.liveWindowSeconds === "number" &&
      Number.isFinite(value.liveWindowSeconds) &&
      value.liveWindowSeconds >= 10 &&
      value.liveWindowSeconds <= 300
        ? Math.round(value.liveWindowSeconds)
        : DEFAULT_SETTINGS.liveWindowSeconds,
    maxSamplesPerSignal:
      typeof value?.maxSamplesPerSignal === "number" &&
      Number.isFinite(value.maxSamplesPerSignal) &&
      value.maxSamplesPerSignal >= 200 &&
      value.maxSamplesPerSignal <= 5000
        ? Math.round(value.maxSamplesPerSignal)
        : DEFAULT_SETTINGS.maxSamplesPerSignal,
    minimumConfidencePercent:
      typeof value?.minimumConfidencePercent === "number" &&
      Number.isFinite(value.minimumConfidencePercent) &&
      value.minimumConfidencePercent >= 0 &&
      value.minimumConfidencePercent <= 100
        ? Math.round(value.minimumConfidencePercent)
        : DEFAULT_SETTINGS.minimumConfidencePercent,
  };
}

export function PidAppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PidAppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      setSettings(normalizeSettings(JSON.parse(raw) as Partial<PidAppSettings>));
    } catch {
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore local persistence failures.
    }
  }, [settings]);

  const value = useMemo<PidAppSettingsContextValue>(
    () => ({
      settings,
      updateSettings: (patch) => {
        setSettings((current) => normalizeSettings({ ...current, ...patch }));
      },
      resetSettings: () => setSettings(DEFAULT_SETTINGS),
    }),
    [settings],
  );

  return (
    <PidAppSettingsContext.Provider value={value}>
      {children}
    </PidAppSettingsContext.Provider>
  );
}

export function usePidAppSettings() {
  const context = useContext(PidAppSettingsContext);
  if (!context) {
    throw new Error("usePidAppSettings must be used within PidAppSettingsProvider");
  }
  return context;
}
