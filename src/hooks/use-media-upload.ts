import { getAccessToken } from "@/src/lib/auth-api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";

export interface UploadedMedia {
  id: string;
  name: string;
  mimeType: string;
  sizeOriginal: number;
  url: string;
}

/** Uploads a file to the backend's media endpoint (clothes-shop-api), which
 *  holds the Supabase service role key and returns the file's public URL.
 *  Usable from the Media library page and any catalog form (products/
 *  categories/collections) that wants to upload instead of pasting a URL. */
export async function uploadMediaFile(file: File): Promise<UploadedMedia> {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/admin/media`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "");
  }

  const body = await res.json();
  return body.data as UploadedMedia;
}
