// src/lib/replays/shared.ts - Purpose: shared replay constants and types for client/server usage.
export const DEFAULT_REMOTE_REPLAY_ROOT =
  "/opt/blitz/B.L.I.T.Z/replays/pose_extrapolator";
export const DEFAULT_LOCAL_DOWNLOAD_DIR = "replays/downloaded";

export interface ReplayRemoteFile {
  path: string;
  sizeBytes: number;
  modifiedIso: string;
}

export interface ReplayLocalFile {
  name: string;
  path: string;
  sizeBytes: number;
  modifiedIso: string;
}

export interface ReplayConnectionConfig {
  host: string;
  user: string;
  password?: string;
  remoteRoot: string;
}

export interface ReplaySummaryTopic {
  topic: string;
  count: number;
  hz: number;
  totalBytes: number;
}

export interface ReplaySummarySample {
  rowId: number;
  timestampSec: number;
  relSec: number;
  topic: string;
  dataType: string;
  sizeBytes: number;
  rawDataBase64?: string;
  schemaId?: string;
  decoded?: unknown;
  decodeError?: string;
}

export interface ReplaySummary {
  rowCount: number;
  startIso: string | null;
  endIso: string | null;
  durationSec: number;
  byTopic: ReplaySummaryTopic[];
  byType: Array<{ dataType: string; count: number }>;
  samples: ReplaySummarySample[];
}

export type ReplayTopicSchemaMap = Record<string, string>;
