import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { checkSession, explainCheck, loadE2EEnv, maskEmail, readJwtExp } from "@/tests/_support/e2e-session";
import { API } from "@/tests/_support/api";
import { server } from "@/tests/_support/msw-server";

/* QG-5: the check that tells the owner when the E2E test account's token has to be replaced.
   Spec: specs/platform/dev-tooling.md. */

const NOW = Date.parse("2026-10-21T00:00:00Z");
const day = 24 * 60 * 60;

/** An unsigned JWT with the given `exp` (seconds); the check only reads the payload. */
function jwt(expSeconds?: number) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode(expSeconds === undefined ? { sub: "u1" } : { sub: "u1", exp: expSeconds })}.sig`;
}
const inDays = (n: number) => NOW / 1000 + n * day;

const USER = { email: "mai@example.com", name: "Mai", role: "user" };
const refreshOk = () => http.post(`${API}/api/auth/refresh`, () => HttpResponse.json({ accessToken: "fresh-access", user: USER }));

describe("readJwtExp", () => {
  it("reads exp from the payload", () => {
    expect(readJwtExp(jwt(123456))).toBe(123456);
  });

  it.each(["", "not-a-jwt", "a.b.c", jwt()])("returns null for %s", (token) => {
    expect(readJwtExp(token)).toBeNull();
  });
});

describe("checkSession", () => {
  it("is missing without a token and does not call the API", async () => {
    expect(await checkSession({ apiUrl: API, refreshToken: "", now: NOW })).toEqual({ status: "missing" });
  });

  it("is expired from the date alone, without calling the API", async () => {
    const check = await checkSession({ apiUrl: API, refreshToken: jwt(inDays(-1)), now: NOW });

    expect(check).toMatchObject({ status: "expired" });
    expect(explainCheck(check)).toContain("HẾT HẠN");
    expect(explainCheck(check)).toContain(".env.e2e.local");
  });

  it("is ok, with a fresh access token and the account, when the API accepts the token", async () => {
    server.use(refreshOk());

    const check = await checkSession({ apiUrl: API, refreshToken: jwt(inDays(20)), now: NOW });

    expect(check).toMatchObject({ status: "ok", accessToken: "fresh-access", user: USER, daysLeft: 20, warn: false });
    expect(explainCheck(check)).toBeNull();
  });

  it("warns when fewer than 5 days are left", async () => {
    server.use(refreshOk());

    const check = await checkSession({ apiUrl: API, refreshToken: jwt(inDays(3)), now: NOW });

    expect(check).toMatchObject({ status: "ok", daysLeft: 3, warn: true });
    expect(explainCheck(check)).toContain("còn 3 ngày");
  });

  it("trusts the API when the token has no readable date", async () => {
    server.use(refreshOk());

    expect(await checkSession({ apiUrl: API, refreshToken: "opaque-token", now: NOW })).toMatchObject({ status: "ok", daysLeft: null, warn: false });
  });

  it("is rejected when the API refuses the token (changed secret, disabled account)", async () => {
    server.use(http.post(`${API}/api/auth/refresh`, () => HttpResponse.json({}, { status: 401 })));

    const check = await checkSession({ apiUrl: API, refreshToken: jwt(inDays(20)), now: NOW });

    expect(check).toEqual({ status: "rejected", httpStatus: 401 });
    expect(explainCheck(check)).toContain("HTTP 401");
  });

  it("is unreachable on a network failure", async () => {
    server.use(http.post(`${API}/api/auth/refresh`, () => HttpResponse.error()));

    expect(await checkSession({ apiUrl: API, refreshToken: jwt(inDays(20)), now: NOW })).toMatchObject({ status: "unreachable" });
  });
});

describe("messages", () => {
  it("says the signed-in flows are skipped when there is no token", () => {
    expect(explainCheck({ status: "missing" })).toContain("bỏ qua");
  });

  it("masks emails in logs", () => {
    expect(maskEmail("mai@example.com")).toBe("m**@example.com");
    expect(maskEmail("a@x.com")).toBe("a*@x.com");
  });
});

describe("loadE2EEnv", () => {
  const touched = ["E2E_REFRESH_TOKEN", "E2E_API_URL", "E2E_BASE_URL"];
  afterEach(() => {
    for (const key of touched) delete process.env[key];
  });

  function project(files: Record<string, string>) {
    const root = mkdtempSync(join(tmpdir(), "e2e-env-"));
    for (const [name, text] of Object.entries(files)) writeFileSync(join(root, name), text);
    return root;
  }

  it("loads the token from .env.e2e.local and takes the API URL from .env.local", () => {
    const root = project({ ".env.e2e.local": "E2E_REFRESH_TOKEN=abc\nE2E_API_URL=\n", ".env.local": "NEXT_PUBLIC_API_URL=https://api.example.com/\n" });

    expect(loadE2EEnv(root)).toEqual({ apiUrl: "https://api.example.com" });
    expect(process.env.E2E_REFRESH_TOKEN).toBe("abc");
  });

  it("lets a real environment variable win over the file", () => {
    process.env.E2E_REFRESH_TOKEN = "from-env";
    loadE2EEnv(project({ ".env.e2e.local": "E2E_REFRESH_TOKEN=from-file\n" }));

    expect(process.env.E2E_REFRESH_TOKEN).toBe("from-env");
  });

  it("ignores empty values, and asks for E2E_API_URL when the site is a deployed one", () => {
    process.env.E2E_BASE_URL = "https://shop.example.com";

    expect(loadE2EEnv(project({ ".env.e2e.local": "E2E_REFRESH_TOKEN=\n", ".env.local": "NEXT_PUBLIC_API_URL=https://api.example.com\n" }))).toEqual({ apiUrl: null });
    expect(process.env.E2E_REFRESH_TOKEN).toBeUndefined();
  });

  it("prefers E2E_API_URL", () => {
    expect(loadE2EEnv(project({ ".env.e2e.local": "E2E_API_URL=https://test-api.example.com\n" }))).toEqual({ apiUrl: "https://test-api.example.com" });
  });
});
