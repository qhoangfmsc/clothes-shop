"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { routing } from "@/src/i18n/routing";

/* Admin pages are not shop traffic: counting them would inflate visitors and
   top pages with the team's own work. */
const ADMIN_PATH = new RegExp(`^/(${routing.locales.join("|")})/admin(/|$)`);

const isAdminUrl = (url: string) => {
  try {
    return ADMIN_PATH.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

/* beforeSend is a function, so it can only be passed from a client component */
const skipAdmin = <T extends { url: string }>(event: T): T | null =>
  isAdminUrl(event.url) ? null : event;

export default function VercelTelemetry() {
  return (
    <>
      <Analytics beforeSend={(event: BeforeSendEvent) => skipAdmin(event)} />
      <SpeedInsights beforeSend={(event) => skipAdmin(event)} />
    </>
  );
}
