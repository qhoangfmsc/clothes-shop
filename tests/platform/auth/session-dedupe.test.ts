import { renderHook } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import { authApi } from "@/src/lib/auth-api";
import { API, seedSession } from "@/tests/_support/api";
import { server } from "@/tests/_support/msw-server";

/* SES-3, across clients: a refresh in flight is shared by every client and every hook instance, so the BE
   gets one refresh call, not one per request. Spec: specs/platform/auth.md. */

function expiredUntilRefreshed(path: string) {
  return http.get(`${API}${path}`, ({ request }) =>
    request.headers.get("authorization") === "Bearer new" ? HttpResponse.json({ path }) : HttpResponse.json({}, { status: 401 })
  );
}

it("authApi and two useApiAuth instances trigger a single refresh together", async () => {
  seedSession({ access: "old", refresh: "r1" });
  let refreshCalls = 0;
  server.use(
    expiredUntilRefreshed("/api/a"),
    expiredUntilRefreshed("/api/b"),
    expiredUntilRefreshed("/api/c"),
    http.post(`${API}/api/auth/refresh`, async () => {
      refreshCalls += 1;
      await delay(15);
      return HttpResponse.json({ accessToken: "new" });
    })
  );
  const first = renderHook(() => useApiAuth()).result.current.apiFetch;
  const second = renderHook(() => useApiAuth()).result.current.apiFetch;

  const results = await Promise.all([authApi.get("/api/a"), first("/api/b"), second("/api/c")]);

  expect(results).toEqual([{ path: "/api/a" }, { path: "/api/b" }, { path: "/api/c" }]);
  expect(refreshCalls).toBe(1);
});
