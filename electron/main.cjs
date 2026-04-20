const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("child_process");
const http = require("http");
const net = require("net");
const path = require("path");

const HOST = "127.0.0.1";
const DEFAULT_DEV_URL = "http://127.0.0.1:3000";
const SERVER_START_TIMEOUT_MS = 60_000;
const SERVER_POLL_INTERVAL_MS = 300;

let mainWindow = null;
let nextServerProcess = null;
let packagedServerUrl = null;
let bundledServerScriptPath = null;
let bundledServerCwd = null;
const serverLogBuffer = [];
const SERVER_LOG_BUFFER_MAX = 120;

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
    // eslint-disable-next-line no-await-in-loop
    if (await canConnect(url)) {
      return;
    }

    // eslint-disable-next-line no-await-in-loop
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
        "Blitz Renderer",
        [
          `Embedded server stopped unexpectedly (code: ${code ?? "null"}, signal: ${signal ?? "none"}).`,
          "",
          getBundledServerDiagnostics(),
        ].join("\n")
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

async function createMainWindow() {
  const iconPath = getWindowIconPath();
  let startUrl = process.env.ELECTRON_START_URL || DEFAULT_DEV_URL;

  if (app.isPackaged) {
    if (!packagedServerUrl) {
      const port = await getOpenPort();
      await startBundledNextServer(port);
      packagedServerUrl = `http://${HOST}:${port}`;
    }
    startUrl = packagedServerUrl;
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    title: "Blitz Renderer",
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(startUrl);
}

app.on("before-quit", () => {
  app.isQuitting = true;
  stopBundledNextServer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});

app
  .whenReady()
  .then(() => createMainWindow())
  .catch((error) => {
    const baseMessage = `Failed to start the app.\n\n${error.message}`;
    if (app.isPackaged) {
      dialog.showErrorBox("Blitz Renderer", `${baseMessage}\n\n${getBundledServerDiagnostics()}`);
    } else {
      dialog.showErrorBox("Blitz Renderer", baseMessage);
    }
    app.quit();
  });
