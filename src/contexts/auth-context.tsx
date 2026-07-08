"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

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
      throw new Error(error.message || "Login failed");
    }

    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_KEY, data.refreshToken);
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
      {children}
    </AuthContext.Provider>
  );
}
