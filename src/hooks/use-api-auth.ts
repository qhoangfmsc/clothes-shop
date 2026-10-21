/* Authenticated fetch: the `useApiAuth` hook (refreshes on 401) and `apiFetchStandalone` (does not). */

import { useCallback } from "react";
import { mapMediaUrls } from "@/src/lib/media-url";
import { API_URL, toApiError } from "@/src/lib/api";
import { getAccessToken, requestWithSession } from "@/src/lib/session";

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip auth header (for public endpoints) */
  public?: boolean;
  /** Keep the BE's media URLs as they are (no `/media/...` mapping): for forms that send them back (review images) */
  raw?: boolean;
}

/** Authenticated fetch that refreshes the token once on a 401. */
export function useApiAuth() {
  /** Main fetch function */
  const apiFetch = useCallback(
    async <T = unknown>(
      path: string,
      options: ApiFetchOptions = {}
    ): Promise<T> => {
      const { method = "GET", body, headers = {}, public: isPublic, raw } = options;
      /* A FormData body is sent as is: the browser sets the multipart Content-Type (with its boundary) itself */
      const isForm = typeof FormData !== "undefined" && body instanceof FormData;
      const url = path.startsWith("http") ? path : `${API_URL}${path}`;

      const res = await requestWithSession(
        (token) =>
          fetch(url, {
            method,
            headers: {
              ...(isForm ? {} : { "Content-Type": "application/json" }),
              ...headers,
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: isForm ? (body as FormData) : body ? JSON.stringify(body) : undefined,
          }),
        { authenticated: !isPublic }
      );

      if (!res.ok) throw await toApiError(res);

      const json = await res.json();
      return raw ? json : mapMediaUrls(json);
    },
    []
  );

  return { apiFetch };
}

/**
 * Standalone (non-hook) version for use in Redux thunks.
 * Does NOT auto-refresh — simpler for background sync.
 */
export async function apiFetchStandalone<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;
  const token = getAccessToken();

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) throw await toApiError(res);

  return mapMediaUrls(await res.json());
}
