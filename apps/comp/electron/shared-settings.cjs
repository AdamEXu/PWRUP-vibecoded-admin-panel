const os = require("os");
const path = require("path");
const { EventEmitter } = require("events");
const { promises: fs } = require("fs");

const DEFAULTS = {
  host: "10.47.65.7",
  port: 8080,
  networkTables: {
    host: "10.47.65.2",
    port: 5810,
    sharedTable: "PathPlanner",
    selectedPathTopic: "SelectedPath",
  },
};

const DEFAULT_HUD_VISIBILITY = {
  showMap: true,
  showTimers: true,
  showStatus: true,
  showCamera: true,
};

function getSharedSettingsPath() {
  const fromEnv = process.env.PWRUP_SHARED_SETTINGS_PATH?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }

  return path.join(os.homedir(), ".pwrup", "shared-settings", "connection-settings.json");
}

async function ensureDirectory(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function normalizeConnectionSettings(next = {}) {
  const networkTables = next.networkTables ?? DEFAULTS.networkTables;

  const port =
    typeof next.port === "number" && Number.isFinite(next.port) && next.port > 0 && next.port <= 65535
      ? Math.round(next.port)
      : DEFAULTS.port;
  const ntPort =
    typeof networkTables.port === "number" &&
    Number.isFinite(networkTables.port) &&
    networkTables.port > 0 &&
    networkTables.port <= 65535
      ? Math.round(networkTables.port)
      : DEFAULTS.networkTables.port;

  return {
    host: typeof next.host === "string" && next.host.trim().length > 0 ? next.host.trim() : DEFAULTS.host,
    port,
    networkTables: {
      host:
        typeof networkTables.host === "string" && networkTables.host.trim().length > 0
          ? networkTables.host.trim()
          : DEFAULTS.networkTables.host,
      port: ntPort,
      sharedTable:
        typeof networkTables.sharedTable === "string" && networkTables.sharedTable.trim().length > 0
          ? networkTables.sharedTable.trim().replace(/^\/+|\/+$/g, "")
          : DEFAULTS.networkTables.sharedTable,
      selectedPathTopic:
        typeof networkTables.selectedPathTopic === "string" && networkTables.selectedPathTopic.trim().length > 0
          ? networkTables.selectedPathTopic.trim().replace(/^\/+|\/+$/g, "")
          : DEFAULTS.networkTables.selectedPathTopic,
    },
  };
}

function normalizeHudVisibility(next = {}) {
  return {
    showMap: typeof next.showMap === "boolean" ? next.showMap : DEFAULT_HUD_VISIBILITY.showMap,
    showTimers: typeof next.showTimers === "boolean" ? next.showTimers : DEFAULT_HUD_VISIBILITY.showTimers,
    showStatus: typeof next.showStatus === "boolean" ? next.showStatus : DEFAULT_HUD_VISIBILITY.showStatus,
    showCamera: typeof next.showCamera === "boolean" ? next.showCamera : DEFAULT_HUD_VISIBILITY.showCamera,
  };
}

function normalizePayload(raw) {
  const parsed = raw && typeof raw === "object" ? raw : {};
  const version =
    typeof parsed.version === "number" && Number.isFinite(parsed.version) && parsed.version >= 1
      ? Math.floor(parsed.version)
      : 1;
  const updatedAtIso =
    typeof parsed.updatedAtIso === "string" && parsed.updatedAtIso.trim().length > 0
      ? parsed.updatedAtIso
      : new Date().toISOString();

  return {
    version,
    updatedAtIso,
    settings: normalizeConnectionSettings(parsed.settings),
    hudVisibility: normalizeHudVisibility(parsed.hudVisibility),
  };
}

async function writeAtomically(filePath, payload) {
  await ensureDirectory(filePath);
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempPath, JSON.stringify(payload, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}

class SharedSettingsManager extends EventEmitter {
  constructor() {
    super();
    this.filePath = getSharedSettingsPath();
    this.snapshot = {
      version: 1,
      updatedAtIso: new Date().toISOString(),
      settings: DEFAULTS,
      hudVisibility: DEFAULT_HUD_VISIBILITY,
    };
    this.lastSerialized = JSON.stringify(this.snapshot);
    this.pollHandle = null;
  }

  async initialize() {
    this.snapshot = await this.#readFromDisk();
    this.lastSerialized = JSON.stringify(this.snapshot);
    this.#startPolling();
    return this.snapshot;
  }

  getSnapshot() {
    return this.snapshot;
  }

  async setConnectionSettings(nextSettings) {
    const nextSnapshot = {
      ...this.snapshot,
      version: this.snapshot.version + 1,
      updatedAtIso: new Date().toISOString(),
      settings: normalizeConnectionSettings(nextSettings),
    };
    await this.#persistAndApply(nextSnapshot);
    return this.snapshot;
  }

  async setHudVisibility(nextHudVisibility) {
    const nextSnapshot = {
      ...this.snapshot,
      version: this.snapshot.version + 1,
      updatedAtIso: new Date().toISOString(),
      hudVisibility: normalizeHudVisibility(nextHudVisibility),
    };
    await this.#persistAndApply(nextSnapshot);
    return this.snapshot;
  }

  async resetConnectionSettings() {
    return this.setConnectionSettings(DEFAULTS);
  }

  async resetHudVisibility() {
    return this.setHudVisibility(DEFAULT_HUD_VISIBILITY);
  }

  stop() {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  async refreshFromDisk() {
    const nextSnapshot = await this.#readFromDisk();
    const serialized = JSON.stringify(nextSnapshot);
    if (serialized === this.lastSerialized) {
      return this.snapshot;
    }

    this.snapshot = nextSnapshot;
    this.lastSerialized = serialized;
    this.emit("change", this.snapshot);
    return this.snapshot;
  }

  async #persistAndApply(nextSnapshot) {
    const normalized = normalizePayload(nextSnapshot);
    await writeAtomically(this.filePath, normalized);
    this.snapshot = normalized;
    this.lastSerialized = JSON.stringify(normalized);
    this.emit("change", this.snapshot);
  }

  async #readFromDisk() {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      const normalized = normalizePayload(parsed);
      if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
        await writeAtomically(this.filePath, normalized);
      }
      return normalized;
    } catch {
      const initial = normalizePayload({});
      await writeAtomically(this.filePath, initial);
      return initial;
    }
  }

  #startPolling() {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
    }
    this.pollHandle = setInterval(() => {
      void this.refreshFromDisk().catch(() => {
        // Ignore transient file read errors and retry on next interval.
      });
    }, 1000);
    this.pollHandle.unref?.();
  }
}

module.exports = {
  DEFAULTS,
  DEFAULT_HUD_VISIBILITY,
  SharedSettingsManager,
};
