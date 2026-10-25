import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/src/lib/permissions";
import { adminWith } from "@/tests/_support/identities";
import { msg } from "@/tests/_support/messages";
import { KEYS, renderSiteConfig, savedConfig } from "./site-config-kit";

/* The site-config page: tabs by type, a card per key, the status line, who may edit (specs/admin/site-config.md, flows ASC-1 to ASC-3E). */

const S = (key: string) => msg(`admin.siteConfig.${key}`);
const label = (key: string) => msg(`admin.siteConfig.keys.${key}.label`);
const keyName = (key: string) => screen.getByText(label(key), { selector: "span.font-semibold" });
const cardOf = (key: string) => keyName(key).closest("div.flex-col.gap-3") as HTMLElement;
const tab = (type: string) => screen.getByRole("button", { name: S(`types.${type}.label`) });

describe("ASC-1 the cards", () => {
  it("shows the title, the hint, and while the list is on its way, a loading line instead of the cards", async () => {
    await renderSiteConfig({ listDelayMs: 300 });

    expect(await screen.findByRole("heading", { level: 1, name: S("page.title") })).toBeInTheDocument();
    expect(screen.getByText(S("page.subtitle"))).toBeInTheDocument();
    expect(await screen.findByText(S("page.loading"))).toBeInTheDocument();
    expect(await screen.findByText(label("SHOP_HERO_BANNERS"))).toBeInTheDocument();
    expect(screen.queryByText(S("page.loading"))).not.toBeInTheDocument();
  });

  it("asks for the known keys and for what is saved, once each", async () => {
    const { calls } = await renderSiteConfig();
    await screen.findByText(label("SHOP_HERO_BANNERS"), { selector: "span.font-semibold" });

    expect(calls.keys).toBe(1);
    expect(calls.lists).toBe(1);
  });

  it("opens on the first type that has keys (banners), with only that type's cards and its description", async () => {
    await renderSiteConfig();
    await screen.findByText(label("SHOP_HERO_BANNERS"), { selector: "span.font-semibold" });

    expect(screen.getByText(label("NAV_MENU_BANNERS"))).toBeInTheDocument();
    expect(screen.queryByText(label("SHIPPING_CONFIG"))).not.toBeInTheDocument();
    expect(screen.queryByText(label("EXCHANGE_RATE"), { selector: "span.font-semibold" })).not.toBeInTheDocument();
    expect(screen.getByText(S("types.BANNER.description"))).toBeInTheDocument();
    expect(tab("BANNER").className).toContain("border-[var(--accent-primary)]");
  });

  it("has a tab per type, in the order banners, shipping, rate; switching shows that type's cards", async () => {
    await renderSiteConfig();
    await screen.findByText(label("SHOP_HERO_BANNERS"), { selector: "span.font-semibold" });

    expect(screen.getAllByRole("button").filter((b) => b.className.includes("whitespace-nowrap")).map((b) => b.textContent)).toEqual([S("types.BANNER.label"), S("types.SHIPPING.label"), S("types.CURRENCY.label")]);
    await userEvent.click(tab("SHIPPING"));
    expect(screen.getByText(label("SHIPPING_CONFIG"))).toBeInTheDocument();
    expect(screen.queryByText(label("SHOP_HERO_BANNERS"))).not.toBeInTheDocument();
    expect(screen.getByText(S("types.SHIPPING.description"))).toBeInTheDocument();
    await userEvent.click(tab("CURRENCY"));
    expect(keyName("EXCHANGE_RATE")).toBeInTheDocument();
    expect(screen.getByText(S("keys.EXCHANGE_RATE.description"))).toBeInTheDocument();
  });

  it("shows no tabs when only one type has keys", async () => {
    await renderSiteConfig({ keys: KEYS.filter((k) => k.type === "BANNER") });
    await screen.findByText(label("SHOP_HERO_BANNERS"), { selector: "span.font-semibold" });

    expect(screen.queryByRole("button", { name: S("types.BANNER.label") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: S("types.SHIPPING.label") })).not.toBeInTheDocument();
    expect(screen.getByText(S("types.BANNER.description"))).toBeInTheDocument();
  });

  it("gives no tab and no card to a type that has no editor, and shows nothing when no type is usable", async () => {
    await renderSiteConfig({ keys: [{ key: "SOME_TEXT", type: "TEXT" }] });
    await screen.findByRole("heading", { level: 1, name: S("page.title") });

    await waitFor(() => expect(screen.queryByText(S("page.loading"))).not.toBeInTheDocument());
    expect(screen.queryByText("SOME_TEXT")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: S("card.edit") })).not.toBeInTheDocument();
  });

  it("shows an unknown key under its own name with no description", async () => {
    await renderSiteConfig({ keys: [{ key: "BRAND_NEW_BANNERS", type: "BANNER" }] });

    const card = (await screen.findByText("BRAND_NEW_BANNERS")).closest("div.flex-col.gap-3") as HTMLElement;

    expect(card.querySelector("p")).toHaveTextContent("");
  });

  it("starts with the first tab even after a type disappears from the keys", async () => {
    const view = await renderSiteConfig({ keys: KEYS.filter((k) => k.type !== "BANNER") });
    await screen.findByText(label("SHIPPING_CONFIG"));

    expect(tab("SHIPPING").className).toContain("border-[var(--accent-primary)]");
    view.unmount();
  });
});

describe("ASC-2 the status line", () => {
  it("says a banner key is empty, or how many banners it has (a broken value counts as none)", async () => {
    await renderSiteConfig({ items: [savedConfig("SHOP_HERO_BANNERS", [{ image: "/a.jpg" }, { image: "/b.jpg" }]), savedConfig("NAV_MENU_BANNERS", "{not json")] });
    await screen.findByText(label("SHOP_HERO_BANNERS"), { selector: "span.font-semibold" });

    expect(within(cardOf("SHOP_HERO_BANNERS")).getByText("Đã cấu hình — 2 banner")).toBeInTheDocument();
    expect(within(cardOf("NAV_MENU_BANNERS")).getByText("Đã cấu hình — 0 banner")).toBeInTheDocument();
  });

  it("says a banner key with nothing saved is empty, with a grey dot", async () => {
    await renderSiteConfig();
    await screen.findByText(label("SHOP_HERO_BANNERS"), { selector: "span.font-semibold" });
    const card = cardOf("SHOP_HERO_BANNERS");

    expect(within(card).getByText(S("card.empty"))).toBeInTheDocument();
    expect(card.querySelector("span.rounded-full")!.className).toContain("bg-[var(--text-disabled)]");
  });

  it("shows a green dot for a banner key that is configured", async () => {
    await renderSiteConfig({ items: [savedConfig("SHOP_HERO_BANNERS", [{ image: "/a.jpg" }])] });
    await screen.findByText(label("SHOP_HERO_BANNERS"), { selector: "span.font-semibold" });

    expect(cardOf("SHOP_HERO_BANNERS").querySelector("span.rounded-full")!.className).toContain("bg-[var(--color-sage)]");
  });

  it("says the shipping key is configured, or still on the default values", async () => {
    const fresh = await renderSiteConfig();
    await screen.findByText(label("SHOP_HERO_BANNERS"), { selector: "span.font-semibold" });
    await userEvent.click(tab("SHIPPING"));
    expect(within(cardOf("SHIPPING_CONFIG")).getByText(S("card.shippingDefault"))).toBeInTheDocument();
    fresh.unmount();

    await renderSiteConfig({ items: [savedConfig("SHIPPING_CONFIG", {})] });
    await screen.findByText(label("SHOP_HERO_BANNERS"), { selector: "span.font-semibold" });
    await userEvent.click(tab("SHIPPING"));
    expect(within(cardOf("SHIPPING_CONFIG")).getByText(S("card.shippingConfigured"))).toBeInTheDocument();
  });

  it("has no status line on the exchange-rate card", async () => {
    await renderSiteConfig();
    await screen.findByText(label("SHOP_HERO_BANNERS"), { selector: "span.font-semibold" });
    await userEvent.click(tab("CURRENCY"));

    expect(cardOf("EXCHANGE_RATE").querySelector("span.rounded-full")).toBeNull();
  });
});

describe("ASC-3 who may edit and what opens", () => {
  it("gives the Edit button to an admin who may save configs, and opens the editor of the card's type with the card's name as title", async () => {
    await renderSiteConfig();
    await screen.findByText(label("SHOP_HERO_BANNERS"), { selector: "span.font-semibold" });

    await userEvent.click(within(cardOf("SHOP_HERO_BANNERS")).getByRole("button", { name: S("card.edit") }));

    const banner = await screen.findByRole("heading", { level: 2, name: label("SHOP_HERO_BANNERS") });
    expect(within(banner.closest(".fixed") as HTMLElement).getByText(S("form.addBanner"))).toBeInTheDocument();
    await userEvent.click(within(banner.closest(".fixed") as HTMLElement).getByRole("button", { name: msg("admin.components.formKit.cancel") }));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: label("SHOP_HERO_BANNERS") })).not.toBeInTheDocument());

    await userEvent.click(tab("SHIPPING"));
    await userEvent.click(within(cardOf("SHIPPING_CONFIG")).getByRole("button", { name: S("card.edit") }));
    const shipping = await screen.findByRole("heading", { level: 2, name: label("SHIPPING_CONFIG") });
    expect(await within(shipping.closest(".fixed") as HTMLElement).findByText(S("shipping.notice"))).toBeInTheDocument();
    await userEvent.click(within(shipping.closest(".fixed") as HTMLElement).getByRole("button", { name: msg("admin.components.formKit.cancel") }));
    await waitFor(() => expect(screen.queryByRole("heading", { level: 2, name: label("SHIPPING_CONFIG") })).not.toBeInTheDocument());

    await userEvent.click(tab("CURRENCY"));
    await userEvent.click(within(cardOf("EXCHANGE_RATE")).getByRole("button", { name: S("card.edit") }));
    const rate = await screen.findByRole("heading", { level: 2, name: label("EXCHANGE_RATE") });
    expect(within(rate.closest(".fixed") as HTMLElement).getByText(S("exchangeRate.field"))).toBeInTheDocument();
  });

  it.each([
    ["view", PERMISSIONS.SITE_CONFIG_VIEW],
    ["delete", PERMISSIONS.SITE_CONFIG_DELETE],
  ] as const)("gives an admin who may only %s no Edit button", async (_label, permission) => {
    await renderSiteConfig({ as: adminWith(permission) });
    await screen.findByText(label("SHOP_HERO_BANNERS"), { selector: "span.font-semibold" });

    expect(screen.queryByRole("button", { name: S("card.edit") })).not.toBeInTheDocument();
  });

  it("gives an admin who may only save the Edit button", async () => {
    await renderSiteConfig({ as: adminWith(PERMISSIONS.SITE_CONFIG_UPSERT) });
    await screen.findByText(label("SHOP_HERO_BANNERS"), { selector: "span.font-semibold" });

    expect(screen.getAllByRole("button", { name: S("card.edit") })).toHaveLength(2);
  });

  it("reads in English in English", async () => {
    await renderSiteConfig({ locale: "en" });

    expect(await screen.findByRole("heading", { level: 1, name: msg("admin.siteConfig.page.title", "en") })).toBeInTheDocument();
  });
});

describe("ASC-3E when the BE cannot answer", () => {
  it("shows no card when the known keys cannot be loaded", async () => {
    await renderSiteConfig({ keys: 500 });
    await screen.findByRole("heading", { level: 1, name: S("page.title") });
    await waitFor(() => expect(screen.queryByText(S("page.loading"))).not.toBeInTheDocument());

    expect(screen.queryByRole("button", { name: S("card.edit") })).not.toBeInTheDocument();
  });

  it("shows every key as not configured when what is saved cannot be loaded", async () => {
    await renderSiteConfig({ items: 500 });
    await screen.findByText(label("SHOP_HERO_BANNERS"), { selector: "span.font-semibold" });

    expect(within(cardOf("SHOP_HERO_BANNERS")).getByText(S("card.empty"))).toBeInTheDocument();
  });

  it.each([
    ["a visitor", "guest", 401],
    ["a shopper", "user", 403],
  ] as const)("shows %s no card", async (_label, as, deny) => {
    await renderSiteConfig({ as, deny });
    await screen.findByRole("heading", { level: 1, name: S("page.title") });
    await waitFor(() => expect(screen.queryByText(S("page.loading"))).not.toBeInTheDocument());

    expect(screen.queryByText(label("SHOP_HERO_BANNERS"))).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: S("card.edit") })).not.toBeInTheDocument();
  });
});
