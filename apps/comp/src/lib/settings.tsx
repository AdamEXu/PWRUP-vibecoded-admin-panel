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
  DEFAULT_MAP_SETTINGS,
  DEFAULT_VISUAL_SETTINGS,
  normalizeRenderScale,
  frcTeamToRobotIp,
  ntPathFromTableAndEntry,
  ntSelectedPathTopics,
  type ConnectionSettings,
  type HudVisibilitySettings,
  type MapSettings,
  type SharedSettingsPayload,
  type VisualSettings,
} from "@pwrup/shared-core/settings";
import { getBridge, hasBridge, subscribeSettings } from "./blitzRenderer";

const MAP_SETTINGS_KEY = "pwrup-map-settings";

function loadMapSettings(): MapSettings {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(MAP_SETTINGS_KEY) : null;
    if (!raw) return DEFAULT_MAP_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<MapSettings>;
    return {
      mode: parsed.mode === "follow" || parsed.mode === "driver" ? parsed.mode : DEFAULT_MAP_SETTINGS.mode,
      angle: typeof parsed.angle === "number" && isFinite(parsed.angle) ? Math.max(0, Math.min(1, parsed.angle)) : DEFAULT_MAP_SETTINGS.angle,
      zoom: typeof parsed.zoom === "number" && isFinite(parsed.zoom) ? Math.max(0, Math.min(1, parsed.zoom)) : DEFAULT_MAP_SETTINGS.zoom,
    };
  } catch {
    return DEFAULT_MAP_SETTINGS;
  }
}

const VISUAL_SETTINGS_KEY = "pwrup-visual-settings";

function loadVisualSettings(): VisualSettings {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(VISUAL_SETTINGS_KEY) : null;
    if (!raw) return DEFAULT_VISUAL_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<VisualSettings>;
    return {
      logarithmicDepthBuffer:
        typeof parsed.logarithmicDepthBuffer === "boolean"
          ? parsed.logarithmicDepthBuffer
          : DEFAULT_VISUAL_SETTINGS.logarithmicDepthBuffer,
      backdropBlur:
        typeof parsed.backdropBlur === "boolean"
          ? parsed.backdropBlur
          : DEFAULT_VISUAL_SETTINGS.backdropBlur,
      renderScale: normalizeRenderScale(parsed.renderScale),
    };
  } catch {
    return DEFAULT_VISUAL_SETTINGS;
  }
}

function saveVisualSettings(s: VisualSettings) {
  try {
    localStorage.setItem(VISUAL_SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable — ignore
  }
}

const MAP_SETTINGS_CHANNEL = "pwrup-map-settings-sync";

function getMapSettingsChannel(): BroadcastChannel | null {
  try {
    return new BroadcastChannel(MAP_SETTINGS_CHANNEL);
  } catch {
    return null;
  }
}

function saveMapSettings(s: MapSettings) {
  try {
    localStorage.setItem(MAP_SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Storage unavailable — ignore
  }
  // Broadcast to other windows (BroadcastChannel fires in ALL other same-origin contexts)
  try {
    const ch = getMapSettingsChannel();
    if (ch) {
      ch.postMessage(s);
      ch.close();
    }
  } catch {
    // Ignore
  }
}

interface SettingsContextValue {
  settings: ConnectionSettings;
  setSettings: (next: ConnectionSettings) => void;
  resetDefaults: () => void;
  hudVisibility: HudVisibilitySettings;
  setHudVisibility: (next: HudVisibilitySettings) => void;
  updateHudVisibility: (patch: Partial<HudVisibilitySettings>) => void;
  resetHudVisibility: () => void;
  mapSettings: MapSettings;
  updateMapSettings: (patch: Partial<MapSettings>) => void;
  resetMapSettings: () => void;
  visualSettings: VisualSettings;
  updateVisualSettings: (patch: Partial<VisualSettings>) => void;
  resetVisualSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<ConnectionSettings>(DEFAULTS);
  const [hudVisibility, setHudVisibilityState] =
    useState<HudVisibilitySettings>(DEFAULT_HUD_VISIBILITY);
  const [mapSettings, setMapSettingsState] = useState<MapSettings>(() => loadMapSettings());
  const [visualSettings, setVisualSettingsState] = useState<VisualSettings>(() => loadVisualSettings());
  const versionRef = useRef(0);
  const hudVisibilityRef = useRef<HudVisibilitySettings>(DEFAULT_HUD_VISIBILITY);
  const mapSettingsRef = useRef<MapSettings>(mapSettings);
  const visualSettingsRef = useRef<VisualSettings>(DEFAULT_VISUAL_SETTINGS);

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

  const updateMapSettings = useCallback((patch: Partial<MapSettings>) => {
    const next: MapSettings = { ...mapSettingsRef.current, ...patch };
    mapSettingsRef.current = next;
    setMapSettingsState(next);
    saveMapSettings(next);
  }, []);

  const resetMapSettings = useCallback(() => {
    mapSettingsRef.current = DEFAULT_MAP_SETTINGS;
    setMapSettingsState(DEFAULT_MAP_SETTINGS);
    saveMapSettings(DEFAULT_MAP_SETTINGS);
  }, []);

  const updateVisualSettings = useCallback((patch: Partial<VisualSettings>) => {
    const next: VisualSettings = { ...visualSettingsRef.current, ...patch };
    visualSettingsRef.current = next;
    setVisualSettingsState(next);
    saveVisualSettings(next);
  }, []);

  const resetVisualSettings = useCallback(() => {
    visualSettingsRef.current = DEFAULT_VISUAL_SETTINGS;
    setVisualSettingsState(DEFAULT_VISUAL_SETTINGS);
    saveVisualSettings(DEFAULT_VISUAL_SETTINGS);
  }, []);

  // Sync mapSettings across windows via BroadcastChannel + storage events
  useEffect(() => {
    const applyRemote = (data: unknown) => {
      const parsed = data as Partial<MapSettings> | null;
      const next: MapSettings = {
        mode: parsed?.mode === "follow" || parsed?.mode === "driver" ? parsed.mode : mapSettingsRef.current.mode,
        angle: typeof parsed?.angle === "number" && isFinite(parsed.angle) ? Math.max(0, Math.min(1, parsed.angle)) : mapSettingsRef.current.angle,
        zoom: typeof parsed?.zoom === "number" && isFinite(parsed.zoom) ? Math.max(0, Math.min(1, parsed.zoom)) : mapSettingsRef.current.zoom,
      };
      mapSettingsRef.current = next;
      setMapSettingsState(next);
    };

    // BroadcastChannel — fires in other same-origin windows (works in Electron)
    const ch = getMapSettingsChannel();
    if (ch) {
      ch.onmessage = (e: MessageEvent) => applyRemote(e.data);
    }

    // Storage event — fallback for contexts where BroadcastChannel isn't available
    const onStorage = (e: StorageEvent) => {
      if (e.key !== MAP_SETTINGS_KEY || !e.newValue) return;
      try {
        applyRemote(JSON.parse(e.newValue));
      } catch {
        // Ignore parse errors
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      ch?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      setSettings,
      resetDefaults,
      hudVisibility,
      setHudVisibility,
      updateHudVisibility,
      resetHudVisibility,
      mapSettings,
      updateMapSettings,
      resetMapSettings,
      visualSettings,
      updateVisualSettings,
      resetVisualSettings,
    }),
    [
      hudVisibility,
      mapSettings,
      resetDefaults,
      resetHudVisibility,
      resetMapSettings,
      setHudVisibility,
      setSettings,
      settings,
      updateHudVisibility,
      updateMapSettings,
      visualSettings,
      updateVisualSettings,
      resetVisualSettings,
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
  DEFAULT_MAP_SETTINGS,
  DEFAULT_VISUAL_SETTINGS,
  frcTeamToRobotIp,
  ntPathFromTableAndEntry,
  ntSelectedPathTopics,
  type ConnectionSettings,
  type HudVisibilitySettings,
  type MapSettings,
  type SharedSettingsPayload,
  type VisualSettings,
};
