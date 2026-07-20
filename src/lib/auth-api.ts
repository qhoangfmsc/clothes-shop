/* ═══════════════════════════════════════════════════════════
   AUTH API CLIENT — Authenticated fetch

   Handles token management, 401 → refresh flow.
   Used by Zustand stores / Redux-style slices.
   NOT a React hook — callable from plain functions.

   Usage:
     import { authApi } from "@/src/lib/auth-api";
     const data = await authApi.get("/api/admin/products");
     await authApi.post("/api/admin/products", { name: "..." });
   ═══════════════════════════════════════════════════════════ */

import { API_URL, ApiError } from "./api";

const TOKEN_KEY = "clothes_shop_access_token";
const REFRESH_KEY = "clothes_shop_refresh_token";

/* ── Token helpers ── */

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

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
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
      clearTokens();
      throw new ApiError("Authentication required", 401);
    }
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new ApiError(errBody.message || `API error: ${res.status}`, res.status);
  }

  return res.json();
}

export const authApi = {
  get: <T = unknown>(path: string) => request<T>(path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T = unknown>(path: string) => request<T>(path, { method: "DELETE" }),
};
