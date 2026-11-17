import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import {
  SESSION_EXPIRED_EVENT,
  clearTokens,
  expireSession,
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  requestWithSession,
  saveAccessToken,
  saveTokens,
} from "@/src/lib/session";
import { API, ACCESS_KEY, REFRESH_KEY, seedSession } from "@/tests/_support/api";
import { server } from "@/tests/_support/msw-server";

/* SES-9 and the contract of the shared session primitives. Spec: specs/platform/auth.md. */

describe("SES-9 token storage", () => {
  it("returns null when nothing is stored", () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("saves, reads and clears under the keys the app has always used", () => {
    saveTokens("a1", "r1");
    expect(localStorage.getItem(ACCESS_KEY)).toBe("a1");
    expect(localStorage.getItem(REFRESH_KEY)).toBe("r1");
    expect(getAccessToken()).toBe("a1");
    expect(getRefreshToken()).toBe("r1");

    saveAccessToken("a2");
    expect(getAccessToken()).toBe("a2");
    expect(getRefreshToken()).toBe("r1");

    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("reads null on the server, where there is no window", () => {
    saveTokens("a1", "r1");
    vi.stubGlobal("window", undefined);
    try {
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("expireSession", () => {
  it("clears the tokens and announces it on window", () => {
    seedSession({ access: "a", refresh: "r" });
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);

    expireSession();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(SESSION_EXPIRED_EVENT).toBe("auth:session-expired");
  });
});

describe("refreshAccessToken", () => {
  it("returns the new token and stores it", async () => {
    seedSession({ access: "old", refresh: "r1" });
    server.use(http.post(`${API}/api/auth/refresh`, () => HttpResponse.json({ accessToken: "new" })));

    await expect(refreshAccessToken()).resolves.toBe("new");
    expect(getAccessToken()).toBe("new");
  });

  it("returns null without a request when there is no refresh token", async () => {
    await expect(refreshAccessToken()).resolves.toBeNull();
  });

  it("returns null and drops the tokens when the API rejects the refresh token", async () => {
    seedSession({ access: "old", refresh: "r1" });
    server.use(http.post(`${API}/api/auth/refresh`, () => HttpResponse.json({}, { status: 401 })));

    await expect(refreshAccessToken()).resolves.toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});

describe("requestWithSession", () => {
  const ok = () => new Response("{}", { status: 200 });
  const unauthorized = () => new Response("{}", { status: 401 });

  it("hands the stored token to send", async () => {
    seedSession({ access: "tok" });
    const send = vi.fn(async () => ok());

    await requestWithSession(send);
    expect(send).toHaveBeenCalledWith("tok");
  });

  it("hands send a null token and never refreshes when authenticated is false", async () => {
    seedSession({ access: "tok", refresh: "r1" });
    const send = vi.fn(async () => unauthorized());

    const res = await requestWithSession(send, { authenticated: false });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(null);
    expect(res.status).toBe(401);
  });

  it("retries once with the refreshed token", async () => {
    seedSession({ access: "old", refresh: "r1" });
    server.use(http.post(`${API}/api/auth/refresh`, () => HttpResponse.json({ accessToken: "new" })));
    const send = vi.fn(async (token: string | null) => (token === "new" ? ok() : unauthorized()));

    const res = await requestWithSession(send);
    expect(res.status).toBe(200);
    expect(send.mock.calls.map(([t]) => t)).toEqual(["old", "new"]);
  });

  it("expires the session and throws a 401 ApiError when the refresh fails", async () => {
    seedSession({ access: "old" });
    const send = vi.fn(async () => unauthorized());

    await expect(requestWithSession(send)).rejects.toMatchObject({ status: 401, message: "" });
    expect(getAccessToken()).toBeNull();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
