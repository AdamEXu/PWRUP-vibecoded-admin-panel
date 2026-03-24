const { app, BrowserWindow, dialog, ipcMain, screen } = require("electron");
const { spawn } = require("child_process");
const http = require("http");
const net = require("net");
const path = require("path");
const { SharedSettingsManager } = require("./shared-settings.cjs");
const { NtBroker } = require("./nt-broker.cjs");
const { AutobahnBroker } = require("./autobahn-broker.cjs");

const HOST = "127.0.0.1";
const DEFAULT_DEV_URL = "http://127.0.0.1:3001";
const SERVER_START_TIMEOUT_MS = 60_000;
const SERVER_POLL_INTERVAL_MS = 300;
const TILE_SHORTCUT_KEY = "f";
const MAIN_HUD_DISPLAY_SIZE = { width: 1920, height: 1080 };
const TOUCHSCREEN_DISPLAY_SIZE = { width: 1920, height: 515 };

let mainWindow = null;
let touchscreenWindow = null;
let nextServerProcess = null;
let packagedServerUrl = null;
let bundledServerScriptPath = null;
let bundledServerCwd = null;
const serverLogBuffer = [];
const SERVER_LOG_BUFFER_MAX = 120;

const settingsManager = new SharedSettingsManager();
const ntBroker = new NtBroker();
const autobahnBroker = new AutobahnBroker();
const trackedRendererIds = new Set();

function pushServerLog(source, chunk) {
  const text = String(chunk ?? "").replace(/\r/g, "");
  if (!text) return;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    serverLogBuffer.push(`[${source}] ${line}`);
  }
  if (serverLogBuffer.length > SERVER_LOG_BUFFER_MAX) {
    serverLogBuffer.splice(0, serverLogBuffer.length - SERVER_LOG_BUFFER_MAX);
  }
}

function getBundledServerDiagnostics() {
  const lines = [
    `Server URL: ${packagedServerUrl ?? "(not started)"}`,
    `Server script: ${bundledServerScriptPath ?? "(unknown)"}`,
    `Server cwd: ${bundledServerCwd ?? "(unknown)"}`,
  ];
  if (serverLogBuffer.length > 0) {
    lines.push("", "Recent embedded server logs:");
    lines.push(...serverLogBuffer.slice(-40));
  }
  return lines.join("\n");
}

function getWindowIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icon.png");
  }

  return path.join(__dirname, "..", "build", "icons", "icon.png");
}

function canConnect(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode !== undefined && response.statusCode < 500);
    });

    request.on("error", () => resolve(false));
    request.setTimeout(1_500, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeoutMs) {
  const timeoutAt = Date.now() + timeoutMs;
  while (Date.now() < timeoutAt) {
    if (await canConnect(url)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, SERVER_POLL_INTERVAL_MS));
  }

  throw new Error(`Timed out waiting for Next.js server at ${url}`);
}

function getOpenPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, HOST, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to determine an open port.")));
        return;
      }

      const { port } = address;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(port);
      });
    });
  });
}

async function startBundledNextServer(port) {
  const serverScriptPath = path.join(process.resourcesPath, "app", "server.js");
  const serverCwd = path.dirname(serverScriptPath);
  bundledServerScriptPath = serverScriptPath;
  bundledServerCwd = serverCwd;
  serverLogBuffer.length = 0;

  nextServerProcess = spawn(process.execPath, [serverScriptPath], {
    cwd: serverCwd,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: HOST,
      ELECTRON_RUN_AS_NODE: "1",
    },
    stdio: "pipe",
    windowsHide: true,
  });

  nextServerProcess.stdout.on("data", (data) => {
    pushServerLog("next:stdout", data);
    process.stdout.write(`[next] ${data}`);
  });

  nextServerProcess.stderr.on("data", (data) => {
    pushServerLog("next:stderr", data);
    process.stderr.write(`[next] ${data}`);
  });

  nextServerProcess.on("error", (error) => {
    pushServerLog("next:spawn-error", error?.stack || error?.message || String(error));
  });

  nextServerProcess.on("exit", (code, signal) => {
    if (!app.isQuitting) {
      dialog.showErrorBox(
        "PWRUP Comp",
        [
          `Embedded server stopped unexpectedly (code: ${code ?? "null"}, signal: ${signal ?? "none"}).`,
          "",
          getBundledServerDiagnostics(),
        ].join("\n"),
      );
      app.quit();
    }
  });

  try {
    await waitForServer(`http://${HOST}:${port}`, SERVER_START_TIMEOUT_MS);
  } catch (error) {
    pushServerLog("next:start-timeout", error?.stack || error?.message || String(error));
    throw error;
  }
}

function stopBundledNextServer() {
  if (nextServerProcess && !nextServerProcess.killed) {
    nextServerProcess.kill();
  }
}

async function getRendererStartUrl() {
  let startUrl = process.env.ELECTRON_START_URL || DEFAULT_DEV_URL;

  if (app.isPackaged) {
    if (!packagedServerUrl) {
      const port = await getOpenPort();
      await startBundledNextServer(port);
      packagedServerUrl = `http://${HOST}:${port}`;
    }
    startUrl = packagedServerUrl;
  }

  return startUrl;
}

function broadcastToWindows(channel, payload) {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, payload);
    }
  });
}

function handleRendererDestroyed(senderId) {
  ntBroker.cleanupRenderer(senderId);
  autobahnBroker.cleanupRenderer(senderId);
}

function trackSender(sender) {
  if (trackedRendererIds.has(sender.id)) {
    return;
  }

  trackedRendererIds.add(sender.id);
  sender.once("destroyed", () => {
    trackedRendererIds.delete(sender.id);
    handleRendererDestroyed(sender.id);
  });
}

function registerIpcHandlers() {
  ipcMain.handle("blitz:settings:get", () => settingsManager.getSnapshot());
  ipcMain.handle("blitz:settings:set-connection", async (_event, settings) => {
    return settingsManager.setConnectionSettings(settings);
  });
  ipcMain.handle("blitz:settings:set-hud-visibility", async (_event, hudVisibility) => {
    return settingsManager.setHudVisibility(hudVisibility);
  });
  ipcMain.handle("blitz:settings:reset-connection", () => settingsManager.resetConnectionSettings());
  ipcMain.handle("blitz:settings:reset-hud-visibility", () => settingsManager.resetHudVisibility());

  ipcMain.handle("blitz:nt:subscribe", (event, params) => {
    trackSender(event.sender);
    return ntBroker.subscribe(event.sender, params);
  });
  ipcMain.handle("blitz:nt:unsubscribe", (_event, subscriptionId) => {
    ntBroker.unsubscribe(subscriptionId);
  });
  ipcMain.handle("blitz:nt:publish", (_event, params) => ntBroker.publish(params));

  ipcMain.handle("blitz:autobahn:get-status", () => autobahnBroker.getStatus());
  ipcMain.handle("blitz:autobahn:subscribe", (event, params) => {
    trackSender(event.sender);
    return autobahnBroker.subscribe(event.sender, params);
  });
  ipcMain.handle("blitz:autobahn:unsubscribe", (_event, subscriptionId) => {
    autobahnBroker.unsubscribe(subscriptionId);
  });
  ipcMain.handle("blitz:autobahn:publish", (_event, params) => autobahnBroker.publish(params));
  ipcMain.handle("blitz:autobahn:reconnect", () => autobahnBroker.reconnect());
}

async function initializeBridge() {
  const snapshot = await settingsManager.initialize();
  ntBroker.initialize(snapshot);
  autobahnBroker.initialize(snapshot);

  settingsManager.on("change", (nextSnapshot) => {
    ntBroker.updateSettingsSnapshot(nextSnapshot);
    autobahnBroker.updateSettingsSnapshot(nextSnapshot);
    broadcastToWindows("blitz:settings:update", nextSnapshot);
  });

  autobahnBroker.on("status", (isConnected) => {
    broadcastToWindows("blitz:autobahn:status", isConnected);
  });

  registerIpcHandlers();
}

function isShortcutInput(input) {
  return (
    input.type === "keyDown" &&
    input.shift &&
    (input.control || input.meta) &&
    String(input.key || "").toLowerCase() === TILE_SHORTCUT_KEY
  );
}

function findDisplayByExactBounds(targetSize) {
  return screen
    .getAllDisplays()
    .find(
      (display) =>
        display.bounds.width === targetSize.width && display.bounds.height === targetSize.height,
    );
}

function clearWindowTiling(window) {
  if (!window || window.isDestroyed()) {
    return;
  }

  window.setKiosk(false);
  if (window.isFullScreen()) {
    window.setFullScreen(false);
  }
  window.setMenuBarVisibility(false);
}

function tileWindowToDisplay(window, display) {
  if (!window || window.isDestroyed()) {
    return;
  }

  if (!display) {
    clearWindowTiling(window);
    return;
  }

  const { x, y, width, height } = display.bounds;
  clearWindowTiling(window);
  window.setBounds({ x, y, width, height });
  window.setMenuBarVisibility(false);
  window.setKiosk(true);
}

function tileCompWindows() {
  const mainHudDisplay = findDisplayByExactBounds(MAIN_HUD_DISPLAY_SIZE);
  const touchscreenDisplay = findDisplayByExactBounds(TOUCHSCREEN_DISPLAY_SIZE);

  tileWindowToDisplay(mainWindow, mainHudDisplay);
  tileWindowToDisplay(touchscreenWindow, touchscreenDisplay);
}

function attachTilingShortcut(window) {
  window.webContents.on("before-input-event", (event, input) => {
    if (!isShortcutInput(input)) {
      return;
    }

    event.preventDefault();
    tileCompWindows();
  });
}

async function createAppWindow(options) {
  const {
    routePath,
    width,
    height,
    minWidth,
    minHeight,
    title,
    assignWindow,
  } = options;
  const iconPath = getWindowIconPath();
  const startUrl = await getRendererStartUrl();

  const window = new BrowserWindow({
    width,
    height,
    minWidth,
    minHeight,
    title,
    icon: iconPath,
    autoHideMenuBar: true,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const rendererId = window.webContents.id;

  assignWindow(window);
  attachTilingShortcut(window);
  window.on("closed", () => {
    handleRendererDestroyed(rendererId);
    assignWindow(null);
  });

  await window.loadURL(new URL(routePath, startUrl).toString());
  return window;
}

async function createWindows() {
  if (!mainWindow) {
    mainWindow = await createAppWindow({
      routePath: "/hud",
      width: 1440,
      height: 900,
      minWidth: 1024,
      minHeight: 720,
      title: "PWRUP Comp",
      assignWindow: (window) => {
        mainWindow = window;
      },
    });
  }

  if (!touchscreenWindow) {
    touchscreenWindow = await createAppWindow({
      routePath: "/touchscreen",
      width: 1920,
      height: 515,
      minWidth: 1280,
      minHeight: 420,
      title: "PWRUP Comp Touchscreen",
      assignWindow: (window) => {
        touchscreenWindow = window;
      },
    });
  }
}

app.on("before-quit", () => {
  app.isQuitting = true;
  settingsManager.stop();
  ntBroker.stop();
  autobahnBroker.stop();
  stopBundledNextServer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindows();
  }
});

app
  .whenReady()
  .then(async () => {
    await initializeBridge();
    await createWindows();
    tileCompWindows();
  })
  .catch((error) => {
    const baseMessage = `Failed to start the app.\n\n${error.message}`;
    if (app.isPackaged) {
      dialog.showErrorBox("PWRUP Comp", `${baseMessage}\n\n${getBundledServerDiagnostics()}`);
    } else {
      dialog.showErrorBox("PWRUP Comp", baseMessage);
    }
    app.quit();
  });
