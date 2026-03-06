import { NextRequest, NextResponse } from "next/server";
import {
  readSharedSettings,
  updateSharedSettings,
} from "@pwrup/shared-core/settings-store";
import type { ConnectionSettings } from "@pwrup/shared-core/settings-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UpdateSettingsRequestBody {
  settings?: ConnectionSettings;
}

export async function GET() {
  try {
    const payload = await readSharedSettings();
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read shared settings.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateSettingsRequestBody;
    if (!body.settings || typeof body.settings !== "object") {
      return NextResponse.json({ message: "Missing settings payload." }, { status: 400 });
    }

    const payload = await updateSharedSettings(body.settings);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to persist shared settings.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
