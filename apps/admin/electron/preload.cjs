const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("blitzRenderer", {
  platform: process.platform,
  electronVersion: process.versions.electron,
});
