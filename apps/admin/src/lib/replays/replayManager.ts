// src/lib/replays/replayManager.ts - Purpose: manage remote replay listing/downloading and local replay inspection.
import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import {
  DEFAULT_LOCAL_DOWNLOAD_DIR,
  type ReplayConnectionConfig,
  type ReplayLocalFile,
  type ReplayRemoteFile,
  type ReplaySummarySample,
  type ReplaySummary,
} from "@/lib/replays/shared";

function runCommand(
  command: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `Command failed (${command} ${args.join(" ")}): ${stderr || stdout || `exit ${code}`}`,
        ),
      );
    });
  });
}

function buildRemoteTarget(user: string, host: string): string {
  return `${user}@${host}`;
}

function buildInlinePython(script: string): string {
  const encoded = Buffer.from(script, "utf8").toString("base64");
  return `python3 -c "import base64;exec(base64.b64decode('${encoded}').decode())"`;
}

async function runSshCommand(
  sshArgs: string[],
  password?: string,
): Promise<{ stdout: string; stderr: string }> {
  if (password) {
    const env = { ...process.env, SSHPASS: password };
    return runCommand("sshpass", ["-e", ...sshArgs], env);
  }
  return runCommand(sshArgs[0], sshArgs.slice(1));
}

async function createRemoteSnapshot(
  cfg: ReplayConnectionConfig,
  remotePath: string,
): Promise<string> {
  const remote = buildRemoteTarget(cfg.user, cfg.host);
  const script = [
    "import os",
    "import pathlib",
    "import sqlite3",
    "import tempfile",
    `src = os.path.expanduser(${JSON.stringify(remotePath)})`,
    "if not pathlib.Path(src).exists():",
    "    raise FileNotFoundError(src)",
    "fd, dst = tempfile.mkstemp(prefix='replay_snapshot_', suffix='.db')",
    "os.close(fd)",
    "src_conn = sqlite3.connect(src)",
    "dst_conn = sqlite3.connect(dst)",
    "with dst_conn:",
    "    src_conn.backup(dst_conn)",
    "src_conn.close()",
    "dst_conn.close()",
    "print(dst)",
  ].join("\n");
  const remoteCmd = buildInlinePython(script);
  const { stdout } = await runSshCommand(
    ["ssh", remote, remoteCmd],
    cfg.password,
  );
  const lastLine = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
  if (!lastLine) {
    throw new Error("Failed to create remote SQLite snapshot.");
  }
  return lastLine;
}

async function cleanupRemoteSnapshot(
  cfg: ReplayConnectionConfig,
  snapshotPath: string,
): Promise<void> {
  const remote = buildRemoteTarget(cfg.user, cfg.host);
  await runSshCommand(["ssh", remote, `rm -f ${JSON.stringify(snapshotPath)}`], cfg.password).catch(
    () => undefined,
  );
}

export async function listRemoteReplays(
  cfg: ReplayConnectionConfig,
): Promise<ReplayRemoteFile[]> {
  const remote = buildRemoteTarget(cfg.user, cfg.host);
  const script = [
    "import datetime",
    "import os",
    "import pathlib",
    `root = os.path.expanduser(${JSON.stringify(cfg.remoteRoot)})`,
    "p = pathlib.Path(root)",
    "exists = p.exists()",
    "print('__EXISTS__' if exists else '__MISSING__')",
    "files = [] if not exists else sorted(p.rglob('*.db'))",
    "for f in files:",
    "    st = f.stat()",
    "    m = datetime.datetime.fromtimestamp(st.st_mtime).isoformat()",
    "    print(f'{f}\\t{st.st_size}\\t{m}')",
  ].join("\n");
  const remoteCmd = buildInlinePython(script);
  const { stdout } = await runSshCommand(["ssh", remote, remoteCmd], cfg.password);
  const lines = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0 || lines[0] === "__MISSING__") {
    return [];
  }

  const files: ReplayRemoteFile[] = [];
  for (const line of lines.slice(1)) {
    const [filePath, sizeRaw, modifiedIso] = line.split("\t");
    const sizeBytes = Number(sizeRaw);
    if (!filePath || !modifiedIso || !Number.isFinite(sizeBytes)) {
      continue;
    }
    files.push({ path: filePath, sizeBytes, modifiedIso });
  }
  return files;
}

export async function deleteRemoteReplays(
  cfg: ReplayConnectionConfig,
  remotePaths: string[],
  deleteAll: boolean,
): Promise<{ deletedPaths: string[]; skippedPaths: string[] }> {
  const remote = buildRemoteTarget(cfg.user, cfg.host);
  const script = [
    "import json",
    "import os",
    "import pathlib",
    `root = pathlib.Path(os.path.expanduser(${JSON.stringify(cfg.remoteRoot)})).resolve()`,
    `delete_all = ${deleteAll ? "True" : "False"}`,
    `targets = json.loads(${JSON.stringify(JSON.stringify(remotePaths))})`,
    "deleted = []",
    "skipped = []",
    "if not root.exists():",
    "    print(json.dumps({'deletedPaths': deleted, 'skippedPaths': skipped}))",
    "    raise SystemExit(0)",
    "if delete_all:",
    "    candidates = sorted(root.rglob('*.db'))",
    "else:",
    "    candidates = []",
    "    for target in targets:",
    "        p = pathlib.Path(os.path.expanduser(target))",
    "        try:",
    "            rp = p.resolve()",
    "        except Exception:",
    "            skipped.append(str(p))",
    "            continue",
    "        inside = str(rp).startswith(str(root) + os.sep) or rp == root",
    "        if inside and rp.suffix == '.db' and rp.exists() and rp.is_file():",
    "            candidates.append(rp)",
    "        else:",
    "            skipped.append(str(rp))",
    "for p in candidates:",
    "    try:",
    "        p.unlink()",
    "        deleted.append(str(p))",
    "    except Exception:",
    "        skipped.append(str(p))",
    "print(json.dumps({'deletedPaths': deleted, 'skippedPaths': skipped}))",
  ].join("\n");
  const remoteCmd = buildInlinePython(script);
  const { stdout } = await runSshCommand(["ssh", remote, remoteCmd], cfg.password);
  const parsed = JSON.parse(stdout.trim()) as {
    deletedPaths?: string[];
    skippedPaths?: string[];
  };
  return {
    deletedPaths: parsed.deletedPaths ?? [],
    skippedPaths: parsed.skippedPaths ?? [],
  };
}

export async function downloadRemoteReplays(
  cfg: ReplayConnectionConfig,
  remotePaths: string[],
  localDir: string,
  useSafeSnapshot: boolean,
): Promise<string[]> {
  await fs.mkdir(localDir, { recursive: true });
  const remote = buildRemoteTarget(cfg.user, cfg.host);
  const savedPaths: string[] = [];

  for (const remotePath of remotePaths) {
    const fileName = path.basename(remotePath);
    const destination = path.resolve(localDir, fileName);
    let scpSourcePath = remotePath;
    let snapshotPath: string | undefined;

    if (useSafeSnapshot) {
      snapshotPath = await createRemoteSnapshot(cfg, remotePath);
      scpSourcePath = snapshotPath;
    }

    await runSshCommand(
      ["scp", `${remote}:${scpSourcePath}`, destination],
      cfg.password,
    );
    savedPaths.push(destination);

    if (snapshotPath) {
      await cleanupRemoteSnapshot(cfg, snapshotPath);
    }
  }

  return savedPaths;
}

export async function listLocalReplays(
  localDir: string = DEFAULT_LOCAL_DOWNLOAD_DIR,
): Promise<ReplayLocalFile[]> {
  const targetDir = path.resolve(localDir);
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".db"));
  const withStats = await Promise.all(
    files.map(async (entry) => {
      const absolutePath = path.join(targetDir, entry.name);
      const stat = await fs.stat(absolutePath);
      return {
        name: entry.name,
        path: absolutePath,
        sizeBytes: stat.size,
        modifiedIso: stat.mtime.toISOString(),
      };
    }),
  );
  return withStats.sort((a, b) => b.modifiedIso.localeCompare(a.modifiedIso));
}

export async function deleteLocalReplays(
  localDir: string = DEFAULT_LOCAL_DOWNLOAD_DIR,
  targetPaths: string[] = [],
  deleteAll: boolean = false,
): Promise<{ deletedPaths: string[]; skippedPaths: string[] }> {
  const targetDir = path.resolve(localDir);
  await fs.mkdir(targetDir, { recursive: true });
  const dirPrefix = `${targetDir}${path.sep}`;

  let candidates: string[] = [];
  if (deleteAll) {
    const files = await listLocalReplays(localDir);
    candidates = files.map((file) => file.path);
  } else {
    candidates = targetPaths.map((entry) => path.resolve(entry));
  }

  const deletedPaths: string[] = [];
  const skippedPaths: string[] = [];
  for (const candidate of candidates) {
    const insideDir = candidate === targetDir || candidate.startsWith(dirPrefix);
    const isDb = candidate.endsWith(".db");
    if (!insideDir || !isDb) {
      skippedPaths.push(candidate);
      continue;
    }
    try {
      await fs.unlink(candidate);
      deletedPaths.push(candidate);
    } catch {
      skippedPaths.push(candidate);
    }
  }

  return { deletedPaths, skippedPaths };
}

export async function inspectReplayDb(
  dbPath: string,
  sampleCount: number = 10,
): Promise<ReplaySummary> {
  const script = [
    "import base64",
    "import datetime",
    "import json",
    "import sqlite3",
    "import sys",
    "db_path = sys.argv[1]",
    "sample_count = int(sys.argv[2])",
    "with sqlite3.connect(db_path) as conn:",
    "    rows = conn.execute(",
    "        'SELECT id, key, timestamp, data_type, length(data), data FROM ReplayDB ORDER BY id ASC'",
    "    ).fetchall()",
    "if not rows:",
    "    print(json.dumps({",
    "        'rowCount': 0,",
    "        'startIso': None,",
    "        'endIso': None,",
    "        'durationSec': 0.0,",
    "        'byTopic': [],",
    "        'byType': [],",
    "        'samples': []",
    "    }))",
    "    raise SystemExit(0)",
    "first_ts = float(rows[0][2])",
    "last_ts = float(rows[-1][2])",
    "span = max(0.0, last_ts - first_ts)",
    "by_topic = {}",
    "by_type = {}",
    "bytes_by_topic = {}",
    "for row_id, key, ts, data_type, data_size, data in rows:",
    "    by_topic[key] = by_topic.get(key, 0) + 1",
    "    by_type[data_type] = by_type.get(data_type, 0) + 1",
    "    bytes_by_topic[key] = bytes_by_topic.get(key, 0) + (int(data_size) if data_size else 0)",
    "topic_rows = [",
    "    {",
    "        'topic': k,",
    "        'count': c,",
    "        'hz': (c / span) if span > 0 else 0.0,",
    "        'totalBytes': bytes_by_topic.get(k, 0)",
    "    }",
    "    for k, c in sorted(by_topic.items(), key=lambda kv: kv[1], reverse=True)",
    "]",
    "type_rows = [",
    "    { 'dataType': k, 'count': c }",
    "    for k, c in sorted(by_type.items(), key=lambda kv: kv[1], reverse=True)",
    "]",
    "samples = []",
    "for row_id, key, ts, data_type, data_size, data in rows[:sample_count]:",
    "    samples.append({",
    "        'rowId': int(row_id),",
    "        'timestampSec': float(ts),",
    "        'relSec': float(ts) - first_ts,",
    "        'topic': key,",
    "        'dataType': data_type,",
    "        'sizeBytes': int(data_size) if data_size else 0,",
    "        'rawDataBase64': base64.b64encode(data if data else b'').decode('ascii')",
    "    })",
    "summary = {",
    "    'rowCount': len(rows),",
    "    'startIso': datetime.datetime.fromtimestamp(first_ts).isoformat(),",
    "    'endIso': datetime.datetime.fromtimestamp(last_ts).isoformat(),",
    "    'durationSec': span,",
    "    'byTopic': topic_rows,",
    "    'byType': type_rows,",
    "    'samples': samples",
    "}",
    "print(json.dumps(summary))",
  ].join("\n");

  const { stdout } = await runCommand("python3", ["-c", script, dbPath, String(sampleCount)]);
  const parsed = JSON.parse(stdout) as ReplaySummary;
  return parsed;
}

export async function readReplayRow(
  dbPath: string,
  rowId?: number,
): Promise<ReplaySummarySample | null> {
  const script = [
    "import base64",
    "import json",
    "import sqlite3",
    "import sys",
    "db_path = sys.argv[1]",
    "row_id = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else 0",
    "with sqlite3.connect(db_path) as conn:",
    "    first_row = conn.execute('SELECT timestamp FROM ReplayDB ORDER BY id ASC LIMIT 1').fetchone()",
    "    if first_row is None:",
    "        print('null')",
    "        raise SystemExit(0)",
    "    first_ts = float(first_row[0])",
    "    if row_id > 0:",
    "        row = conn.execute(",
    "            'SELECT id, key, timestamp, data_type, length(data), data FROM ReplayDB WHERE id = ? LIMIT 1',",
    "            (row_id,)",
    "        ).fetchone()",
    "    else:",
    "        row = conn.execute(",
    "            'SELECT id, key, timestamp, data_type, length(data), data FROM ReplayDB ORDER BY RANDOM() LIMIT 1'",
    "        ).fetchone()",
    "if row is None:",
    "    print('null')",
    "    raise SystemExit(0)",
    "rid, key, ts, data_type, data_size, data = row",
    "result = {",
    "    'rowId': int(rid),",
    "    'timestampSec': float(ts),",
    "    'relSec': float(ts) - first_ts,",
    "    'topic': key,",
    "    'dataType': data_type,",
    "    'sizeBytes': int(data_size) if data_size else 0,",
    "    'rawDataBase64': base64.b64encode(data if data else b'').decode('ascii')",
    "}",
    "print(json.dumps(result))",
  ].join("\n");

  const args = ["-c", script, dbPath, rowId ? String(rowId) : ""];
  const { stdout } = await runCommand("python3", args);
  const raw = stdout.trim();
  if (raw === "null" || !raw) {
    return null;
  }
  return JSON.parse(raw) as ReplaySummarySample;
}
