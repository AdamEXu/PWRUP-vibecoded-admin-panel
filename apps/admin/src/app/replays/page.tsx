// src/app/replays/page.tsx - Purpose: manage remote replay downloads and visualize local replay DB summaries.
"use client";

import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pwrup/shared-ui/card";
import { Input } from "@pwrup/shared-ui/input";
import { Label } from "@pwrup/shared-ui/label";
import { Button } from "@pwrup/shared-ui/button";
import { Textarea } from "@pwrup/shared-ui/textarea";
import {
  DEFAULT_LOCAL_DOWNLOAD_DIR,
  DEFAULT_REMOTE_REPLAY_ROOT,
  type ReplayLocalFile,
  type ReplayRemoteFile,
  type ReplaySummarySample,
  type ReplaySummary,
  type ReplayTopicSchemaMap,
} from "@/lib/replays/shared";

const REPLAY_UI_CACHE_KEY = "blitz.replays.ui.v1";
const REPLAY_LIST_CACHE_KEY = "blitz.replays.list.v1";

interface ReplayUiCache {
  host: string;
  user: string;
  remoteRoot: string;
  localDir: string;
  useSafeSnapshot: boolean;
  protoSchemaText: string;
  topicSchemaInput: string;
  remoteFilter: string;
  localFilter: string;
}

interface ReplayListCache {
  remoteFiles: ReplayRemoteFile[];
  localFiles: ReplayLocalFile[];
  cachedAtIso: string;
}

function humanBytes(n: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = n;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(1)} ${units[idx]}`;
}

function dateText(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function dateBucket(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "unknown-date";
  }
  return date.toISOString().slice(0, 10);
}

export default function ReplaysPage() {
  const [host, setHost] = useState("");
  const [user, setUser] = useState("pi");
  const [password, setPassword] = useState("");
  const [remoteRoot, setRemoteRoot] = useState(DEFAULT_REMOTE_REPLAY_ROOT);
  const [localDir, setLocalDir] = useState(DEFAULT_LOCAL_DOWNLOAD_DIR);
  const [useSafeSnapshot, setUseSafeSnapshot] = useState(true);

  const [isListingRemote, setIsListingRemote] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeletingRemote, setIsDeletingRemote] = useState(false);
  const [isListingLocal, setIsListingLocal] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isDeletingLocal, setIsDeletingLocal] = useState(false);

  const [remoteFiles, setRemoteFiles] = useState<ReplayRemoteFile[]>([]);
  const [selectedRemotePaths, setSelectedRemotePaths] = useState<string[]>([]);
  const [localFiles, setLocalFiles] = useState<ReplayLocalFile[]>([]);
  const [selectedLocalPaths, setSelectedLocalPaths] = useState<string[]>([]);
  const [selectedLocalPath, setSelectedLocalPath] = useState("");
  const [summary, setSummary] = useState<ReplaySummary | null>(null);
  const [validatedRow, setValidatedRow] = useState<ReplaySummarySample | null>(null);
  const [rowValidation, setRowValidation] = useState<{
    isMappedTopic: boolean;
    isProtobufRow: boolean;
    decodeSucceeded: boolean;
  } | null>(null);
  const [protoSchemaText, setProtoSchemaText] = useState(
    [
      'syntax = "proto3";',
      "",
      "package proto.sensor;",
      "",
      "message GeneralSensorData {",
      "  bytes image = 1;",
      "  string status = 2;",
      "}",
    ].join("\n"),
  );
  const [topicSchemaInput, setTopicSchemaInput] = useState(
    [
      "# one mapping per line:",
      "# topic=package.MessageName",
      "camera/front/frame=proto.sensor.GeneralSensorData",
    ].join("\n"),
  );
  const [remoteFilter, setRemoteFilter] = useState("");
  const [localFilter, setLocalFilter] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isValidatingRow, setIsValidatingRow] = useState(false);

  useEffect(() => {
    try {
      const rawUi = localStorage.getItem(REPLAY_UI_CACHE_KEY);
      if (rawUi) {
        const parsed = JSON.parse(rawUi) as ReplayUiCache;
        setHost(parsed.host ?? "");
        setUser(parsed.user ?? "pi");
        setRemoteRoot(parsed.remoteRoot ?? DEFAULT_REMOTE_REPLAY_ROOT);
        setLocalDir(parsed.localDir ?? DEFAULT_LOCAL_DOWNLOAD_DIR);
        setUseSafeSnapshot(parsed.useSafeSnapshot ?? true);
        setProtoSchemaText(parsed.protoSchemaText ?? "");
        setTopicSchemaInput(parsed.topicSchemaInput ?? "");
        setRemoteFilter(parsed.remoteFilter ?? "");
        setLocalFilter(parsed.localFilter ?? "");
      }
      const rawLists = localStorage.getItem(REPLAY_LIST_CACHE_KEY);
      if (rawLists) {
        const parsed = JSON.parse(rawLists) as ReplayListCache;
        setRemoteFiles(parsed.remoteFiles ?? []);
        setLocalFiles(parsed.localFiles ?? []);
        if ((parsed.remoteFiles?.length ?? 0) > 0 || (parsed.localFiles?.length ?? 0) > 0) {
          setMessage(
            `Loaded cached replay lists from ${dateText(parsed.cachedAtIso || new Date().toISOString())}.`,
          );
        }
      }
    } catch {
      // Ignore malformed cache and continue with defaults.
    }
  }, []);

  useEffect(() => {
    const payload: ReplayUiCache = {
      host,
      user,
      remoteRoot,
      localDir,
      useSafeSnapshot,
      protoSchemaText,
      topicSchemaInput,
      remoteFilter,
      localFilter,
    };
    localStorage.setItem(REPLAY_UI_CACHE_KEY, JSON.stringify(payload));
  }, [
    host,
    user,
    remoteRoot,
    localDir,
    useSafeSnapshot,
    protoSchemaText,
    topicSchemaInput,
    remoteFilter,
    localFilter,
  ]);

  useEffect(() => {
    const payload: ReplayListCache = {
      remoteFiles,
      localFiles,
      cachedAtIso: new Date().toISOString(),
    };
    localStorage.setItem(REPLAY_LIST_CACHE_KEY, JSON.stringify(payload));
  }, [remoteFiles, localFiles]);

  const canRunRemote = useMemo(
    () => host.trim().length > 0 && user.trim().length > 0,
    [host, user],
  );

  const filteredRemoteFiles = useMemo(() => {
    const query = remoteFilter.trim().toLowerCase();
    if (!query) {
      return remoteFiles;
    }
    return remoteFiles.filter((file) => file.path.toLowerCase().includes(query));
  }, [remoteFiles, remoteFilter]);

  const groupedRemoteByDate = useMemo(() => {
    const grouped: Record<string, Record<string, ReplayRemoteFile[]>> = {};
    for (const file of filteredRemoteFiles) {
      const day = dateBucket(file.modifiedIso);
      const normalized = file.path.replaceAll("\\", "/");
      const parts = normalized.split("/").filter(Boolean);
      const processGroup = parts.length >= 2 ? parts[parts.length - 2] : "ungrouped";
      if (!grouped[day]) {
        grouped[day] = {};
      }
      if (!grouped[day][processGroup]) {
        grouped[day][processGroup] = [];
      }
      grouped[day][processGroup].push(file);
    }

    const dayEntries = Object.entries(grouped).map(([day, processes]) => {
      const processEntries = Object.entries(processes).sort((a, b) => {
        if (b[1].length !== a[1].length) {
          return b[1].length - a[1].length;
        }
        return a[0].localeCompare(b[0]);
      });
      return {
        day,
        processes: processEntries,
        count: processEntries.reduce((sum, [, files]) => sum + files.length, 0),
      };
    });
    return dayEntries.sort((a, b) => {
      if (a.day === "unknown-date") {
        return 1;
      }
      if (b.day === "unknown-date") {
        return -1;
      }
      return b.day.localeCompare(a.day);
    });
  }, [filteredRemoteFiles]);

  const filteredLocalFiles = useMemo(() => {
    const query = localFilter.trim().toLowerCase();
    if (!query) {
      return localFiles;
    }
    return localFiles.filter((file) =>
      `${file.name} ${file.path}`.toLowerCase().includes(query),
    );
  }, [localFiles, localFilter]);

  const groupedLocalByDate = useMemo(() => {
    const grouped: Record<string, ReplayLocalFile[]> = {};
    for (const file of filteredLocalFiles) {
      const day = dateBucket(file.modifiedIso);
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(file);
    }
    return Object.entries(grouped).sort((a, b) => {
      if (a[0] === "unknown-date") {
        return 1;
      }
      if (b[0] === "unknown-date") {
        return -1;
      }
      return b[0].localeCompare(a[0]);
    });
  }, [filteredLocalFiles]);

  function parseTopicSchemaMap(input: string): ReplayTopicSchemaMap {
    const rows = input
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
    const mapping: ReplayTopicSchemaMap = {};
    for (const row of rows) {
      const eqIdx = row.indexOf("=");
      if (eqIdx <= 0 || eqIdx >= row.length - 1) {
        continue;
      }
      const topic = row.slice(0, eqIdx).trim();
      const schema = row.slice(eqIdx + 1).trim();
      if (topic && schema) {
        mapping[topic] = schema;
      }
    }
    return mapping;
  }

  async function listRemote() {
    if (!canRunRemote) {
      setError("Host and user are required.");
      return;
    }
    setError("");
    setMessage("");
    setIsListingRemote(true);
    try {
      const res = await fetch("/api/replays/remote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: host.trim(),
          user: user.trim(),
          password,
          remoteRoot: remoteRoot.trim(),
        }),
      });
      const data = (await res.json()) as
        | { ok: true; files: ReplayRemoteFile[] }
        | { ok: false; message: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.ok ? "Failed to list remote replay files." : data.message);
      }
      setRemoteFiles(data.files);
      setSelectedRemotePaths([]);
      setMessage(`Found ${data.files.length} replay file(s) on remote host.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsListingRemote(false);
    }
  }

  async function downloadSelected() {
    if (!canRunRemote) {
      setError("Host and user are required.");
      return;
    }
    if (selectedRemotePaths.length === 0) {
      setError("Select at least one remote replay file to download.");
      return;
    }
    setError("");
    setMessage("");
    setIsDownloading(true);
    try {
      const res = await fetch("/api/replays/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: host.trim(),
          user: user.trim(),
          password,
          remoteRoot: remoteRoot.trim(),
          localDir: localDir.trim(),
          remotePaths: selectedRemotePaths,
          useSafeSnapshot,
        }),
      });
      const data = (await res.json()) as
        | { ok: true; downloaded: string[] }
        | { ok: false; message: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.ok ? "Failed to download replay file(s)." : data.message);
      }
      setMessage(`Downloaded ${data.downloaded.length} replay file(s) into ${localDir}.`);
      await listLocal();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsDownloading(false);
    }
  }

  async function deleteRemoteRecordings(opts: { deleteAll?: boolean; paths?: string[] }) {
    if (!canRunRemote) {
      setError("Host and user are required.");
      return;
    }
    const deleteAll = opts.deleteAll === true;
    const paths = opts.paths ?? [];
    if (!deleteAll && paths.length === 0) {
      setError("Select at least one remote replay to delete.");
      return;
    }

    const confirmText = deleteAll
      ? `Delete ALL remote replay files under ${remoteRoot}?`
      : `Delete ${paths.length} selected remote replay file(s)?`;
    if (!window.confirm(confirmText)) {
      return;
    }

    setError("");
    setMessage("");
    setIsDeletingRemote(true);
    try {
      const res = await fetch("/api/replays/remote", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: host.trim(),
          user: user.trim(),
          password,
          remoteRoot: remoteRoot.trim(),
          remotePaths: paths,
          deleteAll,
        }),
      });
      const data = (await res.json()) as
        | { ok: true; deletedPaths: string[]; skippedPaths: string[] }
        | { ok: false; message: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.ok ? "Failed to delete remote replay files." : data.message);
      }
      setSelectedRemotePaths((prev) =>
        deleteAll ? [] : prev.filter((entry) => !data.deletedPaths.includes(entry)),
      );
      await listRemote();
      setMessage(
        `Deleted ${data.deletedPaths.length} remote file(s)${
          data.skippedPaths.length > 0 ? `, skipped ${data.skippedPaths.length}.` : "."
        }`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsDeletingRemote(false);
    }
  }

  async function listLocal() {
    setError("");
    setMessage("");
    setIsListingLocal(true);
    try {
      const query = new URLSearchParams({ localDir: localDir.trim() }).toString();
      const res = await fetch(`/api/replays/local?${query}`);
      const data = (await res.json()) as
        | { ok: true; files: ReplayLocalFile[] }
        | { ok: false; message: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.ok ? "Failed to list local replay files." : data.message);
      }
      setLocalFiles(data.files);
      setSelectedLocalPaths((prev) =>
        prev.filter((selected) => data.files.some((file) => file.path === selected)),
      );
      if (selectedLocalPath && !data.files.some((file) => file.path === selectedLocalPath)) {
        setSelectedLocalPath("");
        setSummary(null);
        setValidatedRow(null);
        setRowValidation(null);
      }
      setMessage(`Found ${data.files.length} local replay file(s).`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsListingLocal(false);
    }
  }

  async function deleteLocalReplays(opts: { deleteAll?: boolean; paths?: string[] }) {
    const deleteAll = opts.deleteAll === true;
    const paths = opts.paths ?? [];
    if (!deleteAll && paths.length === 0) {
      setError("Select at least one local replay to delete.");
      return;
    }

    const confirmText = deleteAll
      ? "Delete ALL local replay files in this directory?"
      : `Delete ${paths.length} selected local replay file(s)?`;
    if (!window.confirm(confirmText)) {
      return;
    }

    setError("");
    setMessage("");
    setIsDeletingLocal(true);
    try {
      const res = await fetch("/api/replays/local", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localDir: localDir.trim(),
          deleteAll,
          paths,
        }),
      });
      const data = (await res.json()) as
        | { ok: true; deletedPaths: string[]; skippedPaths: string[] }
        | { ok: false; message: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.ok ? "Failed to delete local replay files." : data.message);
      }

      setSelectedLocalPaths((prev) =>
        deleteAll ? [] : prev.filter((entry) => !data.deletedPaths.includes(entry)),
      );
      if (selectedLocalPath && data.deletedPaths.includes(selectedLocalPath)) {
        setSelectedLocalPath("");
        setSummary(null);
        setValidatedRow(null);
        setRowValidation(null);
      }
      await listLocal();
      setMessage(
        `Deleted ${data.deletedPaths.length} file(s)${
          data.skippedPaths.length > 0 ? `, skipped ${data.skippedPaths.length}.` : "."
        }`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsDeletingLocal(false);
    }
  }

  async function inspectLocal(dbPath: string) {
    setSelectedLocalPath(dbPath);
    setSummary(null);
    setError("");
    setMessage("");
    setIsInspecting(true);
    setValidatedRow(null);
    setRowValidation(null);
    try {
      const res = await fetch("/api/replays/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbPath,
          samples: 15,
          topicSchemas: parseTopicSchemaMap(topicSchemaInput),
          protoSchemaText,
        }),
      });
      const data = (await res.json()) as
        | { ok: true; summary: ReplaySummary }
        | { ok: false; message: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.ok ? "Failed to inspect replay DB." : data.message);
      }
      setSummary(data.summary);
      setMessage(`Loaded replay summary for ${dbPath}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsInspecting(false);
    }
  }

  async function validateRow(opts: { dbPath: string; rowId?: number }) {
    setError("");
    setMessage("");
    setIsValidatingRow(true);
    try {
      const res = await fetch("/api/replays/row", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbPath: opts.dbPath,
          rowId: opts.rowId,
          topicSchemas: parseTopicSchemaMap(topicSchemaInput),
          protoSchemaText,
        }),
      });
      const data = (await res.json()) as
        | {
            ok: true;
            row: ReplaySummarySample;
            validation: {
              isMappedTopic: boolean;
              isProtobufRow: boolean;
              decodeSucceeded: boolean;
            };
          }
        | { ok: false; message: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.ok ? "Failed to validate replay row." : data.message);
      }
      setValidatedRow(data.row);
      setRowValidation(data.validation);
      const origin = opts.rowId ? `row #${opts.rowId}` : "a random row";
      setMessage(`Validated ${origin}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsValidatingRow(false);
    }
  }

  return (
    <AppLayout title="Replay Visualizer">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Remote Pi Connection</CardTitle>
            <CardDescription>
              Enter Pi SSH details, list available replay DB files, and download selected files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="replay-host">Host</Label>
                <Input
                  id="replay-host"
                  placeholder="10.47.65.7"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="replay-user">User</Label>
                <Input
                  id="replay-user"
                  placeholder="pi"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="replay-password">Password (optional)</Label>
                <Input
                  id="replay-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="replay-local-dir">Local download dir</Label>
                <Input
                  id="replay-local-dir"
                  value={localDir}
                  onChange={(e) => setLocalDir(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="replay-remote-root">Remote replay root</Label>
              <Input
                id="replay-remote-root"
                value={remoteRoot}
                onChange={(e) => setRemoteRoot(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useSafeSnapshot}
                onChange={(e) => setUseSafeSnapshot(e.target.checked)}
              />
              Use safe SQLite snapshot before download
            </label>
            <div className="space-y-2">
              <Label htmlFor="proto-schema-text">
                Paste .proto schema text (compiled for replay decode)
              </Label>
              <Textarea
                id="proto-schema-text"
                value={protoSchemaText}
                onChange={(e) => setProtoSchemaText(e.target.value)}
                className="min-h-36 font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic-schema-map">
                Topic to message type map
              </Label>
              <Textarea
                id="topic-schema-map"
                value={topicSchemaInput}
                onChange={(e) => setTopicSchemaInput(e.target.value)}
                className="min-h-28 font-mono text-xs"
              />
              <div className="text-muted-foreground text-xs">
                Example: <code>camera/front/frame=proto.sensor.GeneralSensorData</code>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={listRemote} disabled={isListingRemote || !canRunRemote}>
                {isListingRemote ? "Listing..." : "List Remote Replays"}
              </Button>
              <Button
                variant="outline"
                onClick={downloadSelected}
                disabled={isDownloading || selectedRemotePaths.length === 0}
              >
                {isDownloading ? "Downloading..." : "Download Selected"}
              </Button>
              <Button variant="outline" onClick={listLocal} disabled={isListingLocal}>
                {isListingLocal ? "Refreshing..." : "Refresh Local Files"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem(REPLAY_LIST_CACHE_KEY);
                  setMessage("Cleared cached replay lists.");
                }}
              >
                Clear Cache
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Available Remote Replays</CardTitle>
            <CardDescription>
              Select one or more `.db` files to download from the Pi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Filter remote files by path..."
              value={remoteFilter}
              onChange={(e) => setRemoteFilter(e.target.value)}
            />
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>
                Showing {filteredRemoteFiles.length} of {remoteFiles.length}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    setSelectedRemotePaths(
                      Array.from(
                        new Set([
                          ...selectedRemotePaths,
                          ...filteredRemoteFiles.map((f) => f.path),
                        ]),
                      ),
                    )
                  }
                >
                  Select visible
                </button>
                <button
                  type="button"
                  className="underline"
                  onClick={() =>
                    setSelectedRemotePaths((prev) =>
                      prev.filter(
                        (path) => !filteredRemoteFiles.some((f) => f.path === path),
                      ),
                    )
                  }
                >
                  Clear visible
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isDeletingRemote || selectedRemotePaths.length === 0}
                onClick={() =>
                  void deleteRemoteRecordings({ paths: selectedRemotePaths })
                }
              >
                {isDeletingRemote ? "Deleting..." : "Delete selected remote"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isDeletingRemote || remoteFiles.length === 0}
                onClick={() => void deleteRemoteRecordings({ deleteAll: true })}
              >
                {isDeletingRemote ? "Deleting..." : "Delete all remote"}
              </Button>
            </div>
            <div className="max-h-[42rem] space-y-2 overflow-auto rounded-md border p-3">
              {remoteFiles.length === 0 && (
                <div className="text-muted-foreground text-sm">
                  No remote files loaded yet.
                </div>
              )}
              {groupedRemoteByDate.map(({ day, processes, count }) => {
                const dayBytes = processes.reduce(
                  (sum, [, files]) =>
                    sum + files.reduce((inner, file) => inner + file.sizeBytes, 0),
                  0,
                );
                return (
                  <details key={day} open className="rounded-md border">
                    <summary className="cursor-pointer px-2 py-1 text-sm font-medium">
                      {day} ({count}) - {humanBytes(dayBytes)}
                    </summary>
                    <div className="space-y-2 p-2">
                      {processes.map(([groupName, files]) => {
                        const groupBytes = files.reduce(
                          (sum, file) => sum + file.sizeBytes,
                          0,
                        );
                        return (
                          <details key={`${day}-${groupName}`} open className="rounded border">
                            <summary className="cursor-pointer px-2 py-1 text-xs font-medium">
                              {groupName} ({files.length}) - {humanBytes(groupBytes)}
                            </summary>
                            <div className="space-y-2 p-2">
                              {files.map((file) => {
                                const checked = selectedRemotePaths.includes(file.path);
                                return (
                                  <label
                                    key={file.path}
                                    className="hover:bg-accent/50 flex cursor-pointer items-start gap-2 rounded-md border p-2"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedRemotePaths((prev) => [...prev, file.path]);
                                        } else {
                                          setSelectedRemotePaths((prev) =>
                                            prev.filter((entry) => entry !== file.path),
                                          );
                                        }
                                      }}
                                    />
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold">
                                        {file.path.split("/").at(-1) ?? file.path}
                                      </div>
                                      <div className="text-muted-foreground text-xs">
                                        {humanBytes(file.sizeBytes)} | modified{" "}
                                        {dateText(file.modifiedIso)}
                                      </div>
                                      <div className="text-muted-foreground truncate font-mono text-[11px]">
                                        {file.path}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Local Downloaded Replays</CardTitle>
            <CardDescription>
              Click a local file to inspect replay size and rough contents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Filter local files by name/path..."
              value={localFilter}
              onChange={(e) => setLocalFilter(e.target.value)}
            />
            <div className="text-muted-foreground text-xs">
              Showing {filteredLocalFiles.length} of {localFiles.length}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isDeletingLocal || filteredLocalFiles.length === 0}
                onClick={() =>
                  setSelectedLocalPaths((prev) =>
                    Array.from(
                      new Set([
                        ...prev,
                        ...filteredLocalFiles.map((file) => file.path),
                      ]),
                    ),
                  )
                }
              >
                Select visible
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isDeletingLocal || selectedLocalPaths.length === 0}
                onClick={() =>
                  setSelectedLocalPaths((prev) =>
                    prev.filter(
                      (entry) => !filteredLocalFiles.some((file) => file.path === entry),
                    ),
                  )
                }
              >
                Clear visible
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isDeletingLocal || selectedLocalPaths.length === 0}
                onClick={() =>
                  void deleteLocalReplays({ paths: selectedLocalPaths })
                }
              >
                {isDeletingLocal ? "Deleting..." : "Delete selected"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isDeletingLocal || localFiles.length === 0}
                onClick={() => void deleteLocalReplays({ deleteAll: true })}
              >
                {isDeletingLocal ? "Deleting..." : "Delete all local"}
              </Button>
            </div>
            <div className="max-h-[42rem] space-y-2 overflow-auto rounded-md border p-3">
              {localFiles.length === 0 && (
                <div className="text-muted-foreground text-sm">
                  No local replay files found.
                </div>
              )}
              {groupedLocalByDate.map(([day, files]) => {
                const dayBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);
                return (
                  <details key={day} open className="rounded border">
                    <summary className="cursor-pointer px-2 py-1 text-xs font-medium">
                      {day} ({files.length}) - {humanBytes(dayBytes)}
                    </summary>
                    <div className="space-y-2 p-2">
                      {files.map((file) => (
                        <div
                          key={file.path}
                          className={`w-full rounded-md border p-2 transition ${
                            selectedLocalPath === file.path
                              ? "border-primary bg-accent"
                              : "hover:bg-accent/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <label className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                checked={selectedLocalPaths.includes(file.path)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLocalPaths((prev) => [...prev, file.path]);
                                  } else {
                                    setSelectedLocalPaths((prev) =>
                                      prev.filter((entry) => entry !== file.path),
                                    );
                                  }
                                }}
                              />
                              <div>
                                <div className="text-sm font-semibold">{file.name}</div>
                                <div className="text-muted-foreground text-xs">
                                  {humanBytes(file.sizeBytes)} | modified{" "}
                                  {dateText(file.modifiedIso)}
                                </div>
                                <div className="text-muted-foreground truncate text-[11px]">
                                  {file.path}
                                </div>
                              </div>
                            </label>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => inspectLocal(file.path)}
                              disabled={isInspecting}
                            >
                              Inspect
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Replay Summary</CardTitle>
            <CardDescription>
              Timeline duration, topic/data-type counts, and a sample of first rows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!summary && (
              <div className="text-muted-foreground text-sm">
                Select a local replay DB to inspect.
              </div>
            )}
            {summary && (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground text-xs">Rows</div>
                    <div className="font-medium">{summary.rowCount}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground text-xs">Duration</div>
                    <div className="font-medium">
                      {summary.durationSec.toFixed(3)}s
                    </div>
                  </div>
                  <div className="col-span-2 rounded border p-2">
                    <div className="text-muted-foreground text-xs">Start / End</div>
                    <div className="text-xs">
                      {summary.startIso ?? "-"} <span className="px-1">{"->"}</span>{" "}
                      {summary.endIso ?? "-"}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium">By topic</div>
                  <div className="max-h-32 space-y-1 overflow-auto rounded border p-2 text-xs">
                    {summary.byTopic.map((entry) => (
                      <div key={entry.topic} className="flex justify-between gap-2">
                        <span className="truncate">{entry.topic}</span>
                        <span>
                          {entry.count} rows | {entry.hz.toFixed(2)}Hz |{" "}
                          {humanBytes(entry.totalBytes)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium">By data type</div>
                  <div className="max-h-24 space-y-1 overflow-auto rounded border p-2 text-xs">
                    {summary.byType.map((entry) => (
                      <div key={entry.dataType} className="flex justify-between gap-2">
                        <span className="truncate">{entry.dataType}</span>
                        <span>{entry.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">First samples</div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!selectedLocalPath || isValidatingRow}
                      onClick={() => {
                        if (!selectedLocalPath) {
                          return;
                        }
                        void validateRow({ dbPath: selectedLocalPath });
                      }}
                    >
                      {isValidatingRow ? "Validating..." : "Validate Random Row"}
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-auto rounded border p-2 text-xs">
                    {summary.samples.map((sample, index) => (
                      <button
                        key={`${sample.topic}-${index}`}
                        type="button"
                        className="w-full space-y-1 border-b py-1 text-left last:border-b-0 hover:bg-accent/30"
                        disabled={!selectedLocalPath || isValidatingRow}
                        onClick={() => {
                          if (!selectedLocalPath) {
                            return;
                          }
                          void validateRow({
                            dbPath: selectedLocalPath,
                            rowId: sample.rowId,
                          });
                        }}
                      >
                        <div>
                          id={sample.rowId} |{" "}
                          t+{sample.relSec.toFixed(3)}s | topic={sample.topic} |
                          type={sample.dataType} | size={sample.sizeBytes}B
                        </div>
                        {sample.schemaId && (
                          <div className="text-muted-foreground">
                            schema={sample.schemaId}
                          </div>
                        )}
                        {sample.decodeError && (
                          <div className="text-destructive">
                            decode error: {sample.decodeError}
                          </div>
                        )}
                        {sample.decoded !== undefined && (
                          <pre className="bg-muted max-h-40 overflow-auto rounded p-1 text-[11px]">
                            {JSON.stringify(sample.decoded, null, 2)}
                          </pre>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {validatedRow && rowValidation && (
        <Card>
          <CardHeader>
            <CardTitle>Row Validation</CardTitle>
            <CardDescription>
              Validation details for the selected row payload.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded border p-2">
              row #{validatedRow.rowId} | topic={validatedRow.topic} | type=
              {validatedRow.dataType} | size={validatedRow.sizeBytes}B
            </div>
            <div className="rounded border p-2">
              mapped topic: {rowValidation.isMappedTopic ? "yes" : "no"} | protobuf row:{" "}
              {rowValidation.isProtobufRow ? "yes" : "no"} | decode ok:{" "}
              {rowValidation.decodeSucceeded ? "yes" : "no"}
            </div>
            {validatedRow.schemaId && (
              <div className="text-muted-foreground text-xs">
                schema={validatedRow.schemaId}
              </div>
            )}
            {validatedRow.decodeError && (
              <div className="text-destructive text-xs">
                decode error: {validatedRow.decodeError}
              </div>
            )}
            {validatedRow.decoded !== undefined && (
              <pre className="bg-muted max-h-56 overflow-auto rounded p-2 text-xs">
                {JSON.stringify(validatedRow.decoded, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      {(message || error) && (
        <Card>
          <CardContent className="pt-6">
            {message && <div className="text-emerald-400 text-sm">{message}</div>}
            {error && <div className="text-destructive text-sm">{error}</div>}
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
