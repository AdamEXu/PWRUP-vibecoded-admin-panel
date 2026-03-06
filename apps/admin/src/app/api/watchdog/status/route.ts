// src/app/api/watchdog/status/route.ts - Purpose: proxy watchdog status requests to avoid CORS
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const baseUrl = searchParams.get("baseUrl");

  if (!baseUrl) {
    return NextResponse.json(
      { status: "error", message: "Missing baseUrl parameter" },
      { status: 400 }
    );
  }

  try {
    const url = `${baseUrl}/get/system/status`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        message: `Failed to fetch from ${baseUrl}: ${(e as Error).message}`,
      },
      { status: 500 }
    );
  }
}

