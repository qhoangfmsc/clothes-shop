import {
  APPWRITE_BUCKET_ID,
  getAppwriteStorage,
  isAppwriteConfigured,
} from "@/src/lib/appwrite-server";

/** Public, unauthenticated image endpoint — storefront visitors and
 *  catalog pages (products/categories/collections) load images through
 *  here, so the Appwrite bucket itself can stay private. */
export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  if (!isAppwriteConfigured()) {
    return new Response("Appwrite is not configured", { status: 503 });
  }

  const { fileId } = await params;
  const { searchParams } = new URL(request.url);
  const widthParam = searchParams.get("w");

  try {
    const storage = getAppwriteStorage();
    const meta = await storage.getFile(APPWRITE_BUCKET_ID, fileId);

    const bytes =
      widthParam && meta.mimeType.startsWith("image/")
        ? await storage.getFilePreview(APPWRITE_BUCKET_ID, fileId, Number(widthParam))
        : await storage.getFileView(APPWRITE_BUCKET_ID, fileId);

    return new Response(Buffer.from(bytes as ArrayBuffer), {
      headers: {
        "Content-Type": meta.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Failed to load file", {
      status: 404,
    });
  }
}
