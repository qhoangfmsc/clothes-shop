/* ═══════════════════════════════════════════════════════════
   REQUIRE ADMIN — server-only guard for Next.js route handlers

   Verifies the caller's bearer token against the backend API
   (same source of truth as AuthContext) and checks admin access.
   ═══════════════════════════════════════════════════════════ */

import { canAccessAdmin, type UserWithRole } from "./permissions";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";

export async function requireAdminUser(request: Request): Promise<UserWithRole | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: authorization },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const user = data?.user as UserWithRole | undefined;
    if (!user || !canAccessAdmin(user)) return null;

    return user;
  } catch {
    return null;
  }
}
