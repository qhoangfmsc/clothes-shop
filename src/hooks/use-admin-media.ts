/* ═══════════════════════════════════════════════════════════
   ADMIN MEDIA — SWR-based listing for the Appwrite (s3host) bucket

   Hits local Next.js API routes (/api/admin/media/*), NOT the
   backend — those routes hold the Appwrite API key server-side.
   ═══════════════════════════════════════════════════════════ */

import useSWR from "swr";
import { getAccessToken } from "@/src/lib/auth-api";

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
}

export class MediaApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function mediaFetch<T>(path: string): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new MediaApiError(body.message || `Request failed: ${res.status}`, body.code);
  }
  return res.json();
}

export interface MediaFilters {
  page?: number;
  limit?: number;
}

export function useAdminMedia(filters: MediaFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();

  const { data, error, isLoading, isValidating, mutate } = useSWR<MediaListResponse>(
    `/api/admin/media?${qs}`,
    mediaFetch,
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const deleteOne = async (id: string) => {
    const token = getAccessToken();
    const res = await fetch(`/api/admin/media/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new MediaApiError(body.message || "Delete failed", body.code);
    }
  };

  const deleteFile = async (id: string) => {
    await deleteOne(id);
    await mutate();
  };

  /** Deletes several files, then revalidates once. Returns how many
   *  succeeded/failed instead of throwing, so the caller can report
   *  a partial failure without stopping the rest. */
  const deleteFiles = async (ids: string[]): Promise<{ succeeded: number; failed: number }> => {
    const results = await Promise.allSettled(ids.map((id) => deleteOne(id)));
    await mutate();
    const failed = results.filter((r) => r.status === "rejected").length;
    return { succeeded: ids.length - failed, failed };
  };

  return {
    files: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    isValidating,
    error: error as MediaApiError | undefined,
    mutate,
    deleteFile,
    deleteFiles,
  };
}

export function mediaPreviewUrl(fileId: string, width = 400): string {
  return `/api/admin/media/${fileId}/preview?w=${width}`;
}
