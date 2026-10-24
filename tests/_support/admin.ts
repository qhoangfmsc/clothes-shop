import { http, HttpResponse } from "msw";
import type { PendingCounts } from "@/src/app/[locale]/_components/PendingCountsProvider";
import { API } from "./api";
import { server } from "./msw-server";

/* Helpers for tests of the admin area. */

const UNLOCK_KEY = "admin_system_unlocked_at";

/** Makes the app believe the system password was just entered (the admin gate stays open for 15 minutes). `setup.ts` clears it after each test. */
export function unlockSystem(ageMs = 0) {
  sessionStorage.setItem(UNLOCK_KEY, String(Date.now() - ageMs));
}

export type CountsAnswer = PendingCounts | { status: number } | "network";

/** The fake `GET /api/admin/pending-counts`: counts, a status to fail with, or a lost connection. Returns how many times it was asked. */
export function countsApi(answer: CountsAnswer = {}): { counts: number } {
  const calls = { counts: 0 };
  server.use(
    http.get(`${API}/api/admin/pending-counts`, () => {
      calls.counts += 1;
      if (answer === "network") return HttpResponse.error();
      if ("status" in answer && typeof answer.status === "number") return HttpResponse.json({ message: "no" }, { status: answer.status });
      return HttpResponse.json({ data: answer });
    })
  );
  return calls;
}
