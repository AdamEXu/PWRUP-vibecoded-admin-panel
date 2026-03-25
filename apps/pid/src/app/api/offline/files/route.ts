import { NextRequest, NextResponse } from "next/server";
import { listReplayFiles } from "@/lib/offline/replayExtraction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { directory?: string };
    const directory = body.directory?.trim();

    if (!directory) {
      return NextResponse.json({ message: "Missing replay directory." }, { status: 400 });
    }

    const files = await listReplayFiles(directory);
    return NextResponse.json({ ok: true, files });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list replay files.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
