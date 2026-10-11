import type { AnalyticsCapabilities } from "@/src/types/analytics";

/* What each Vercel plan allows (see vercel.com/docs/analytics/limits-and-pricing):
     Hobby          1 month reporting window, no custom events, no UTM
     Pro            12 months, custom events, no UTM
     Pro + Plus     24 months, custom events, UTM
     Enterprise     24 months, custom events, UTM
   The API cannot tell us the plan, so it is configured with WEB_ANALYTICS_PLAN.
   Unset/unknown falls back to Hobby: the report never asks for data the plan cannot return. */
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
