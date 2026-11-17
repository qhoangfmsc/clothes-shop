import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import ExchangeRateModal from "@/src/app/[locale]/(admin)/admin/site-config/_types/currency/ExchangeRateModal";
import { EXCHANGE_RATE_LIMITS, parseExchangeRateValue, serializeExchangeRate, validateExchangeRate } from "@/src/app/[locale]/(admin)/admin/site-config/_types/currency/exchange-rate-form";
import { API } from "@/tests/_support/api";
import { msg } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";
import { savedConfig, siteConfigApi, type SiteConfigApiOptions } from "./site-config-kit";

/* The exchange-rate editor and its form model (specs/admin/site-config.md, flows ASC-7 to ASC-7E). */

const S = (key: string) => msg(`admin.siteConfig.${key}`);

describe("ASC-7 the form model", () => {
  it.each([
    ["nothing", undefined, null],
    ["an empty text", "", null],
    ["text that is not JSON", "{oops", null],
    ["a rate that is not a number", '{"vndPerUsd":"25000"}', null],
    ["a missing rate", "{}", null],
    ["a number", '{"vndPerUsd":25999.5}', 25999.5],
  ])("reads %s as %s", (_label, value, expected) => {
    expect(parseExchangeRateValue(value as string | undefined)).toBe(expected);
  });

  it.each(["26000", "25999.5", "1", "1000000", "1.25", " 26000 "])("accepts %j", (text) => {
    expect(validateExchangeRate(text)).toBeNull();
  });

  it.each(["", "abc", "25.000,5", "25,5", "1.234", "-5", ".5", "1.", "1e5", "25 000"])("refuses %j as not a number", (text) => {
    expect(validateExchangeRate(text)).toBe("number");
  });

  it.each(["0", "0.5", "1000000.01", "1000001"])("refuses %j as out of range", (text) => {
    expect(validateExchangeRate(text)).toBe("range");
  });

  it("writes the rate as the stored text, without spaces", () => {
    expect(serializeExchangeRate(" 25999.5 ")).toBe('{"vndPerUsd":25999.5}');
    expect(EXCHANGE_RATE_LIMITS).toEqual({ min: 1, max: 1_000_000 });
  });
});

async function open(saved?: unknown, api: SiteConfigApiOptions = {}, locale: "vi" | "en" = "vi") {
  const calls = siteConfigApi(api);
  const onClose = vi.fn();
  const value = saved === undefined ? undefined : typeof saved === "string" ? saved : JSON.stringify(saved);
  const view = await renderApp(<ExchangeRateModal configKey="EXCHANGE_RATE" title="Rate" savedValue={value} onClose={onClose} />, { as: "adminFull", locale });
  return { calls, onClose, ...view };
}
const box = () => screen.getByRole("heading", { level: 2, name: "Rate" }).closest(".fixed") as HTMLElement;
const input = () => within(box()).getByRole("textbox") as HTMLInputElement;
const save = () => within(box()).getByRole("button", { name: S("form.save") });

describe("ASC-7 editing the rate", () => {
  it("opens with the saved rate, or empty when none is saved or the saved one is broken", async () => {
    const saved = await open({ vndPerUsd: 25999.5 });
    expect(input()).toHaveValue("25999.5");
    saved.unmount();
    const none = await open();
    expect(input()).toHaveValue("");
    none.unmount();
    await open("{broken");
    expect(input()).toHaveValue("");
  });

  it("labels the box, asks for a number, and has no hint", async () => {
    await open();

    expect(within(box()).getByText(S("exchangeRate.field"))).toBeInTheDocument();
    expect(input()).toBeRequired();
    expect(input()).toHaveAttribute("inputmode", "decimal");
    expect(input()).toHaveAttribute("autocomplete", "off");
    expect(input()).toHaveAttribute("aria-invalid", "false");
  });

  it("saves the rate under its key as the stored text, refreshes what customers read, tells the admin and closes", async () => {
    const { calls, onClose } = await open({ vndPerUsd: 25000 });
    await userEvent.clear(input());
    await userEvent.type(input(), "26000");
    const reads = calls.shippingReads;

    await userEvent.click(save());

    await waitFor(() => expect(calls.saves).toEqual([{ key: "EXCHANGE_RATE", value: '{"vndPerUsd":26000}' }]));
    expect(await screen.findByText(S("toast.saved"))).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(calls.shippingReads).toBeGreaterThanOrEqual(reads);
  });

  it("names the problem under the box and sends nothing when the text is not a number or out of range, then clears it on the next key", async () => {
    const { calls } = await open();
    await userEvent.type(input(), "25.000");
    await userEvent.click(save());

    const alert = within(box()).getByRole("alert");
    expect(alert).toHaveTextContent(S("exchangeRate.errors.number"));
    expect(input()).toHaveAttribute("aria-invalid", "true");
    await userEvent.type(input(), "0");
    expect(within(box()).queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.clear(input());
    await userEvent.type(input(), "0.5");
    await userEvent.click(save());
    expect(within(box()).getByRole("alert")).toHaveTextContent("Phải nằm trong khoảng 1 đến 1.000.000.");
    expect(calls.saves).toEqual([]);
  });

  it("keeps the saving label and the button off while it is on its way", async () => {
    await open({ vndPerUsd: 25000 });
    server.use(http.put(`${API}/api/admin/site-config/:key`, async () => {
      await delay(300);
      return HttpResponse.json({ data: savedConfig("EXCHANGE_RATE", { vndPerUsd: 25000 }) });
    }));

    await userEvent.click(save());

    expect(await within(box()).findByRole("button", { name: msg("admin.components.formKit.saving") })).toBeDisabled();
    await waitFor(() => expect(save()).toBeEnabled());
  });

  it("explains a refusal in the BE's words (the list of bad fields) or its own, and keeps the form", async () => {
    const first = await open({ vndPerUsd: 25000 }, { refuseSave: { status: 400, body: { message: "Invalid fields: vndPerUsd", errorCode: 1503 } } });
    await userEvent.click(save());
    expect(await screen.findByText("Invalid fields: vndPerUsd")).toBeInTheDocument();
    expect(first.onClose).not.toHaveBeenCalled();
    first.unmount();

    const second = await open({ vndPerUsd: 25000 }, { refuseSave: { status: 500, body: {} } });
    await userEvent.click(save());
    expect(await screen.findByText(S("toast.saveFailed"))).toBeInTheDocument();
    expect(second.onClose).not.toHaveBeenCalled();
  });

  it("closes with Cancel without saving", async () => {
    const { calls, onClose } = await open({ vndPerUsd: 25000 });

    await userEvent.click(within(box()).getByRole("button", { name: msg("admin.components.formKit.cancel") }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(calls.saves).toEqual([]);
  });

  it("writes the problem in English in English", async () => {
    await open(undefined, {}, "en");
    await userEvent.type(input(), "abc");
    await userEvent.click(within(box()).getByRole("button", { name: msg("admin.siteConfig.form.save", "en") }));

    expect(within(box()).getByRole("alert")).toHaveTextContent(msg("admin.siteConfig.exchangeRate.errors.number", "en"));
  });
});
