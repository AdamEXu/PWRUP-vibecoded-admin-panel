import { readPathLibraryImage } from "@/lib/pathLibraryServer";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ fileName: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { fileName } = await context.params;
  const image = await readPathLibraryImage(fileName);
  if (!image) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(image.content, {
    status: 200,
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=60",
    },
  });
}
