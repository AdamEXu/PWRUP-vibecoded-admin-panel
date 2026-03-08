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
  DEFAULT_HUD_VISIBILITY,
  frcTeamToRobotIp,
  ntPathFromTableAndEntry,
  ntSelectedPathTopics,
  type ConnectionSettings,
  type HudVisibilitySettings,
  type SharedSettingsPayload,
} from "@pwrup/shared-core/settings";
import { getBridge, hasBridge, subscribeSettings } from "./blitzRenderer";

interface SettingsContextValue {
  settings: ConnectionSettings;
  setSettings: (next: ConnectionSettings) => void;
  resetDefaults: () => void;
  hudVisibility: HudVisibilitySettings;
  setHudVisibility: (next: HudVisibilitySettings) => void;
  updateHudVisibility: (patch: Partial<HudVisibilitySettings>) => void;
  resetHudVisibility: () => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<ConnectionSettings>(DEFAULTS);
  const [hudVisibility, setHudVisibilityState] =
    useState<HudVisibilitySettings>(DEFAULT_HUD_VISIBILITY);
  const versionRef = useRef(0);
  const hudVisibilityRef = useRef<HudVisibilitySettings>(DEFAULT_HUD_VISIBILITY);

  const applyPayload = useCallback((payload: SharedSettingsPayload) => {
    versionRef.current = payload.version;
    setSettingsState(payload.settings);
    hudVisibilityRef.current = payload.hudVisibility;
    setHudVisibilityState(payload.hudVisibility);
  }, []);

  useEffect(() => {
    if (!hasBridge()) {
      return;
    }

    let disposed = false;
    let unsubscribe = () => {};

    void getBridge()
      .settings
      .getSnapshot()
      .then((payload) => {
        if (!disposed) {
          applyPayload(payload);
        }
      })
      .catch(() => {
        // Keep defaults if the bridge is unavailable during renderer boot.
      });

    void subscribeSettings((payload) => {
      if (payload.version <= versionRef.current) {
        return;
      }
      applyPayload(payload);
    }).then((cleanup) => {
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
  }, [applyPayload]);

  const setSettings = useCallback(
    (next: ConnectionSettings) => {
      setSettingsState(next);
      if (!hasBridge()) {
        return;
      }
      void getBridge()
        .settings
        .setConnectionSettings(next)
        .then(applyPayload)
        .catch(() => {
          // Keep optimistic value; the next bridge snapshot will reconcile if needed.
        });
    },
    [applyPayload],
  );

  const setHudVisibility = useCallback(
    (next: HudVisibilitySettings) => {
      hudVisibilityRef.current = next;
      setHudVisibilityState(next);
      if (!hasBridge()) {
        return;
      }
      void getBridge()
        .settings
        .setHudVisibility(next)
        .then(applyPayload)
        .catch(() => {
          // Keep optimistic value; the next bridge snapshot will reconcile if needed.
        });
    },
    [applyPayload],
  );

  const updateHudVisibility = useCallback(
    (patch: Partial<HudVisibilitySettings>) => {
      setHudVisibility({
        ...hudVisibilityRef.current,
        ...patch,
      });
    },
    [setHudVisibility],
  );

  const resetDefaults = useCallback(() => {
    setSettingsState(DEFAULTS);
    if (!hasBridge()) {
      return;
    }
    void getBridge()
      .settings
      .resetConnectionSettings()
      .then(applyPayload)
      .catch(() => {
        // Keep optimistic value; the next bridge snapshot will reconcile if needed.
      });
  }, [applyPayload]);

  const resetHudVisibility = useCallback(() => {
    hudVisibilityRef.current = DEFAULT_HUD_VISIBILITY;
    setHudVisibilityState(DEFAULT_HUD_VISIBILITY);
    if (!hasBridge()) {
      return;
    }
    void getBridge()
      .settings
      .resetHudVisibility()
      .then(applyPayload)
      .catch(() => {
        // Keep optimistic value; the next bridge snapshot will reconcile if needed.
      });
  }, [applyPayload]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      setSettings,
      resetDefaults,
      hudVisibility,
      setHudVisibility,
      updateHudVisibility,
      resetHudVisibility,
    }),
    [
      hudVisibility,
      resetDefaults,
      resetHudVisibility,
      setHudVisibility,
      setSettings,
      settings,
      updateHudVisibility,
    ],
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
  DEFAULT_HUD_VISIBILITY,
  frcTeamToRobotIp,
  ntPathFromTableAndEntry,
  ntSelectedPathTopics,
  type ConnectionSettings,
  type HudVisibilitySettings,
  type SharedSettingsPayload,
};
