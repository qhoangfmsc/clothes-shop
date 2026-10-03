import { requireAdminUser } from "@/src/lib/require-admin";
import { APPWRITE_BUCKET_ID, getAppwriteStorage, isAppwriteConfigured } from "@/src/lib/appwrite-server";

export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const user = await requireAdminUser(request);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!isAppwriteConfigured()) {
    return new Response("Appwrite not configured", { status: 503 });
  }

  const { fileId } = await params;
  const { searchParams } = new URL(request.url);
  const width = Math.min(2000, Math.max(16, Number(searchParams.get("w") ?? 400) || 400));

  try {
    const storage = getAppwriteStorage();
    const meta = await storage.getFile(APPWRITE_BUCKET_ID, fileId);

    const bytes = meta.mimeType.startsWith("image/")
      ? await storage.getFilePreview(APPWRITE_BUCKET_ID, fileId, width)
      : await storage.getFileView(APPWRITE_BUCKET_ID, fileId);

    return new Response(Buffer.from(bytes as ArrayBuffer), {
      headers: {
        "Content-Type": meta.mimeType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Failed to load file", {
      status: 500,
    });
  }
}
