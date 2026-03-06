// src/app/api/watchdog/stop/route.ts - Purpose: proxy watchdog stop process requests
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const baseUrl = searchParams.get("baseUrl");

  if (!baseUrl) {
    return NextResponse.json(
      { status: "error", message: "Missing baseUrl parameter" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const url = `${baseUrl}/stop/process`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        message: `Failed to stop process: ${(e as Error).message}`,
      },
      { status: 500 }
    );
  }
}

