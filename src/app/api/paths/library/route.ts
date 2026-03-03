import { NextResponse } from "next/server";
import { listPathLibraryEntries } from "@/lib/pathLibraryServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { paths, directoryLabel } = await listPathLibraryEntries();
    return NextResponse.json({
      ok: true,
      directoryLabel,
      paths,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list path library.";
    return NextResponse.json(
      {
        ok: false,
        directoryLabel: "path-library",
        paths: [],
        error: message,
      },
      { status: 500 },
    );
  }
}
