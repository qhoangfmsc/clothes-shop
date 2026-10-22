import type { AnalyticsCapabilities } from "@/src/types/analytics";

/* What each Vercel plan allows (vercel.com/docs/analytics/limits-and-pricing): Hobby 1 month, no custom events, no UTM; Pro 12 months,
   custom events; Pro + Plus and Enterprise 24 months, custom events, UTM. The API cannot tell the plan, so `WEB_ANALYTICS_PLAN` sets it;
   unset or unknown falls back to Hobby, so the report never asks for data the plan cannot return. */
const PLAN_CAPABILITIES = {
  hobby: { maxRangeDays: 30, customEvents: false, utm: false },
  pro: { maxRangeDays: 365, customEvents: true, utm: false },
  "pro-plus": { maxRangeDays: 730, customEvents: true, utm: true },
  enterprise: { maxRangeDays: 730, customEvents: true, utm: true },
} as const satisfies Record<string, AnalyticsCapabilities>;

export function getCapabilities(): AnalyticsCapabilities {
  const plan = process.env.WEB_ANALYTICS_PLAN?.trim().toLowerCase() ?? "";
  return plan in PLAN_CAPABILITIES
    ? PLAN_CAPABILITIES[plan as keyof typeof PLAN_CAPABILITIES]
    : PLAN_CAPABILITIES.hobby;
}
