import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import BannerConfigModal from "@/src/app/[locale]/(admin)/admin/site-config/_types/banner/BannerConfigModal";
import { EMPTY_BANNER_ITEM, parseBannerValue } from "@/src/app/[locale]/(admin)/admin/site-config/_types/banner/banner-form";
import { API } from "@/tests/_support/api";
import { msg } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";
import { savedConfig, siteConfigApi, type SiteConfigApiOptions } from "./site-config-kit";

/* The banner editor (specs/admin/site-config.md, flows ASC-4 to ASC-5E). */

const S = (key: string) => msg(`admin.siteConfig.${key}`);
const URL_PLACEHOLDER = msg("admin.components.imageFields.url.placeholder");
const BANNERS = [
  { image: "https://img.example/d1.jpg", responsiveImages: { tablet: "https://img.example/t1.jpg" }, label: "New", title: "Spring", subtitle: "Light", ctaLabel: "Shop", ctaHref: "/shop" },
  { image: "https://img.example/d2.jpg" },
];

async function open(saved?: unknown, api: SiteConfigApiOptions = {}, locale: "vi" | "en" = "vi") {
  const calls = siteConfigApi(api);
  const onClose = vi.fn();
  const value = saved === undefined ? undefined : typeof saved === "string" ? saved : JSON.stringify(saved);
  const view = await renderApp(<BannerConfigModal configKey="SHOP_HERO_BANNERS" title="Shop banners" savedValue={value} onClose={onClose} />, { as: "adminFull", locale });
  return { calls, onClose, ...view };
}
const box = () => screen.getByRole("heading", { level: 2, name: "Shop banners" }).closest(".fixed") as HTMLElement;
const imageBoxes = () => within(box()).getAllByPlaceholderText(URL_PLACEHOLDER) as HTMLInputElement[];
const textBox = (labelText: string) => within(box()).getAllByText(labelText)[0].closest("label, div")!.querySelector("input") as HTMLInputElement;
const save = () => within(box()).getByRole("button", { name: S("form.save") });

describe("ASC-4 reading what is saved", () => {
  it("returns no banner for nothing, for text that is not JSON, and for JSON that is not a list", () => {
    expect(parseBannerValue(undefined)).toEqual([]);
    expect(parseBannerValue("")).toEqual([]);
    expect(parseBannerValue("{oops")).toEqual([]);
    expect(parseBannerValue('{"a":1}')).toEqual([]);
    expect(parseBannerValue('[{"image":"/a.jpg"}]')).toEqual([{ image: "/a.jpg" }]);
  });

  it("starts a new banner empty", () => {
    expect(EMPTY_BANNER_ITEM).toEqual({ image: "", responsiveImages: {}, label: "", title: "", subtitle: "", ctaLabel: "", ctaHref: "" });
  });
});

describe("ASC-5 editing banners", () => {
  it("opens with the saved banners, counted, each with its images and texts", async () => {
    await open(BANNERS);

    expect(within(box()).getByText("Banner (2)")).toBeInTheDocument();
    expect(within(box()).getByText("Banner 1")).toBeInTheDocument();
    expect(within(box()).getByText("Banner 2")).toBeInTheDocument();
    expect(imageBoxes().map((i) => i.value)).toEqual(["https://img.example/d1.jpg", "https://img.example/t1.jpg", "", "https://img.example/d2.jpg", "", ""]);
    expect(within(box()).getByDisplayValue("Spring")).toBeInTheDocument();
    expect(within(box()).getByDisplayValue("/shop")).toBeInTheDocument();
    expect(within(box()).queryByText(S("form.emptyHint"))).not.toBeInTheDocument();
  });

  it("opens empty, with a hint, when nothing (or something broken) is saved", async () => {
    const view = await open();
    expect(within(box()).getByText("Banner (0)")).toBeInTheDocument();
    expect(within(box()).getByText(S("form.emptyHint"))).toBeInTheDocument();
    view.unmount();

    await open("{broken");
    expect(within(box()).getByText("Banner (0)")).toBeInTheDocument();
  });

  it("adds an empty banner and removes the one asked for, keeping the others", async () => {
    await open(BANNERS);
    await userEvent.click(within(box()).getByRole("button", { name: S("form.addBanner") }));
    expect(within(box()).getByText("Banner (3)")).toBeInTheDocument();
    expect(imageBoxes()).toHaveLength(9);

    await userEvent.click(within(box()).getAllByRole("button", { name: S("form.removeBanner") })[0]);

    expect(within(box()).getByText("Banner (2)")).toBeInTheDocument();
    expect(imageBoxes()[0].value).toBe("https://img.example/d2.jpg");
  });

  it("collapses a banner to its header with a tick for each image it has, and opens it again", async () => {
    await open(BANNERS);
    const headers = within(box()).getAllByRole("button", { name: /^Banner \d/ });

    await userEvent.click(headers[0]);

    expect(imageBoxes()).toHaveLength(3);
    const desktop = within(box()).getByText(S("form.images.desktop"), { selector: "span.whitespace-nowrap" });
    const tablet = within(box()).getByText(S("form.images.tablet"), { selector: "span.whitespace-nowrap" });
    const mobile = within(box()).getByText(S("form.images.mobile"), { selector: "span.whitespace-nowrap" });
    expect(desktop.querySelector("svg")).not.toBeNull();
    expect(tablet.querySelector("svg")).not.toBeNull();
    expect(mobile.querySelector("svg")).toBeNull();
    expect(mobile.className).toContain("opacity-40");
    await userEvent.click(within(box()).getByRole("button", { name: /^Banner 1/ }));
    expect(imageBoxes()).toHaveLength(6);
  });

  it("ticks the desktop picture and not the tablet or phone one on a collapsed banner that has only the desktop picture", async () => {
    await open(BANNERS);

    await userEvent.click(within(box()).getAllByRole("button", { name: /^Banner \d/ })[1]);

    const mark = (name: string) => within(box()).getByText(S(`form.images.${name}`), { selector: "span.whitespace-nowrap" });
    expect(mark("desktop").querySelector("svg")).not.toBeNull();
    expect(mark("tablet").querySelector("svg")).toBeNull();
    expect(mark("mobile").querySelector("svg")).toBeNull();
  });

  it("removes the second of three banners, keeping the first and the third", async () => {
    await open([{ image: "https://img.example/a.jpg" }, { image: "https://img.example/b.jpg" }, { image: "https://img.example/c.jpg" }]);

    await userEvent.click(within(box()).getAllByRole("button", { name: S("form.removeBanner") })[1]);

    expect(imageBoxes().filter((_, i) => i % 3 === 0).map((i) => i.value)).toEqual(["https://img.example/a.jpg", "https://img.example/c.jpg"]);
  });

  it("keeps a desktop picture typed into a new banner", async () => {
    const { calls } = await open();
    await userEvent.click(within(box()).getByRole("button", { name: S("form.addBanner") }));
    await userEvent.type(imageBoxes()[0], "https://img.example/new.jpg");

    await userEvent.click(save());

    await waitFor(() => expect(calls.saves).toHaveLength(1));
    expect(JSON.parse(calls.saves[0].value)).toEqual([{ image: "https://img.example/new.jpg", label: "", title: "", subtitle: "", ctaLabel: "", ctaHref: "" }]);
  });

  it("collapses only the banner clicked", async () => {
    await open(BANNERS);

    await userEvent.click(within(box()).getAllByRole("button", { name: /^Banner \d/ })[1]);

    expect(imageBoxes()).toHaveLength(3);
    expect(imageBoxes()[0].value).toBe("https://img.example/d1.jpg");
  });

  it("changes every text and image field", async () => {
    const { calls } = await open([{ image: "https://img.example/d.jpg" }]);
    const inputs = within(box()).getAllByRole("textbox") as HTMLInputElement[];
    const byLabel = (name: string) => within(box()).getByText(name, { selector: "label span, label > span, span" }).closest("div")!.querySelector("input") as HTMLInputElement;
    void inputs;
    const images = imageBoxes();
    await userEvent.type(images[1], "https://img.example/t.jpg");
    await userEvent.type(images[2], "https://img.example/m.jpg");
    await userEvent.type(byLabel(S("form.content.label")), "New in");
    await userEvent.type(byLabel(S("form.content.title")), "Hello");
    await userEvent.type(byLabel(S("form.content.subtitle")), "World");
    await userEvent.type(byLabel(S("form.content.ctaLabel")), "Go");
    await userEvent.type(within(box()).getByPlaceholderText("/shop"), "/new-in");

    await userEvent.click(save());

    await waitFor(() => expect(calls.saves).toHaveLength(1));
    expect(JSON.parse(calls.saves[0].value)).toEqual([{ image: "https://img.example/d.jpg", responsiveImages: { tablet: "https://img.example/t.jpg", mobile: "https://img.example/m.jpg" }, label: "New in", title: "Hello", subtitle: "World", ctaLabel: "Go", ctaHref: "/new-in" }]);
  });

  it("refuses to save a banner without its desktop picture, saying so, sending nothing", async () => {
    const { calls } = await open([{ image: "https://img.example/d.jpg" }, { image: "  " }]);

    await userEvent.click(save());

    expect(await screen.findByText(S("toast.desktopRequired"))).toBeInTheDocument();
    expect(calls.saves).toEqual([]);
  });

  it("will not save a new banner that was left empty", async () => {
    const { calls } = await open();
    await userEvent.click(within(box()).getByRole("button", { name: S("form.addBanner") }));

    await userEvent.click(save());

    expect(await screen.findByText(S("toast.desktopRequired"))).toBeInTheDocument();
    expect(calls.saves).toEqual([]);
  });

  it("saves under its key as a JSON text, dropping empty tablet and phone pictures so the stored text stays small", async () => {
    const { calls, onClose } = await open([{ image: "https://img.example/d.jpg", responsiveImages: { tablet: "  ", mobile: "https://img.example/m.jpg" }, title: "Hi" }, { image: "https://img.example/e.jpg", responsiveImages: { tablet: "", mobile: "" } }]);

    await userEvent.click(save());

    await waitFor(() => expect(calls.saves).toHaveLength(1));
    expect(calls.saves[0].key).toBe("SHOP_HERO_BANNERS");
    expect(JSON.parse(calls.saves[0].value)).toEqual([{ image: "https://img.example/d.jpg", responsiveImages: { mobile: "https://img.example/m.jpg" }, title: "Hi" }, { image: "https://img.example/e.jpg" }]);
    expect(await screen.findByText(S("toast.saved"))).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("saves an empty list when all banners were removed (the page then uses its own content)", async () => {
    const { calls } = await open(BANNERS);
    await userEvent.click(within(box()).getAllByRole("button", { name: S("form.removeBanner") })[0]);
    await userEvent.click(within(box()).getAllByRole("button", { name: S("form.removeBanner") })[0]);

    await userEvent.click(save());

    await waitFor(() => expect(calls.saves).toHaveLength(1));
    expect(calls.saves[0].value).toBe("[]");
  });

  it("keeps the saving label and the button off while it is on its way", async () => {
    await open([{ image: "https://img.example/d.jpg" }]);
    server.use(http.put(`${API}/api/admin/site-config/:key`, async () => {
      await delay(300);
      return HttpResponse.json({ data: savedConfig("SHOP_HERO_BANNERS", []) });
    }));

    await userEvent.click(save());

    expect(await within(box()).findByRole("button", { name: msg("admin.components.formKit.saving") })).toBeDisabled();
    await waitFor(() => expect(save()).toBeEnabled());
  });

  it("explains a refusal in the BE's words or its own, keeps the form and does not close", async () => {
    const first = await open([{ image: "https://img.example/d.jpg" }], { refuseSave: { status: 400, body: { message: "Invalid fields: banners", errorCode: 1503 } } });
    await userEvent.click(save());
    expect(await screen.findByText("Invalid fields: banners")).toBeInTheDocument();
    expect(first.onClose).not.toHaveBeenCalled();
    first.unmount();

    const second = await open([{ image: "https://img.example/d.jpg" }], { refuseSave: { status: 500, body: {} } });
    await userEvent.click(save());
    expect(await screen.findByText(S("toast.saveFailed"))).toBeInTheDocument();
    expect(second.onClose).not.toHaveBeenCalled();
  });

  it("closes with Cancel without saving", async () => {
    const { calls, onClose } = await open(BANNERS);

    await userEvent.click(within(box()).getByRole("button", { name: msg("admin.components.formKit.cancel") }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(calls.saves).toEqual([]);
  });

  it("reads in English in English", async () => {
    await open(BANNERS, {}, "en");

    expect(within(box()).getByText("Banners (2)")).toBeInTheDocument();
  });
});
