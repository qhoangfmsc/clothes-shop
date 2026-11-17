import { delay, http, HttpResponse } from "msw";
import SiteConfigContent from "@/src/app/[locale]/(admin)/admin/site-config/SiteConfigContent";
import type { AuthUser } from "@/src/contexts/auth-context";
import type { SiteConfig, SiteConfigKeyMeta } from "@/src/types/site-config";
import type { ShippingInfo } from "@/src/types/shipping";
import { API } from "@/tests/_support/api";
import { shippingInfo } from "@/tests/_support/fixtures";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* Sample site-config rows, the fake admin site-config API (and the public shipping info the editor may read) and the render function shared by the admin site-config tests. */

const STAMP = "2026-03-05T05:00:00.000Z";

export const KEYS: SiteConfigKeyMeta[] = [
  { key: "SHOP_HERO_BANNERS", type: "BANNER" },
  { key: "NAV_MENU_BANNERS", type: "BANNER" },
  { key: "SHIPPING_CONFIG", type: "SHIPPING" },
  { key: "EXCHANGE_RATE", type: "CURRENCY" },
];

export function savedConfig(key: string, value: unknown, over: Partial<SiteConfig> = {}): SiteConfig {
  const type = KEYS.find((k) => k.key === key)?.type ?? "BANNER";
  return { id: `cfg-${key}`, key, type, value: typeof value === "string" ? value : JSON.stringify(value), createdAt: STAMP, updatedAt: STAMP, ...over };
}

type Refusal = { status: number; body: Record<string, unknown> };

export interface SiteConfigApiOptions {
  keys?: SiteConfigKeyMeta[] | number;
  items?: SiteConfig[] | number;
  deny?: 401 | 403;
  /** The public `GET /api/shipping` (what the shipping editor starts from when nothing is saved): the info, or a status to fail with */
  shipping?: ShippingInfo | number;
  refuseSave?: Refusal;
  /** Hold the answer to the config list for this long (to see the loading line) */
  listDelayMs?: number;
}

export interface SiteConfigCalls {
  keys: number;
  lists: number;
  saves: { key: string; value: string }[];
  shippingReads: number;
}

export function siteConfigApi(options: SiteConfigApiOptions = {}): SiteConfigCalls {
  const calls: SiteConfigCalls = { keys: 0, lists: 0, saves: [], shippingReads: 0 };
  server.use(
    http.get(`${API}/api/admin/site-config/keys`, () => {
      calls.keys += 1;
      if (options.deny) return HttpResponse.json({ message: "denied" }, { status: options.deny });
      if (typeof options.keys === "number") return HttpResponse.json({ message: "boom" }, { status: options.keys });
      return HttpResponse.json({ data: options.keys ?? KEYS });
    }),
    http.get(`${API}/api/admin/site-config`, async () => {
      calls.lists += 1;
      if (options.listDelayMs) await delay(options.listDelayMs);
      if (options.deny) return HttpResponse.json({ message: "denied" }, { status: options.deny });
      if (typeof options.items === "number") return HttpResponse.json({ message: "boom" }, { status: options.items });
      const data = options.items ?? [];
      return HttpResponse.json({ data, total: data.length });
    }),
    http.put(`${API}/api/admin/site-config/:key`, async ({ params, request }) => {
      const { value } = (await request.json()) as { value: string };
      calls.saves.push({ key: String(params.key), value });
      if (options.refuseSave) return HttpResponse.json(options.refuseSave.body, { status: options.refuseSave.status });
      return HttpResponse.json({ data: savedConfig(String(params.key), value) });
    }),
    http.get(`${API}/api/shipping`, () => {
      calls.shippingReads += 1;
      if (typeof options.shipping === "number") return HttpResponse.json({ message: "boom" }, { status: options.shipping });
      return HttpResponse.json({ data: options.shipping ?? shippingInfo() });
    })
  );
  return calls;
}

export interface RenderSiteConfigOptions extends SiteConfigApiOptions {
  as?: IdentityName | AuthUser;
  locale?: "vi" | "en";
}

export async function renderSiteConfig(options: RenderSiteConfigOptions = {}) {
  const { as = "adminFull", locale, ...api } = options;
  navigation.pathname = "/admin/site-config";
  navigation.searchParams = new URLSearchParams();
  const calls = siteConfigApi(api);
  const view = await renderApp(<SiteConfigContent />, { as, locale });
  return { calls, ...view };
}
