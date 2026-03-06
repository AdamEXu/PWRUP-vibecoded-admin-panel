// src/app/api/replays/download/route.ts - Purpose: download selected replay files from a remote Pi into a local folder.
import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_LOCAL_DOWNLOAD_DIR,
  DEFAULT_REMOTE_REPLAY_ROOT,
} from "@/lib/replays/shared";
import {
  downloadRemoteReplays,
} from "@/lib/replays/replayManager";

export const runtime = "nodejs";

interface DownloadReplayRequestBody {
  host?: string;
  user?: string;
  password?: string;
  remoteRoot?: string;
  localDir?: string;
  remotePaths?: string[];
  useSafeSnapshot?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DownloadReplayRequestBody;
    const host = body.host?.trim();
    const user = body.user?.trim() || "pi";
    const remoteRoot = body.remoteRoot?.trim() || DEFAULT_REMOTE_REPLAY_ROOT;
    const localDir = body.localDir?.trim() || DEFAULT_LOCAL_DOWNLOAD_DIR;
    const remotePaths = (body.remotePaths ?? []).map((p) => p.trim()).filter(Boolean);
    const useSafeSnapshot = body.useSafeSnapshot !== false;

    if (!host) {
      return NextResponse.json(
        { ok: false, message: "Missing host in request body." },
        { status: 400 },
      );
    }
    if (remotePaths.length === 0) {
      return NextResponse.json(
        { ok: false, message: "remotePaths must include at least one replay path." },
        { status: 400 },
      );
    }

    const downloaded = await downloadRemoteReplays(
      {
        host,
        user,
        password: body.password ?? "",
        remoteRoot,
      },
      remotePaths,
      localDir,
      useSafeSnapshot,
    );

    return NextResponse.json({ ok: true, downloaded });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: (error as Error).message },
      { status: 500 },
    );
  }
}
