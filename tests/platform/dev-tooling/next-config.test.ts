import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

/* next.config.ts and vercel.json (specs/platform/dev-tooling.md, flow GATE-9). */

afterEach(() => vi.unstubAllEnvs());

async function loadConfig(nodeEnv: string) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", nodeEnv);
  return (await import("@/next.config")).default;
}

describe("GATE-9 next.config", () => {
  it("never caches font and media files in development, so a replaced font shows up", async () => {
    const config = await loadConfig("development");

    expect(await config.headers?.()).toEqual([{ source: "/_next/static/media/:path*", headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }] }]);
  });

  it.each(["production", "test"])("adds no headers in %s, where file names carry a content hash", async (env) => {
    const config = await loadConfig(env);

    expect(await config.headers?.()).toEqual([]);
  });

  it("lets next/image load from exactly the hosts the site uses, over https", async () => {
    const config = await loadConfig("production");

    expect(config.images?.remotePatterns).toEqual([
      { protocol: "https", hostname: "images.higgs.ai" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "d8j0ntlcm91z4.cloudfront.net" },
      { protocol: "https", hostname: "azpwtyyzbhidsunngllq.supabase.co" },
    ]);
  });

  it("is wrapped by the next-intl plugin (it adds the bundler hook) and keeps its own settings", async () => {
    const config = await loadConfig("production");

    expect(typeof (config as { webpack?: unknown }).webpack).toBe("function");
    expect(Object.keys(config).sort()).toEqual(["headers", "images", "webpack"]);
  });

  it("points the plugin at the request configuration, which exists", () => {
    const source = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

    expect(source).toContain('createNextIntlPlugin("./src/i18n/request.ts")');
    expect(existsSync(join(process.cwd(), "src/i18n/request.ts"))).toBe(true);
  });
});

describe("GATE-9 vercel.json", () => {
  const vercel = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")) as { crons: { path: string; schedule: string }[] };

  it("runs the ping once a day at midnight UTC", () => {
    expect(vercel.crons).toEqual([{ path: "/api/cron/ping", schedule: "0 0 * * *" }]);
  });

  it("points every cron at a route that exists", () => {
    for (const cron of vercel.crons) expect(existsSync(join(process.cwd(), "src/app", cron.path, "route.ts")), cron.path).toBe(true);
  });
});
