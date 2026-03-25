import { NextRequest, NextResponse } from "next/server";
import { analyzeMechanismTrace } from "@/lib/analysis/analyzeMechanism";
import { getMechanismById } from "@/lib/analysis/mechanisms";
import { extractMechanismTraceById } from "@/lib/offline/replayExtraction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { dbPath?: string; mechanismId?: string };
    const dbPath = body.dbPath?.trim();
    const mechanismId = body.mechanismId?.trim();

    if (!dbPath || !mechanismId) {
      return NextResponse.json({ message: "dbPath and mechanismId are required." }, { status: 400 });
    }

    const mechanism = getMechanismById(mechanismId);
    const extraction = await extractMechanismTraceById(dbPath, mechanismId);
    const analysis = analyzeMechanismTrace(mechanism, extraction.trace);

    return NextResponse.json({
      ok: true,
      mechanism,
      analysis,
      trace: extraction.trace,
      resolvedKeys: extraction.resolvedKeys,
      ignoredCounts: extraction.ignoredCounts,
      window: extraction.window,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze replay DB.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
