/* Chart series colours. Validated with the dataviz palette checker on the admin's light surface:
   colour-blind separation ΔE ≥ 20, contrast ≥ 3:1 for both. Not design-system tokens on purpose —
   the brand accents (gold #c9a96e, dusty blue #8fa3b4) fail the chroma and contrast checks as chart marks. */
export const SERIES_COLORS = {
  visitors: "#B08A3E",
  pageviews: "#2D6CA2",
} as const;

/* Tabs inside each breakdown card. `key` picks both the data field and the message key. */
export const BREAKDOWN_TABS = {
  pages: ["pages", "routes"],
  sources: ["referrers", "utmSources", "utmMediums", "utmCampaigns"],
  devices: ["devices", "browsers", "systems"],
} as const;

export const UTM_TABS = ["utmSources", "utmMediums", "utmCampaigns"] as const;

export const VERCEL_TOKENS_URL = "https://vercel.com/account/tokens";
export const VERCEL_ANALYTICS_URL =
  "https://vercel.com/qhoangfs-projects/clothes-shop/analytics?environment=all";

/* Environment variables the route handler reads (see src/app/api/analytics/_lib) */
export const ENV_VARS = {
  token: "WEB_ANALYTICS_TOKEN",
  projectId: "WEB_ANALYTICS_PROJECT_ID",
  teamId: "WEB_ANALYTICS_TEAM_ID",
  plan: "WEB_ANALYTICS_PLAN",
} as const;
