import { http, HttpResponse } from "msw";
import { vi } from "vitest";
import type { Category } from "@/src/types/category";
import type { BannerItem } from "@/src/types/site-config";
import { API } from "@/tests/_support/api";
import { categoryOf, subcategoryOf } from "@/tests/_support/fixtures";
import { server } from "@/tests/_support/msw-server";

/* Fake public API behind the header (categories for the mega menu and the drawer, banners for the drawer's featured panel). */

export interface ChromeApiOptions {
  /** `GET /api/categories`: the list, or a status to fail with */
  categories?: Category[] | number;
  /** `GET /api/site-config?key=…`: the banners, a status to fail with, or nothing configured */
  banners?: BannerItem[] | number | null;
}

export interface ChromeCalls {
  categories: number;
  banners: string[];
}

export function chromeApi(options: ChromeApiOptions = {}): ChromeCalls {
  const calls: ChromeCalls = { categories: 0, banners: [] };
  server.use(
    http.get(`${API}/api/categories`, () => {
      calls.categories += 1;
      if (typeof options.categories === "number") return HttpResponse.json({}, { status: options.categories });
      const list = options.categories ?? [];
      return HttpResponse.json({ data: list, total: list.length });
    }),
    http.get(`${API}/api/site-config`, ({ request }) => {
      calls.banners.push(new URL(request.url).searchParams.get("key") ?? "");
      if (typeof options.banners === "number") return HttpResponse.json({}, { status: options.banners });
      if (!options.banners) return HttpResponse.json({ data: null });
      return HttpResponse.json({ data: { key: "x", type: "BANNER", value: JSON.stringify(options.banners) } });
    })
  );
  return calls;
}

/** `n` categories named Category 1…n, each with two sub-categories */
export function categories(n: number): Category[] {
  return Array.from({ length: n }, (_, i) =>
    categoryOf({
      id: `c${i + 1}`,
      slug: `cat-${i + 1}`,
      title: `Category ${i + 1}`,
      priority: i + 1,
      subcategories: [subcategoryOf({ id: `s${i + 1}a`, slug: `sub-${i + 1}a`, label: `Sub ${i + 1}A` }), subcategoryOf({ id: `s${i + 1}b`, slug: `sub-${i + 1}b`, label: `Sub ${i + 1}B` })],
    })
  );
}

export const banner = (n: number, over: Partial<BannerItem> = {}): BannerItem => ({ image: `/banner-${n}.jpg`, title: `Banner ${n}`, subtitle: `Subtitle ${n}`, ctaLabel: `Go ${n}`, ctaHref: `/shop/cat-${n}`, ...over });

/** Watches the listeners a target gets: `leftOn(type)` says how many handlers of that type were added and never taken away */
export function watchListeners(target: EventTarget) {
  const add = vi.spyOn(target, "addEventListener");
  const remove = vi.spyOn(target, "removeEventListener");
  const handlers = (spy: typeof add, type: string) => spy.mock.calls.filter(([name]) => name === type).map(([, handler]) => handler);
  return {
    leftOn: (type: string) => handlers(add, type).filter((handler) => !handlers(remove, type).includes(handler)).length,
  };
}
