import { NextRequest, NextResponse } from "next/server";
import {
  readSharedSettings,
  updateSharedSettings,
} from "@pwrup/shared-core/settings-store";
import type {
  ConnectionSettings,
  HudVisibilitySettings,
  MapSettings,
} from "@pwrup/shared-core/settings-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UpdateSettingsRequestBody {
  settings?: ConnectionSettings;
  hudVisibility?: HudVisibilitySettings;
  mapSettings?: MapSettings;
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
    const hasSettings = !!body.settings && typeof body.settings === "object";
    const hasHudVisibility = !!body.hudVisibility && typeof body.hudVisibility === "object";
    const hasMapSettings = !!body.mapSettings && typeof body.mapSettings === "object";

    if (!hasSettings && !hasHudVisibility && !hasMapSettings) {
      return NextResponse.json({ message: "Missing settings payload." }, { status: 400 });
    }

    const payload = await updateSharedSettings({
      settings: hasSettings ? body.settings : undefined,
      hudVisibility: hasHudVisibility ? body.hudVisibility : undefined,
      mapSettings: hasMapSettings ? body.mapSettings : undefined,
    });
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to persist shared settings.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
