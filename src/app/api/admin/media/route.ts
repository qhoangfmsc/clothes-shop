import { NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { requireAdminUser } from "@/src/lib/require-admin";
import {
  APPWRITE_BUCKET_ID,
  getAppwriteStorage,
  isAppwriteConfigured,
} from "@/src/lib/appwrite-server";
import { publicMediaUrl } from "@/src/lib/media-url";

export interface MediaFileDto {
  id: string;
  name: string;
  mimeType: string;
  sizeOriginal: number;
  createdAt: string;
  url: string;
}

const NOT_CONFIGURED_RESPONSE = {
  message:
    "Appwrite is not fully configured yet. Create a bucket and an API key in the " +
    "Appwrite console, then fill in APPWRITE_API_KEY / APPWRITE_BUCKET_ID in .env.local.",
  code: "NOT_CONFIGURED",
} as const;

const DEFAULT_LIMIT = 24;

export async function GET(request: Request) {
  const user = await requireAdminUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isAppwriteConfigured()) {
    return NextResponse.json(NOT_CONFIGURED_RESPONSE, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT)
  );

  try {
    const storage = getAppwriteStorage();
    const result = await storage.listFiles(APPWRITE_BUCKET_ID, [
      Query.limit(limit),
      Query.offset((page - 1) * limit),
      Query.orderDesc("$createdAt"),
    ]);

    const data: MediaFileDto[] = result.files.map((f) => ({
      id: f.$id,
      name: f.name,
      mimeType: f.mimeType,
      sizeOriginal: f.sizeOriginal,
      createdAt: f.$createdAt,
      url: publicMediaUrl(f.$id),
    }));

    return NextResponse.json({ data, total: result.total, page, limit });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to list files" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await requireAdminUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isAppwriteConfigured()) {
    return NextResponse.json(NOT_CONFIGURED_RESPONSE, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    const storage = getAppwriteStorage();
    const created = await storage.createFile(
      APPWRITE_BUCKET_ID,
      ID.unique(),
      InputFile.fromBuffer(file, file.name)
    );

    const data: MediaFileDto = {
      id: created.$id,
      name: created.name,
      mimeType: created.mimeType,
      sizeOriginal: created.sizeOriginal,
      createdAt: created.$createdAt,
      url: publicMediaUrl(created.$id),
    };

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
