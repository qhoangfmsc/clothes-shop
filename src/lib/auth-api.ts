/* ═══════════════════════════════════════════════════════════
   AUTH API CLIENT — Authenticated fetch

   Handles token management, 401 → refresh flow.
   Used by Redux Toolkit slices.
   NOT a React hook — callable from plain functions.

   Usage:
     import { authApi } from "@/src/lib/auth-api";
     const data = await authApi.get("/api/admin/products");
     await authApi.post("/api/admin/products", { name: "..." });
   ═══════════════════════════════════════════════════════════ */

import { API_URL, ApiError } from "./api";
import { notifyAdminMutation } from "./admin-events";

const TOKEN_KEY = "clothes_shop_access_token";
const REFRESH_KEY = "clothes_shop_refresh_token";

/* ── Token helpers ── */

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Exposed for callers that need to build their own authenticated requests
 *  (e.g. hitting a local Next.js API route instead of the backend). */
export const getAccessToken = getToken;

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/** Fired on `window` when a refresh failed and the tokens were dropped, so `AuthProvider`
 *  can clear its `user` and the UI falls back to the signed-out state. */
export const SESSION_EXPIRED_EVENT = "auth:session-expired";

/** Drop the stored tokens after a failed refresh and tell the auth context. */
export function expireSession() {
  clearTokens();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

/* ── Deduped refresh ── */

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
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
}

async function refreshOnce(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/* ── Request ── */

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  const buildHeaders = (token?: string | null): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json", ...headers };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  const doFetch = (token?: string | null): Promise<Response> =>
    fetch(url, {
      method,
      headers: buildHeaders(token),
      body: body ? JSON.stringify(body) : undefined,
    });

  /* First attempt */
  let token = getToken();
  let res = await doFetch(token);

  /* 401 → refresh → retry once */
  if (res.status === 401) {
    const newToken = await refreshOnce();
    if (newToken) {
      res = await doFetch(newToken);
    } else {
      expireSession();
      throw new ApiError("", 401);
    }
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new ApiError(errBody.message || `API error: ${res.status}`, res.status, errBody.errorCode);
  }

  /* A write to the admin API may change what the menu badges count: let them refresh */
  if (method !== "GET" && path.startsWith("/api/admin/")) notifyAdminMutation();

  return res.json();
}

export const authApi = {
  get: <T = unknown>(path: string) => request<T>(path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T = unknown>(path: string) => request<T>(path, { method: "DELETE" }),
};
