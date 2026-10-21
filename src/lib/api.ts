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

  if (!res.ok) throw await toApiError(res);

  return res.json();
}

export class ApiError extends Error {
  status: number;
  /** Machine-readable code the BE sends with an error (e.g. 1601 = media storage not configured). */
  errorCode?: number;
  /** `errorCode` as a string: Redux's error serializer keeps `code`, so thunk rejections still carry it. */
  code?: string;
  constructor(message: string, status: number, errorCode?: number) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
    this.code = errorCode !== undefined ? String(errorCode) : undefined;
    this.name = "ApiError";
  }
}

/** Turns a failed BE response into an `ApiError`: its `message` and `errorCode`, or `API error: <status>` when the body has none. */
export async function toApiError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => ({}));
  return new ApiError(body.message || `API error: ${res.status}`, res.status, body.errorCode);
}

export const api = {
  get: <T = unknown>(path: string) => request<T>(path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T = unknown>(path: string) => request<T>(path, { method: "DELETE" }),
};

export { API_URL };
