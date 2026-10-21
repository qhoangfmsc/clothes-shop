/* Decides before any browser opens whether the E2E test account's refresh token still works. Pure, no Playwright. */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

export const ENV_FILE = ".env.e2e.local";
/** Warn when the refresh token has fewer days than this left. */
export const WARN_DAYS_LEFT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface E2EUser {
  email: string;
  name: string | null;
  role: string;
}

export type SessionCheck =
  | { status: "missing" }
  | { status: "expired"; expiredAt: Date }
  | { status: "rejected"; httpStatus: number }
  | { status: "unreachable"; reason: string }
  | { status: "ok"; accessToken: string; user: E2EUser; expiresAt: Date | null; daysLeft: number | null; warn: boolean };

/** `exp` (seconds since 1970) of a JWT, or `null` when the token is not a readable JWT. No signature check. */
export function readJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/** Is the refresh token good? Expiry is read locally; otherwise the API answers (also covers a disabled account). */
export async function checkSession(options: { apiUrl: string; refreshToken: string; now?: number }): Promise<SessionCheck> {
  const { apiUrl, refreshToken, now = Date.now() } = options;
  if (!refreshToken) return { status: "missing" };

  const exp = readJwtExp(refreshToken);
  const expiresAt = exp ? new Date(exp * 1000) : null;
  if (expiresAt && expiresAt.getTime() <= now) return { status: "expired", expiredAt: expiresAt };

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (error) {
    return { status: "unreachable", reason: error instanceof Error ? error.message : String(error) };
  }
  if (!res.ok) return { status: "rejected", httpStatus: res.status };

  const data = await res.json();
  const daysLeft = expiresAt ? Math.floor((expiresAt.getTime() - now) / DAY_MS) : null;
  return {
    status: "ok",
    accessToken: data.accessToken,
    user: { email: data.user?.email ?? "", name: data.user?.name ?? null, role: data.user?.role ?? "user" },
    expiresAt,
    daysLeft,
    warn: daysLeft !== null && daysLeft < WARN_DAYS_LEFT,
  };
}

/** Hides most of an email in logs: `mai@example.com` → `m**@example.com`. */
export function maskEmail(email: string): string {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 1)}${"*".repeat(Math.max(name.length - 1, 1))}@${domain}`;
}

/** What to tell the owner, or `null` when everything is fine. Vietnamese first, as the owner reads it. */
export function explainCheck(check: SessionCheck): string | null {
  const how = `Lấy token mới: đăng nhập tài khoản test trên trình duyệt → DevTools → Application → Local Storage → copy \`clothes_shop_refresh_token\` → dán vào ${ENV_FILE} (E2E_REFRESH_TOKEN).`;
  switch (check.status) {
    case "missing":
      return `Chưa có E2E_REFRESH_TOKEN trong ${ENV_FILE}: các luồng ĐÃ đăng nhập sẽ được bỏ qua, luồng chưa đăng nhập vẫn chạy.`;
    case "expired":
      return `E2E_REFRESH_TOKEN đã HẾT HẠN lúc ${check.expiredAt.toISOString()}. ${how}`;
    case "rejected":
      return `API từ chối E2E_REFRESH_TOKEN (HTTP ${check.httpStatus}): token hết hạn, sai môi trường API, hoặc tài khoản bị khóa. ${how}`;
    case "unreachable":
      return `Không gọi được API để kiểm tra token (${check.reason}). Kiểm tra E2E_API_URL / NEXT_PUBLIC_API_URL và mạng.`;
    case "ok":
      return check.warn
        ? `E2E_REFRESH_TOKEN còn ${check.daysLeft} ngày (hết hạn ${check.expiresAt?.toISOString()}). Nên thay sớm. ${how}`
        : null;
  }
}

/** Reads `.env.e2e.local` into `process.env` (real environment variables win) and returns the API URL to use, or `null`. */
export function loadE2EEnv(root: string = process.cwd()): { apiUrl: string | null } {
  const read = (file: string) => (existsSync(join(root, file)) ? parseEnv(readFileSync(join(root, file), "utf8")) : {});
  for (const [key, value] of Object.entries(read(ENV_FILE))) if (value && !process.env[key]) process.env[key] = value;

  /* Own API URL, else the one the local site uses. A deployed site (E2E_BASE_URL) has no known API: ask. */
  const apiUrl =
    process.env.E2E_API_URL || (process.env.E2E_BASE_URL ? null : (read(".env.local").NEXT_PUBLIC_API_URL ?? "http://localhost:7001"));
  return { apiUrl: apiUrl ? apiUrl.replace(/\/$/, "") : null };
}
