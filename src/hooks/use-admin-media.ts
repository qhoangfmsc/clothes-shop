/* ═══════════════════════════════════════════════════════════
   ADMIN MEDIA — SWR-based listing backed by clothes-shop-api

   Hits the backend directly (/api/admin/media/*), which holds the
   Supabase service role key and the media_files metadata table.
   ═══════════════════════════════════════════════════════════ */

import useSWR from "swr";
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
    throw new MediaApiError(body.message || `Request failed: ${res.status}`, body.errorCode);
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
    const res = await fetch(`${API_URL}/api/admin/media/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new MediaApiError(body.message || "Delete failed", body.errorCode);
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
