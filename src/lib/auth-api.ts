/* JSON client for the admin API: the session token and 401 → refresh → retry. Not a hook. */

import { API_URL, toApiError } from "./api";
import { notifyAdminMutation } from "./admin-events";
import { requestWithSession } from "./session";

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  const res = await requestWithSession((token) =>
    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  );

  if (!res.ok) throw await toApiError(res);

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
