"use client";

/**
 * Cross-window debug pose overrides.
 *
 * The debug dashboard writes pose values here, and the HUD window reads them.
 * Uses BroadcastChannel + localStorage for reliable cross-window communication.
 */

const CHANNEL_NAME = "pwrup-debug-pose";
const STORAGE_KEY = "pwrup-debug-pose";

export interface DebugPoseOverride {
  poseX: number;
  poseY: number;
  heading: number;
  isRedAlliance: boolean;
  phase: number;
  enabled: boolean;
  seq: number;
  active: boolean; // false = no override, use real NT values
  ts: number;      // timestamp for staleness check
}

const EMPTY: DebugPoseOverride = {
  poseX: 0,
  poseY: 0,
  heading: 0,
  isRedAlliance: false,
  phase: 0,
  enabled: false,
  seq: 0,
  active: false,
  ts: 0,
};

export function writeDebugPose(override: Omit<DebugPoseOverride, "ts">) {
  const payload: DebugPoseOverride = { ...override, ts: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
  try {
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.postMessage(payload);
    ch.close();
  } catch {
    // ignore
  }
}

export function clearDebugPose() {
  writeDebugPose({ ...EMPTY, active: false, seq: 0 });
}

export function readDebugPose(): DebugPoseOverride | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DebugPoseOverride;
    if (!parsed.active) return null;
    // Stale check: ignore overrides older than 5 minutes
    if (Date.now() - parsed.ts > 5 * 60_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Subscribe to debug pose changes from other windows.
 * Returns an unsubscribe function.
 */
export function subscribeDebugPose(
  callback: (override: DebugPoseOverride | null) => void,
): () => void {
  let ch: BroadcastChannel | null = null;

  try {
    ch = new BroadcastChannel(CHANNEL_NAME);
    ch.onmessage = (e: MessageEvent) => {
      const data = e.data as DebugPoseOverride;
      callback(data.active ? data : null);
    };
  } catch {
    // ignore
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    callback(readDebugPose());
  };
  window.addEventListener("storage", onStorage);

  return () => {
    ch?.close();
    window.removeEventListener("storage", onStorage);
  };
}
