import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const CAD_DIR = path.join(process.cwd(), "cad-assets");

const MIME_TYPES: Record<string, string> = {
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".bin": "application/octet-stream",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  // Prevent path traversal
  const safe = path.basename(filename);
  const filePath = path.join(CAD_DIR, safe);

  if (!filePath.startsWith(CAD_DIR)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(safe).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

  const stream = fs.createReadStream(filePath);
  const readable = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) =>
        controller.enqueue(
          chunk instanceof Buffer ? chunk : Buffer.from(chunk),
        ),
      );
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
