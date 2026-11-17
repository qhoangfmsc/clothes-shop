import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import ShippingConfigModal from "@/src/app/[locale]/(admin)/admin/site-config/_types/shipping/ShippingConfigModal";
import { API } from "@/tests/_support/api";
import { shippingInfo } from "@/tests/_support/fixtures";
import { msg } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";
import { savedConfig, siteConfigApi, type SiteConfigApiOptions } from "./site-config-kit";

/* The shipping & returns editor (specs/admin/site-config.md, flows ASC-8 to ASC-8E). */

const S = (key: string) => msg(`admin.siteConfig.${key}`);
const SH = (key: string) => msg(`admin.siteConfig.shipping.${key}`);
const STORED = {
  freeShippingThresholdVnd: 1_500_000,
  methods: [
    { id: "standard", name: "Standard", description: "Usual", estimatedDays: "3-5 days", priceVnd: 30_000, icon: "truck" },
    { id: "express", name: "Express", description: "", estimatedDays: "1-2 days", priceVnd: 60_000, icon: "express" },
    { id: "store-pickup", name: "Pickup", description: "", estimatedDays: "Today", priceVnd: 0, icon: "store" },
  ],
  returnPolicy: { days: 14, description: "Two weeks", conditions: ["Unworn", "With tags"] },
};

async function open(saved?: unknown, api: SiteConfigApiOptions = {}, locale: "vi" | "en" = "vi") {
  const calls = siteConfigApi(api);
  const onClose = vi.fn();
  const value = saved === undefined ? undefined : typeof saved === "string" ? saved : JSON.stringify(saved);
  const view = await renderApp(<ShippingConfigModal configKey="SHIPPING_CONFIG" title="Shipping" savedValue={value} onClose={onClose} />, { as: "adminFull", locale });
  return { calls, onClose, ...view };
}
const box = () => screen.getByRole("heading", { level: 2, name: "Shipping" }).closest(".fixed") as HTMLElement;
const ready = () => screen.findByText(SH("notice"));
/** The input/textarea/select under the n-th label with this text */
const field = (labelText: string, n = 0) => {
  const label = within(box()).getAllByText(labelText)[n];
  return label.closest("div.flex-col")!.querySelector("input, textarea, select") as HTMLInputElement;
};
const save = () => within(box()).getByRole("button", { name: S("form.save") });
const retype = async (el: HTMLElement, text: string) => {
  await userEvent.clear(el);
  if (text) await userEvent.type(el, text);
};

describe("ASC-8 opening the editor", () => {
  it("starts from what is saved: the threshold, the return policy and the three methods in order, with read-only ids", async () => {
    await open(STORED);
    await ready();

    expect(field(SH("free.threshold"))).toHaveValue("1.500.000");
    expect(field(SH("returns.days"))).toHaveValue("14");
    expect(field(SH("returns.description"))).toHaveValue("Two weeks");
    expect(field(SH("returns.conditions"))).toHaveValue("Unworn\nWith tags");
    expect(["Standard", "Express", "Pickup"].map((n) => within(box()).getByDisplayValue(n))).toHaveLength(3);
    expect(within(box()).getAllByTitle(SH("idReadonly")).map((c) => c.textContent)).toEqual(["standard", "express", "store-pickup"]);
    expect(field(SH("fields.price"), 0)).toHaveValue("30.000");
    expect(field(SH("fields.price"), 2)).toHaveValue("0");
    expect(field(SH("fields.icon"), 1)).toHaveValue("express");
    expect(within(box()).getByText(SH("methods.standard"))).toBeInTheDocument();
  });

  it("starts from what customers currently get when nothing is saved", async () => {
    await open(undefined, { shipping: shippingInfo({ freeShippingThresholdVnd: 2_000_000 }) });
    await ready();

    expect(field(SH("free.threshold"))).toHaveValue("2.000.000");
    expect(within(box()).getByDisplayValue("Giao nhanh")).toBeInTheDocument();
    expect(field(SH("returns.days"))).toHaveValue("7");
  });

  it("starts from what customers currently get when the saved text is broken", async () => {
    await open("{broken", { shipping: shippingInfo() });
    await ready();

    expect(within(box()).getByDisplayValue("Giao nhanh")).toBeInTheDocument();
  });

  it("fills in the return policy from what customers get when the saved config has none, so saving never resets it", async () => {
    const { calls } = await open({ ...STORED, returnPolicy: undefined }, { shipping: shippingInfo({ returnPolicy: { days: 30, description: "Month", conditions: ["Unworn"] } }) });
    await ready();
    expect(field(SH("returns.days"))).toHaveValue("30");

    await userEvent.click(save());

    await waitFor(() => expect(calls.saves).toHaveLength(1));
    expect(JSON.parse(calls.saves[0].value).returnPolicy).toEqual({ days: 30, description: "Month", conditions: ["Unworn"] });
  });

  it("leaves the return policy out of the form when neither the saved config nor customers' view has one", async () => {
    await open({ ...STORED, returnPolicy: undefined }, { shipping: 500 });
    await ready();

    expect(within(box()).queryByText(SH("returns.section"))).not.toBeInTheDocument();
  });

  it("shows a loading line while the customers' config is on its way, then the form", async () => {
    siteConfigApi();
    server.use(http.get(`${API}/api/shipping`, async () => {
      await delay(300);
      return HttpResponse.json({ data: shippingInfo() });
    }));
    await renderApp(<ShippingConfigModal configKey="SHIPPING_CONFIG" title="Shipping" savedValue={undefined} onClose={() => {}} />, { as: "adminFull" });

    expect(await within(box()).findByText(SH("loading"))).toBeInTheDocument();
    expect(await ready()).toBeInTheDocument();
  });

  it("says it could not load when nothing is saved and customers' config cannot be read", async () => {
    await open(undefined, { shipping: 500 });

    expect(await within(box()).findByText(SH("loadFailed"))).toBeInTheDocument();
    expect(within(box()).queryByRole("button", { name: S("form.save") })).not.toBeInTheDocument();
  });

  it("opens at once from a saved config that has a return policy, without waiting for customers' view", async () => {
    siteConfigApi();
    server.use(http.get(`${API}/api/shipping`, async () => {
      await delay(800);
      return HttpResponse.json({ data: shippingInfo() });
    }));
    await renderApp(<ShippingConfigModal configKey="SHIPPING_CONFIG" title="Shipping" savedValue={JSON.stringify(STORED)} onClose={() => {}} />, { as: "adminFull" });

    expect(await within(box()).findByText(SH("notice"), {}, { timeout: 400 })).toBeInTheDocument();
  });

  it("opens from the saved config alone, not waiting for customers' view", async () => {
    await open(STORED, { shipping: 500 });

    expect(await ready()).toBeInTheDocument();
  });
});

describe("ASC-8 filling it in", () => {
  it("groups money with dots as it is typed, drops letters and refuses a decimal", async () => {
    await open(STORED);
    await ready();
    const threshold = field(SH("free.threshold"));

    await retype(threshold, "2500000");
    expect(threshold).toHaveValue("2.500.000");
    await retype(threshold, "12ab3");
    expect(threshold).toHaveValue("123");
    await userEvent.type(threshold, ",");
    expect(threshold).toHaveValue("123");
    await userEvent.type(threshold, "5");
    expect(threshold).toHaveValue("1.235");
  });

  it("turns the free shipping off when the threshold is emptied", async () => {
    const { calls } = await open(STORED);
    await ready();
    await retype(field(SH("free.threshold")), "");

    await userEvent.click(save());

    await waitFor(() => expect(calls.saves).toHaveLength(1));
    expect(JSON.parse(calls.saves[0].value).freeShippingThresholdVnd).toBeNull();
  });

  it("changes a method's name, delivery time, description, price and icon, and the return policy", async () => {
    const { calls } = await open(STORED);
    await ready();
    await retype(field(SH("fields.name"), 1), "Overnight");
    await retype(field(SH("fields.estimatedDays"), 1), "Next day");
    await retype(field(SH("fields.description"), 1), "Fast");
    await retype(field(SH("fields.price"), 1), "99000");
    await userEvent.selectOptions(field(SH("fields.icon"), 1), "truck");
    await retype(field(SH("returns.days")), "30");
    await retype(field(SH("returns.description")), "A month");
    await retype(field(SH("returns.conditions")), "Unworn{Enter}Boxed");

    await userEvent.click(save());

    await waitFor(() => expect(calls.saves).toHaveLength(1));
    const saved = JSON.parse(calls.saves[0].value);
    expect(saved.methods[1]).toEqual({ id: "express", name: "Overnight", description: "Fast", estimatedDays: "Next day", priceVnd: 99_000, icon: "truck" });
    expect(saved.returnPolicy).toEqual({ days: 30, description: "A month", conditions: ["Unworn", "Boxed"] });
    expect(saved.methods[0].name).toBe("Standard");
  });

  it("offers the three icons with their names, and limits the lengths in the boxes", async () => {
    await open(STORED);
    await ready();

    expect(within(field(SH("fields.icon"))).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["truck", "express", "store"]);
    expect(within(field(SH("fields.icon"))).getByRole("option", { name: SH("icons.truck") })).toBeInTheDocument();
    expect(field(SH("fields.name"))).toHaveAttribute("maxlength", "100");
    expect(field(SH("fields.estimatedDays"))).toHaveAttribute("maxlength", "100");
    expect(field(SH("fields.description"))).toHaveAttribute("maxlength", "255");
    expect(field(SH("returns.description"))).toHaveAttribute("maxlength", "500");
  });
});

describe("ASC-8 checking before saving", () => {
  it("shows each problem under its own field with a general warning, sends nothing, and clears a problem when the field is touched", async () => {
    const { calls } = await open(STORED);
    await ready();
    await retype(field(SH("free.threshold")), "0");
    await retype(field(SH("fields.name"), 0), "");
    await retype(field(SH("fields.price"), 2), "");
    await retype(field(SH("returns.days")), "500");

    await userEvent.click(save());

    expect(await screen.findByText(SH("toast.invalid"))).toBeInTheDocument();
    expect(within(box()).getByText(SH("errors.positive"))).toBeInTheDocument();
    expect(within(box()).getByText(SH("errors.required"))).toBeInTheDocument();
    expect(within(box()).getByText(SH("errors.number"))).toBeInTheDocument();
    expect(within(box()).getByText("Nhập số nguyên từ 1 đến 365")).toBeInTheDocument();
    expect(field(SH("free.threshold"))).toHaveAttribute("aria-invalid", "true");
    expect(calls.saves).toEqual([]);

    await userEvent.type(field(SH("free.threshold")), "5");
    expect(within(box()).queryByText(SH("errors.positive"))).not.toBeInTheDocument();
    await userEvent.type(field(SH("fields.name"), 0), "S");
    expect(within(box()).queryByText(SH("errors.required"))).not.toBeInTheDocument();
    await userEvent.type(field(SH("fields.price"), 2), "5");
    expect(within(box()).queryByText(SH("errors.number"))).not.toBeInTheDocument();
    await userEvent.type(field(SH("returns.days")), "0");
    expect(within(box()).queryByText("Nhập số nguyên từ 1 đến 365")).not.toBeInTheDocument();
  });

  it("names the other kinds of problem: too long, too big, too many lines", async () => {
    await open(STORED);
    await ready();
    await retype(field(SH("fields.price"), 0), "9".repeat(11));
    await retype(field(SH("returns.conditions")), Array.from({ length: 11 }, (_, i) => `c${i}`).join("{Enter}"));
    await userEvent.click(save());

    expect(await screen.findByText("Tối đa 1.000.000.000")).toBeInTheDocument();
    expect(within(box()).getByText("Tối đa 10 dòng")).toBeInTheDocument();
  });

  it("names a text that is too long", async () => {
    await open({ ...STORED, methods: STORED.methods.map((m, i) => (i === 0 ? { ...m, description: "x".repeat(255) } : m)) });
    await ready();
    const description = field(SH("returns.description"));
    await userEvent.click(description);
    await retype(field(SH("returns.conditions")), "y".repeat(256));
    await userEvent.click(save());

    expect(await within(box()).findByText("Tối đa 255 ký tự")).toBeInTheDocument();
  });
});

describe("ASC-8 saving", () => {
  it("sends the stored shape under its key, refreshes what customers read, tells the admin and closes", async () => {
    const { calls, onClose } = await open(STORED);
    await ready();
    await retype(field(SH("free.threshold")), "2000000");
    const reads = calls.shippingReads;

    await userEvent.click(save());

    await waitFor(() => expect(calls.saves).toHaveLength(1));
    expect(calls.saves[0].key).toBe("SHIPPING_CONFIG");
    expect(JSON.parse(calls.saves[0].value)).toEqual({ ...STORED, freeShippingThresholdVnd: 2_000_000 });
    expect(await screen.findByText(S("toast.saved"))).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(calls.shippingReads).toBeGreaterThan(reads));
  });

  it("keeps the saving label and the button off while it is on its way", async () => {
    await open(STORED);
    await ready();
    server.use(http.put(`${API}/api/admin/site-config/:key`, async () => {
      await delay(300);
      return HttpResponse.json({ data: savedConfig("SHIPPING_CONFIG", STORED) });
    }));

    await userEvent.click(save());

    expect(await within(box()).findByRole("button", { name: msg("admin.components.formKit.saving") })).toBeDisabled();
    await waitFor(() => expect(save()).toBeEnabled());
  });

  it("explains a refusal in the BE's words (the list of bad fields) or its own, and keeps the form open", async () => {
    const first = await open(STORED, { refuseSave: { status: 400, body: { message: "Invalid fields: methods[0].priceVnd", errorCode: 1503 } } });
    await ready();
    await userEvent.click(save());
    expect(await screen.findByText("Invalid fields: methods[0].priceVnd")).toBeInTheDocument();
    expect(first.onClose).not.toHaveBeenCalled();
    first.unmount();

    const second = await open(STORED, { refuseSave: { status: 403, body: {} } });
    await ready();
    await userEvent.click(save());
    expect(await screen.findByText(S("toast.saveFailed"))).toBeInTheDocument();
    expect(second.onClose).not.toHaveBeenCalled();
  });

  it("closes with Cancel without saving", async () => {
    const { calls, onClose } = await open(STORED);
    await ready();

    await userEvent.click(within(box()).getByRole("button", { name: msg("admin.components.formKit.cancel") }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(calls.saves).toEqual([]);
  });

  it("reads in English in English", async () => {
    await open(STORED, {}, "en");

    expect(await within(box()).findByText(msg("admin.siteConfig.shipping.notice", "en"))).toBeInTheDocument();
  });
});
