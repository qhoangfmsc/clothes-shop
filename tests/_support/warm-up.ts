import type { FullConfig } from "@playwright/test";

export const WARM_UP_PATHS = ["/vi", "/en", "/vi/shop", "/vi/login", "/vi/cart", "/vi/orders", "/vi/wishlist", "/vi/account"];

/* A cold `next dev` that compiles several pages at once reads a half-written JSON file and answers 500, so open them one by one first. */
export async function warmUp(baseURL: string, get: typeof fetch = fetch) {
  for (const path of WARM_UP_PATHS) {
    try {
      await get(new URL(path, baseURL));
    } catch {
      // an unreachable server is reported by the tests themselves
    }
  }
}

export default async function globalSetup(config: FullConfig) {
  await warmUp(config.projects[0]?.use.baseURL ?? "http://localhost:3000");
}
