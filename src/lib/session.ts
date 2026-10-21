/* ═══════════════════════════════════════════════════════════
   SESSION — the one place that owns "who is signed in" on the wire

   Token storage, the 401 → refresh → retry loop, and session expiry. Every HTTP client that sends the user's
   token (`authApi`, `useApiAuth().apiFetch`, `apiFetchStandalone`) and `AuthProvider` build on it, so the rules
   below exist exactly once. Plain TypeScript (no React): callable from thunks, hooks and tests.

   Usage:
     const res = await requestWithSession((token) => fetch(url, { headers: bearer(token) }));
   ═══════════════════════════════════════════════════════════ */

import { API_URL, ApiError } from "./api";

const ACCESS_TOKEN_KEY = "clothes_shop_access_token";
const REFRESH_TOKEN_KEY = "clothes_shop_refresh_token";

/* ── Token storage ── */

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function saveTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/* ── Expiry ── */

/** Fired on `window` when a refresh failed and the tokens were dropped, so `AuthProvider`
 *  can clear its `user` and the UI falls back to the signed-out state. */
export const SESSION_EXPIRED_EVENT = "auth:session-expired";

/** Drop the stored tokens after a failed refresh and tell the auth context. */
export function expireSession(): void {
  clearTokens();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

/* ── Refresh ── */

/** The refresh in flight, shared by every client in the tab. The BE does not rotate refresh tokens, so a
 *  second concurrent refresh would not sign the user out; sharing one request just avoids N identical calls
 *  and N writes of the same token when several requests expire together. */
let refreshInFlight: Promise<string | null> | null = null;

async function requestNewAccessToken(): Promise<string | null> {
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
    saveAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

/** A new access token from the refresh token, or `null` (no refresh token, or the BE refused it). Concurrent calls share one request. */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = requestNewAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/* ── Request loop ── */

interface SessionRequestOptions {
  /** `false` for public endpoints: no token is handed to `send` and a 401 is returned as is. Default `true`. */
  authenticated?: boolean;
}

/**
 * Runs `send` with the stored access token. On a 401 it refreshes the token once and retries once; when the
 * refresh is impossible it expires the session and throws `ApiError("", 401)`. Any other response is returned
 * untouched, so each client keeps its own way of reading bodies and errors.
 */
export async function requestWithSession(
  send: (token: string | null) => Promise<Response>,
  { authenticated = true }: SessionRequestOptions = {}
): Promise<Response> {
  const res = await send(authenticated ? getAccessToken() : null);
  if (res.status !== 401 || !authenticated) return res;

  const token = await refreshAccessToken();
  if (!token) {
    expireSession();
    throw new ApiError("", 401);
  }
  return send(token);
}
