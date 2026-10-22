import { getAccessToken } from "@/src/lib/session";
import { ApiError } from "@/src/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";

export interface UploadedMedia {
  id: string;
  name: string;
  mimeType: string;
  sizeOriginal: number;
  url: string;
}

/** Uploads a file to the BE media endpoint, which holds the Supabase service role key and returns the public URL.
 *  Shared by the Media library and any catalog form that uploads instead of pasting a URL. */
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
    throw new ApiError(body.message ?? "", res.status, body.errorCode);
  }

  const body = await res.json();
  return body.data as UploadedMedia;
}
