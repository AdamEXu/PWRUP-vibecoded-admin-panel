import { readSharedSettings } from "@pwrup/shared-core/settings-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET() {
  const encoder = new TextEncoder();

  let cancelled = false;
  let keepAlive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let lastVersion = -1;

      const push = async () => {
        while (!cancelled) {
          try {
            const payload = await readSharedSettings();
            if (payload.version !== lastVersion) {
              lastVersion = payload.version;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            }
          } catch {
            // Ignore transient read errors; keep the stream alive.
          }

          await sleep(750);
        }
      };

      void push();

      keepAlive = setInterval(() => {
        if (!cancelled) {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        }
      }, 15000);
    },
    cancel() {
      cancelled = true;
      if (keepAlive) {
        clearInterval(keepAlive);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
