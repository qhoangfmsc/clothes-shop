import { NextResponse } from "next/server";
import { requireAdminUser } from "@/src/lib/require-admin";
import {
  APPWRITE_BUCKET_ID,
  getAppwriteStorage,
  isAppwriteConfigured,
} from "@/src/lib/appwrite-server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const user = await requireAdminUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { message: "Appwrite is not configured yet.", code: "NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const { fileId } = await params;

  try {
    const storage = getAppwriteStorage();
    await storage.deleteFile(APPWRITE_BUCKET_ID, fileId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to delete file" },
      { status: 500 }
    );
  }
}
