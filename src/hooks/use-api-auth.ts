/* ═══════════════════════════════════════════════════════════
   AUTHENTICATED API FETCHER
   
   Provides `apiFetch` — a fetch wrapper that auto-attaches
   Authorization header and handles 401 → refresh flow.
   
   Usage:
     const { apiFetch } = useApiAuth();
     const data = await apiFetch('/api/cart');
     await apiFetch('/api/cart/items', { method: 'POST', body: {...} });
   ═══════════════════════════════════════════════════════════ */

import { useCallback, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";
const TOKEN_KEY = "clothes_shop_access_token";
const REFRESH_KEY = "clothes_shop_refresh_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip auth header (for public endpoints) */
  public?: boolean;
}

interface ApiError extends Error {
  status: number;
}

function createApiError(message: string, status: number): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  return err;
}

/**
 * Hook providing authenticated fetch.
 * Handles token refresh on 401 automatically (one retry).
 */
export function useApiAuth() {
  const refreshingRef = useRef<Promise<string | null> | null>(null);

  /** Try refresh token → new access token */
  const doRefresh = useCallback(async (): Promise<string | null> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearTokens();
        return null;
      }
      const data = await res.json();
      setToken(data.accessToken);
      return data.accessToken;
    } catch {
      clearTokens();
      return null;
    }
  }, []);

  /** Deduplicated refresh — prevents concurrent refresh calls */
  const refreshOnce = useCallback(async (): Promise<string | null> => {
    if (!refreshingRef.current) {
      refreshingRef.current = doRefresh().finally(() => {
        refreshingRef.current = null;
      });
    }
    return refreshingRef.current;
  }, [doRefresh]);

  /** Main fetch function */
  const apiFetch = useCallback(
    async <T = unknown>(
      path: string,
      options: ApiFetchOptions = {}
    ): Promise<T> => {
      const { method = "GET", body, headers = {}, public: isPublic } = options;

      const buildHeaders = (token?: string | null): Record<string, string> => {
        const h: Record<string, string> = {
          "Content-Type": "application/json",
          ...headers,
        };
        if (!isPublic && token) {
          h.Authorization = `Bearer ${token}`;
        }
        return h;
      };

      const doFetch = async (token?: string | null): Promise<Response> => {
        const url = path.startsWith("http") ? path : `${API_URL}${path}`;
        return fetch(url, {
          method,
          headers: buildHeaders(token),
          body: body ? JSON.stringify(body) : undefined,
        });
      };

      /* First attempt */
      let token = getToken();
      let res = await doFetch(token);

      /* 401 → try refresh → retry once */
      if (res.status === 401 && !isPublic) {
        const newToken = await refreshOnce();
        if (newToken) {
          res = await doFetch(newToken);
        } else {
          throw createApiError("Authentication required", 401);
        }
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw createApiError(
          errBody.message || `API error: ${res.status}`,
          res.status
        );
      }

      return res.json();
    },
    [refreshOnce]
  );

  return { apiFetch };
}

/**
 * Standalone (non-hook) version for use in Zustand stores.
 * Does NOT auto-refresh — simpler for background sync.
 */
export async function apiFetchStandalone<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;
  const token = getToken();

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

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw createApiError(
      errBody.message || `API error: ${res.status}`,
      res.status
    );
  }

  return res.json();
}
