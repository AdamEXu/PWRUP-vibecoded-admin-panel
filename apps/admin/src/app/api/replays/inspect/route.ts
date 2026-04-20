// src/app/api/replays/inspect/route.ts - Purpose: inspect a local replay DB and return summary/timeline stats.
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { inspectReplayDb } from "@/lib/replays/replayManager";
import { decodeReplaySamples } from "@/lib/replays/decodeSample";
import { type ReplaySummary, type ReplayTopicSchemaMap } from "@/lib/replays/shared";

export const runtime = "nodejs";

export interface InspectReplayRequestBody {
  dbPath?: string;
  samples?: number;
  topicSchemas?: ReplayTopicSchemaMap;
  protoSchemaText?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InspectReplayRequestBody;
    const dbPath = body.dbPath?.trim();
    const samples = Number(body.samples ?? 10);
    const topicSchemas = body.topicSchemas ?? {};
    const protoSchemaText = body.protoSchemaText;

    if (!dbPath) {
      return NextResponse.json(
        { ok: false, message: "Missing dbPath in request body." },
        { status: 400 },
      );
    }

    const absolutePath = path.resolve(dbPath);
    const summary = await inspectReplayDb(
      absolutePath,
      Number.isFinite(samples) && samples > 0 ? samples : 10,
    );

    const decodedSummary: ReplaySummary = {
      ...summary,
      samples: decodeReplaySamples(summary.samples, topicSchemas, protoSchemaText),
    };
    return NextResponse.json({ ok: true, summary: decodedSummary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: (error as Error).message },
      { status: 500 },
    );
  }
}
