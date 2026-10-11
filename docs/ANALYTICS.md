# Analytics (Vercel Web Analytics)

**Collecting** — `src/app/[locale]/_components/VercelTelemetry.tsx` mounts `<Analytics />` and `<SpeedInsights />` in the root layout.
`/admin/**` is filtered out in `beforeSend`, so only storefront traffic is counted.
Funnel events (`view_product`, `add_to_cart`, `begin_checkout`, `purchase`) go through `trackEvent()` in `src/lib/analytics.ts`
(max 2 properties per event, no personal data).

**Reading** — `GET /api/analytics?range=24h|7d|30d|90d&view=summary|full` (`src/app/api/analytics`) is a server-side proxy over the
[Vercel Web Analytics API](https://vercel.com/docs/analytics/web-analytics-api). It only answers admins (the bearer token is checked
against the backend `/api/auth/me`), keeps the Vercel token on the server and caches upstream answers for 5 minutes.
Shown in `/admin/analytics` and as a summary section on `/admin`.

## Environment variables (Vercel project settings, and `.env.local` for local dev)

| Variable | Required | Value |
|---|---|---|
| `WEB_ANALYTICS_TOKEN` | yes | Vercel access token (https://vercel.com/account/tokens) |
| `WEB_ANALYTICS_PROJECT_ID` | yes | Project ID (Project → Settings → General) |
| `WEB_ANALYTICS_TEAM_ID` | team projects | Team ID (omit for a personal account) |
| `WEB_ANALYTICS_PLAN` | no | `hobby` (default), `pro`, `pro-plus`, `enterprise` — limits the report to what the plan includes |

Also enable **Web Analytics** (and Speed Insights) for the project in the Vercel dashboard.

## What each plan shows

| | Hobby | Pro | Pro + Web Analytics Plus / Enterprise |
|---|---|---|---|
| Ranges | 24h, 7d, 30d | + 90d | + 90d |
| Funnel (custom events) | hidden | yes | yes |
| UTM tabs | hidden | hidden | yes |

## Notes

- Vercel rejects day/hour queries wider than 62 days, so the 90-day trend is fetched in two chunks.
- Buckets are UTC days/hours, like the Vercel dashboard.
- Speed Insights data is only visible in the Vercel dashboard (no read API).
