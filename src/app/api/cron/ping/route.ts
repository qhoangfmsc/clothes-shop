import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";
const PING_TIMEOUT_MS = 60_000;

// Called daily by Vercel Cron (see vercel.json). Reading real rows from the API
// keeps the Supabase free project from being paused for inactivity.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const res = await fetch(`${API_URL}/api/categories?limit=1`, {
      cache: "no-store",
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });
    return NextResponse.json(
      { ok: res.ok, status: res.status, durationMs: Date.now() - startedAt },
      { status: res.ok ? 200 : 502 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Ping failed",
        durationMs: Date.now() - startedAt,
      },
      { status: 502 },
    );
  }
}
