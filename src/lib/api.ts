/* ═══════════════════════════════════════════════════════════
   API CLIENT — Public (no auth)

   Simple fetch wrapper for public endpoints.
   Callable from any component, page, or store without auth concerns.

   Usage:
     import { api } from "@/src/lib/api";
     const data = await api.get("/api/products");
     await api.post("/api/contact", { name, email });
   ═══════════════════════════════════════════════════════════ */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new ApiError(errBody.message || `API error: ${res.status}`, res.status);
  }

  return res.json();
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export const api = {
  get: <T = unknown>(path: string) => request<T>(path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T = unknown>(path: string) => request<T>(path, { method: "DELETE" }),
};

export { API_URL };
