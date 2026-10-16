"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { ApiError } from "@/src/lib/api";
import { SESSION_EXPIRED_EVENT } from "@/src/lib/auth-api";
import { usePathname } from "@/src/i18n/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string | null;
  providerId: string | null;
  role: string;
  status: string;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (idToken: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const TOKEN_KEY = "clothes_shop_access_token";
const REFRESH_KEY = "clothes_shop_refresh_token";
/** Email of the last Google account that signed in. Survives logout on purpose: it is only a hint for the next Google popup. */
const LAST_GOOGLE_EMAIL_KEY = "clothes_shop_last_google_email";

/** Last page the user was on (path + query, no locale prefix). Kept across logout / session expiry so signing in again returns there. */
const LAST_PAGE_KEY = "clothes_shop_last_page";
/** Pages that are never a return target (they would bounce straight back to sign-in). */
const NO_RETURN_PATHS = ["/login", "/unauthorized"];

function isReturnPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  const base = path.split(/[?#]/)[0];
  return !NO_RETURN_PATHS.some((p) => base === p || base.startsWith(`${p}/`));
}

/** Where to send the user after signing in on `/login`: the last page they used, or `undefined`. */
export function readLastPage(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const path = localStorage.getItem(LAST_PAGE_KEY);
    return path && isReturnPath(path) ? path : undefined;
  } catch {
    return undefined;
  }
}

/** Renders nothing; records the current page on every navigation. Its own re-render never touches `useAuth()` consumers. */
function LastPageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const path = `${pathname}${window.location.search}`;
    if (!isReturnPath(path)) return;
    try {
      localStorage.setItem(LAST_PAGE_KEY, path);
    } catch {
      /* storage blocked — sign-in falls back to the home page */
    }
  }, [pathname]);
  return null;
}

/** The last Google account used on this device, or `undefined` (server, no history, storage blocked). */
export function readLastGoogleEmail(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return localStorage.getItem(LAST_GOOGLE_EMAIL_KEY) || undefined;
  } catch {
    return undefined;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Fetch /auth/me with stored token */
  const fetchMe = useCallback(async (accessToken: string): Promise<AuthUser | null> => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user ?? null;
    } catch {
      return null;
    }
  }, []);

  /** Try refresh token to get new access token */
  const tryRefresh = useCallback(async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      setUser(data.user);
      return data.accessToken;
    } catch {
      return null;
    }
  }, []);

  /** Google login — send idToken to BE */
  const login = useCallback(async (idToken: string) => {
    const res = await fetch(`${API_URL}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new ApiError(error.message ?? "", res.status, error.errorCode);
    }

    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_KEY, data.refreshToken);
    try {
      if (data.user?.email) localStorage.setItem(LAST_GOOGLE_EMAIL_KEY, data.user.email);
    } catch {
      /* storage blocked — next sign-in just shows the account chooser */
    }
    setUser(data.user);
  }, []);

  /** Logout — clear tokens and user */
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setUser(null);
  }, []);

  /** Manual refresh */
  const refresh = useCallback(async () => {
    const newToken = await tryRefresh();
    if (!newToken) {
      logout();
    }
  }, [tryRefresh, logout]);

  /** A refresh failed elsewhere (authApi / useApiAuth) and dropped the tokens — sign out here too */
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  /** On mount: check existing session */
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        const me = await fetchMe(token);
        if (me) {
          setUser(me);
        } else {
          // Token expired — try refresh
          const newToken = await tryRefresh();
          if (!newToken) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_KEY);
          }
        }
      }
      setIsLoading(false);
    };
    init();
  }, [fetchMe, tryRefresh]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refresh,
      }}
    >
      <LastPageTracker />
      {children}
    </AuthContext.Provider>
  );
}
