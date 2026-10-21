import { http, HttpResponse } from "msw";
import type { AuthUser } from "@/src/contexts/auth-context";
import { PERMISSIONS } from "@/src/lib/permissions";
import { ACCESS_KEY, API, REFRESH_KEY, seedSession } from "./api";
import { server } from "./msw-server";

/* Who is looking at the page. The four identities of the test matrix (specs/_template.md, section 6):
   guest (khách), user, adminFull (admin đủ quyền) and adminLimited (admin thiếu quyền). */

export type IdentityName = "guest" | "user" | "adminFull" | "adminLimited";

const BASE: AuthUser = {
  id: "u-1",
  email: "mai@example.com",
  name: "Mai",
  image: null,
  provider: "google",
  providerId: "g-1",
  role: "user",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

/** The one permission the limited admin has; every test about "may not" asks for something else. */
export const LIMITED_PERMISSIONS = [PERMISSIONS.ORDER_ADMIN_VIEW];

export const IDENTITIES: Record<IdentityName, AuthUser | null> = {
  guest: null,
  user: BASE,
  adminFull: { ...BASE, id: "a-1", email: "admin@example.com", name: "Admin", role: "admin" },
  adminLimited: { ...BASE, id: "a-2", email: "staff@example.com", name: "Staff", role: "admin", permissions: LIMITED_PERMISSIONS },
};

/**
 * Makes the app believe `identity` is signed in: stores tokens and answers `GET /api/auth/me` with that user.
 * `guest` clears any stored session, so the app never calls the API. Pass your own `AuthUser` for a one-off case.
 */
export function signInAs(identity: IdentityName | AuthUser | null = "guest"): AuthUser | null {
  const user = typeof identity === "string" ? IDENTITIES[identity] : identity;
  if (!user) {
    /* A guest has no session, even if an earlier render in the same test signed someone in */
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    return null;
  }
  seedSession({ access: "test-access", refresh: "test-refresh" });
  /* Strict on purpose: a request that carries any other token is refused, as the real API would */
  server.use(
    http.get(`${API}/api/auth/me`, ({ request }) =>
      request.headers.get("authorization") === "Bearer test-access" ? HttpResponse.json({ user }) : HttpResponse.json({ message: "unauthorized" }, { status: 401 })
    )
  );
  return user;
}
