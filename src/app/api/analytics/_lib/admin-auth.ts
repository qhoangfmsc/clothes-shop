import { NextResponse } from "next/server";
import { ROLES } from "@/src/lib/permissions";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";
const ME_TIMEOUT_MS = 20_000;

/** Lets only a logged-in admin through. The backend owns sessions, so ask it who the bearer token
   belongs to. Returns the response to send back when the caller is not allowed, `null` when they are. */
export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: authorization },
      cache: "no-store",
      signal: AbortSignal.timeout(ME_TIMEOUT_MS),
    });
  } catch {
    return NextResponse.json({ message: "Auth service unavailable" }, { status: 502 });
  }

  /* 401 makes the client refresh its token and retry (see authApi) */
  if (res.status === 401) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!res.ok) return NextResponse.json({ message: "Auth service unavailable" }, { status: 502 });

  const body = (await res.json().catch(() => null)) as { user?: { role?: string } } | null;
  if (body?.user?.role !== ROLES.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  return null;
}
