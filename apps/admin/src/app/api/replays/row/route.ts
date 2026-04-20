// src/app/api/replays/row/route.ts - Purpose: fetch and decode a specific or random replay row.
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { decodeReplaySample } from "@/lib/replays/decodeSample";
import { readReplayRow } from "@/lib/replays/replayManager";
import { createDynamicProtoDecoder } from "@/lib/replays/dynamicProtoDecoder";
import { type ReplayTopicSchemaMap } from "@/lib/replays/shared";

export const runtime = "nodejs";

interface ReplayRowRequestBody {
  dbPath?: string;
  rowId?: number;
  topicSchemas?: ReplayTopicSchemaMap;
  protoSchemaText?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReplayRowRequestBody;
    const dbPath = body.dbPath?.trim();
    const topicSchemas = body.topicSchemas ?? {};
    const rowId = Number(body.rowId);
    const requestedRowId = Number.isFinite(rowId) && rowId > 0 ? rowId : undefined;
    const protoSchemaText = body.protoSchemaText?.trim();

    if (!dbPath) {
      return NextResponse.json(
        { ok: false, message: "Missing dbPath in request body." },
        { status: 400 },
      );
    }

    const absolutePath = path.resolve(dbPath);
    const row = await readReplayRow(absolutePath, requestedRowId);
    if (!row) {
      return NextResponse.json(
        { ok: false, message: "No replay rows found in this DB." },
        { status: 404 },
      );
    }

    const decoder =
      protoSchemaText && protoSchemaText.length > 0
        ? createDynamicProtoDecoder(protoSchemaText)
        : null;
    const decodedRow = decodeReplaySample(row, topicSchemas, decoder);
    const hasDecodeError = Boolean(decodedRow.decodeError);
    const hasDecodedPayload = decodedRow.decoded !== undefined;

    return NextResponse.json({
      ok: true,
      row: decodedRow,
      validation: {
        isMappedTopic: Boolean(topicSchemas[decodedRow.topic]),
        isProtobufRow: decodedRow.dataType === "protobuf",
        decodeSucceeded: hasDecodedPayload && !hasDecodeError,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: (error as Error).message },
      { status: 500 },
    );
  }
}
