// src/app/api/replays/local/route.ts - Purpose: list locally downloaded replay database files.
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_LOCAL_DOWNLOAD_DIR } from "@/lib/replays/shared";
import {
  deleteLocalReplays,
  listLocalReplays,
} from "@/lib/replays/replayManager";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const localDir =
      request.nextUrl.searchParams.get("localDir")?.trim() ||
      DEFAULT_LOCAL_DOWNLOAD_DIR;
    const files = await listLocalReplays(localDir);
    return NextResponse.json({ ok: true, files });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: (error as Error).message },
      { status: 500 },
    );
  }
}

interface DeleteLocalReplaysRequestBody {
  localDir?: string;
  paths?: string[];
  deleteAll?: boolean;
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as DeleteLocalReplaysRequestBody;
    const localDir = body.localDir?.trim() || DEFAULT_LOCAL_DOWNLOAD_DIR;
    const paths = (body.paths ?? []).map((entry) => entry.trim()).filter(Boolean);
    const deleteAll = body.deleteAll === true;
    if (!deleteAll && paths.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Provide paths or set deleteAll=true." },
        { status: 400 },
      );
    }

    const result = await deleteLocalReplays(localDir, paths, deleteAll);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: (error as Error).message },
      { status: 500 },
    );
  }
}
