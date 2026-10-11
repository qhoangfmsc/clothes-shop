/* ═══════════════════════════════════════════════════════════
   ADMIN MEDIA — fetchers backed by clothes-shop-api

   Hits the backend directly (/api/admin/media/*), which holds the
   Supabase service role key and the media_files metadata table.
   ═══════════════════════════════════════════════════════════ */

import { getAccessToken } from "@/src/lib/auth-api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";

/** errorCode the backend returns when Supabase isn't configured yet. */
export const MEDIA_NOT_CONFIGURED_CODE = 1601;

export interface MediaFile {
  id: string;
  name: string;
  mimeType: string;
  sizeOriginal: number;
  createdAt: string;
  url: string;
}

export interface MediaListResponse {
  data: MediaFile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class MediaApiError extends Error {
  errorCode?: number;
  constructor(message: string, errorCode?: number) {
    super(message);
    this.errorCode = errorCode;
  }
}

async function mediaFetch<T>(path: string): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new MediaApiError(body.message ?? "", body.errorCode);
  }
  return res.json();
}

export interface MediaFilters {
  page?: number;
  limit?: number;
}

/** One page of the media library — shaped for DataTable's `fetchData`. */
export function fetchMediaList(filters: MediaFilters = {}): Promise<MediaListResponse> {
  const params = new URLSearchParams();
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  return mediaFetch<MediaListResponse>(`/api/admin/media?${params.toString()}`);
}

export async function deleteMediaFile(id: string): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/api/admin/media/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new MediaApiError(body.message ?? "", body.errorCode);
  }
}

/** Deletes several files. Returns how many succeeded/failed instead of
 *  throwing, so the caller can report a partial failure without stopping
 *  the rest. */
export async function deleteMediaFiles(
  ids: string[]
): Promise<{ succeeded: number; failed: number }> {
  const results = await Promise.allSettled(ids.map((id) => deleteMediaFile(id)));
  const failed = results.filter((r) => r.status === "rejected").length;
  return { succeeded: ids.length - failed, failed };
}
