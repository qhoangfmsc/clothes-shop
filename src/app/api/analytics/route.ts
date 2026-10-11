import { NextResponse } from "next/server";
import type { AnalyticsResponse } from "@/src/types/analytics";
import { requireAdmin } from "./_lib/admin-auth";
import { buildReport, toErrorReason } from "./_lib/build-report";
import { getCapabilities } from "./_lib/plans";
import { clampRange, parseRange } from "./_lib/range";
import { readCredentials } from "./_lib/vercel-client";

export const maxDuration = 30;

/* GET /api/analytics?range=24h|7d|30d|90d&view=summary|full
   Backend-for-frontend over the Vercel Web Analytics API: keeps the Vercel token on the server,
   lets only admins in, and caches upstream answers for 5 minutes (see vercel-client.ts). */
export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const respond = (body: AnalyticsResponse) =>
    NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });

  const credentials = readCredentials();
  if (!credentials.ok) return respond({ status: "not_configured", missing: credentials.missing });

  const { searchParams } = new URL(request.url);
  const capabilities = getCapabilities();
  const range = clampRange(parseRange(searchParams.get("range")), capabilities.maxRangeDays);
  const view = searchParams.get("view") === "full" ? "full" : "summary";

  try {
    const report = await buildReport(credentials.credentials, range, view, capabilities);
    return respond({ status: "ok", report });
  } catch (error) {
    return respond({ status: "error", reason: toErrorReason(error) });
  }
}
