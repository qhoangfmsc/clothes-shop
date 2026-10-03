import { getAccessToken } from "@/src/lib/auth-api";

export interface UploadedMedia {
  id: string;
  name: string;
  mimeType: string;
  sizeOriginal: number;
  url: string;
}

/** Uploads a file to the s3host bucket via the admin API route (which
 *  holds the Appwrite API key) and returns its public URL. Usable from
 *  the Media library page and any catalog form (products/categories/
 *  collections) that wants to upload instead of pasting a URL. */
export async function uploadMediaFile(file: File): Promise<UploadedMedia> {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/admin/media", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Upload failed");
  }

  const body = await res.json();
  return body.data as UploadedMedia;
}
