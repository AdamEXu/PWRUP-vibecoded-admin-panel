// src/app/api/replays/remote/route.ts - Purpose: list replay databases available on a remote Pi.
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_REMOTE_REPLAY_ROOT } from "@/lib/replays/shared";
import {
  deleteRemoteReplays,
  listRemoteReplays,
} from "@/lib/replays/replayManager";

export const runtime = "nodejs";

interface RemoteReplayRequestBody {
  host?: string;
  user?: string;
  password?: string;
  remoteRoot?: string;
  remotePaths?: string[];
  deleteAll?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RemoteReplayRequestBody;
    const host = body.host?.trim();
    const user = body.user?.trim() || "pi";
    const remoteRoot = body.remoteRoot?.trim() || DEFAULT_REMOTE_REPLAY_ROOT;

    if (!host) {
      return NextResponse.json(
        { ok: false, message: "Missing host in request body." },
        { status: 400 },
      );
    }

    const files = await listRemoteReplays({
      host,
      user,
      password: body.password ?? "",
      remoteRoot,
    });
    return NextResponse.json({ ok: true, files });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as RemoteReplayRequestBody;
    const host = body.host?.trim();
    const user = body.user?.trim() || "pi";
    const remoteRoot = body.remoteRoot?.trim() || DEFAULT_REMOTE_REPLAY_ROOT;
    const remotePaths = (body.remotePaths ?? [])
      .map((entry) => entry.trim())
      .filter(Boolean);
    const deleteAll = body.deleteAll === true;

    if (!host) {
      return NextResponse.json(
        { ok: false, message: "Missing host in request body." },
        { status: 400 },
      );
    }
    if (!deleteAll && remotePaths.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Provide remotePaths or set deleteAll=true." },
        { status: 400 },
      );
    }

    const result = await deleteRemoteReplays(
      {
        host,
        user,
        password: body.password ?? "",
        remoteRoot,
      },
      remotePaths,
      deleteAll,
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: (error as Error).message },
      { status: 500 },
    );
  }
}
