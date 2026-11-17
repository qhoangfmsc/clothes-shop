import { describe, expect, it } from "vitest";
import { clearError, fetchSiteConfigKeys, fetchSiteConfigList, upsertSiteConfig } from "@/src/app/[locale]/(admin)/admin/site-config/_common/moduleSlice";
import { CONFIG_TYPE_ORDER, CONFIG_TYPE_VIEWS } from "@/src/app/[locale]/(admin)/admin/site-config/_types/registry";
import { makeStore } from "@/src/store";
import { KEYS, savedConfig, siteConfigApi } from "./site-config-kit";

/* The site-config store and the registry of editors (specs/admin/site-config.md, flow ASC-9). */

const state = (store: ReturnType<typeof makeStore>) => store.getState().siteConfig;

describe("ASC-9 the site-config store", () => {
  it("keeps the known keys", async () => {
    siteConfigApi();
    const store = makeStore();

    await store.dispatch(fetchSiteConfigKeys());

    expect(state(store).keys).toEqual(KEYS);
  });

  it("keeps what is saved, is loading while it waits, and remembers the error when the BE refuses", async () => {
    siteConfigApi({ items: [savedConfig("SHOP_HERO_BANNERS", [])] });
    const store = makeStore();

    const pending = store.dispatch(fetchSiteConfigList());
    expect(state(store).isListLoading).toBe(true);
    await pending;
    expect(state(store).items.map((c) => c.key)).toEqual(["SHOP_HERO_BANNERS"]);
    expect(state(store).isListLoading).toBe(false);

    siteConfigApi({ items: 500 });
    await store.dispatch(fetchSiteConfigList());
    expect(state(store).isListLoading).toBe(false);
    expect(state(store).error).toBeTruthy();
    store.dispatch(clearError());
    expect(state(store).error).toBeNull();
  });

  it("saves a value under its key and puts the answer in the list: a new key is added, a saved one replaced", async () => {
    const calls = siteConfigApi({ items: [savedConfig("SHOP_HERO_BANNERS", [])] });
    const store = makeStore();
    await store.dispatch(fetchSiteConfigList());

    await store.dispatch(upsertSiteConfig({ key: "EXCHANGE_RATE", value: '{"vndPerUsd":26000}' }));
    await store.dispatch(upsertSiteConfig({ key: "SHOP_HERO_BANNERS", value: '[{"image":"/a.jpg"}]' }));

    expect(calls.saves).toEqual([{ key: "EXCHANGE_RATE", value: '{"vndPerUsd":26000}' }, { key: "SHOP_HERO_BANNERS", value: '[{"image":"/a.jpg"}]' }]);
    expect(state(store).items.map((c) => [c.key, c.value])).toEqual([["SHOP_HERO_BANNERS", '[{"image":"/a.jpg"}]'], ["EXCHANGE_RATE", '{"vndPerUsd":26000}']]);
  });

  it("is busy only while a save waits, keeps the error when refused and forgets it on the next try", async () => {
    siteConfigApi({ refuseSave: { status: 400, body: { message: "refused" } } });
    const store = makeStore();

    const pending = store.dispatch(upsertSiteConfig({ key: "EXCHANGE_RATE", value: "{}" }));
    expect(state(store).isUpdating).toBe(true);
    await pending;
    expect(state(store).isUpdating).toBe(false);
    expect(state(store).error).toBe("refused");

    siteConfigApi();
    const again = store.dispatch(upsertSiteConfig({ key: "EXCHANGE_RATE", value: "{}" }));
    expect(state(store).error).toBeNull();
    await again;
    expect(state(store).isUpdating).toBe(false);
  });

  it("starts empty", () => {
    expect(state(makeStore())).toMatchObject({ keys: [], items: [], isListLoading: false, isUpdating: false });
  });
});

describe("ASC-9 the registry", () => {
  it("has an editor for banners, shipping and the rate, in that order of tabs, and a status line for the first two", () => {
    expect([...CONFIG_TYPE_ORDER]).toEqual(["BANNER", "SHIPPING", "CURRENCY"]);
    expect(Object.keys(CONFIG_TYPE_VIEWS).sort()).toEqual(["BANNER", "CURRENCY", "SHIPPING"]);
    expect(CONFIG_TYPE_VIEWS.BANNER?.Summary).toBeDefined();
    expect(CONFIG_TYPE_VIEWS.SHIPPING?.Summary).toBeDefined();
    expect(CONFIG_TYPE_VIEWS.CURRENCY?.Summary).toBeUndefined();
    expect(CONFIG_TYPE_VIEWS.TEXT).toBeUndefined();
  });
});
