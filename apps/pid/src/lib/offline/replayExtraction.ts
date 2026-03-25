import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import { getMechanismById } from "@/lib/analysis/mechanisms";
import type { MechanismDefinition, NormalizedTrace, SignalName } from "@/lib/analysis/types";

export interface ReplayFileInfo {
  name: string;
  path: string;
  sizeBytes: number;
  modifiedIso: string;
}

interface RawReplaySeriesResponse {
  startTimeSec: number | null;
  endTimeSec: number | null;
  series: Partial<Record<SignalName, Array<{ timeSec: number; value: number }>>>;
  resolvedKeys: Partial<Record<SignalName, string>>;
  ignoredCounts: Partial<Record<SignalName, number>>;
}

function runPython(script: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", ["-c", script, ...args], {
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
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || stdout || `python3 exited with code ${code}`));
      }
    });
  });
}

export async function listReplayFiles(directory: string): Promise<ReplayFileInfo[]> {
  const targetDir = path.resolve(directory);
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".db"))
      .map(async (entry) => {
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

  return files.sort((a, b) => b.modifiedIso.localeCompare(a.modifiedIso));
}

function emptyTrace(): NormalizedTrace {
  return {
    setpoint: [],
    measurement: [],
    effort: [],
    feedforward: [],
    current: [],
    velocity: [],
  };
}

export async function extractMechanismTraceFromReplayDb(
  dbPath: string,
  mechanism: MechanismDefinition,
): Promise<{
  trace: NormalizedTrace;
  resolvedKeys: Partial<Record<SignalName, string>>;
  ignoredCounts: Partial<Record<SignalName, number>>;
  window: { startTimeSec: number | null; endTimeSec: number | null };
}> {
  const topicRequest: Partial<Record<SignalName, string[]>> = {};
  for (const [signal, config] of Object.entries(mechanism.signals) as Array<
    [SignalName, MechanismDefinition["signals"][SignalName]]
  >) {
    if (config) {
      topicRequest[signal] = config.candidateKeys;
    }
  }

  const script = `
import json
import sqlite3
import sys

db_path = sys.argv[1]
request = json.loads(sys.argv[2])
requested_keys = {signal: keys for signal, keys in request.items() if keys}
flat_keys = []
for keys in requested_keys.values():
    flat_keys.extend(keys)

def decode_value(data_type, blob):
    if data_type == "float":
        return float.fromhex(blob.decode("utf-8"))
    if data_type == "int":
        return int.from_bytes(blob, byteorder="little", signed=True)
    if data_type == "str":
        try:
            return float(blob.decode("utf-8"))
        except Exception:
            return None
    return None

result = {
    "startTimeSec": None,
    "endTimeSec": None,
    "series": {signal: [] for signal in requested_keys.keys()},
    "resolvedKeys": {},
    "ignoredCounts": {signal: 0 for signal in requested_keys.keys()},
}

if not flat_keys:
    print(json.dumps(result))
    raise SystemExit(0)

with sqlite3.connect(db_path) as conn:
    placeholders = ",".join("?" for _ in flat_keys)
    rows = conn.execute(
        f"SELECT key, timestamp, data_type, data FROM ReplayDB WHERE key IN ({placeholders}) ORDER BY timestamp ASC",
        flat_keys,
    ).fetchall()

for key, timestamp, data_type, data in rows:
    target_signal = None
    for signal, keys in requested_keys.items():
        if key in keys:
            target_signal = signal
            if signal not in result["resolvedKeys"]:
                result["resolvedKeys"][signal] = key
            break

    if target_signal is None:
        continue

    value = decode_value(data_type, data)
    if value is None:
        result["ignoredCounts"][target_signal] = result["ignoredCounts"].get(target_signal, 0) + 1
        continue

    if result["startTimeSec"] is None:
        result["startTimeSec"] = float(timestamp)
    result["endTimeSec"] = float(timestamp)
    rel = 0.0 if result["startTimeSec"] is None else float(timestamp) - float(result["startTimeSec"])
    result["series"][target_signal].append({"timeSec": rel, "value": float(value)})

print(json.dumps(result))
`;

  const stdout = await runPython(script, [path.resolve(dbPath), JSON.stringify(topicRequest)]);
  const parsed = JSON.parse(stdout) as RawReplaySeriesResponse;
  const trace = emptyTrace();

  for (const signal of Object.keys(parsed.series) as SignalName[]) {
    trace[signal] = parsed.series[signal] ?? [];
  }

  return {
    trace,
    resolvedKeys: parsed.resolvedKeys,
    ignoredCounts: parsed.ignoredCounts,
    window: {
      startTimeSec: parsed.startTimeSec,
      endTimeSec: parsed.endTimeSec,
    },
  };
}

export async function extractMechanismTraceById(dbPath: string, mechanismId: string) {
  const mechanism = getMechanismById(mechanismId);
  return extractMechanismTraceFromReplayDb(dbPath, mechanism);
}
