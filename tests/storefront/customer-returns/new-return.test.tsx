import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import NewReturnContent from "@/src/app/[locale]/(private)/returns/new/NewReturnContent";
import type { ReturnEligibility } from "@/src/app/[locale]/(private)/returns/_common/types";
import { API } from "@/tests/_support/api";
import { eligibility, order, orderItem } from "@/tests/_support/fixtures";
import { dateText, msg, msgf } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";
import { returnsBackend, type ReturnsBackend } from "./returns-kit";

/* The form that asks to send goods back (specs/storefront/customer-returns.md, flows RET-7 to RET-9E). */

const F = (key: string, locale: "vi" | "en" = "vi") => msg(`private.returns.form.${key}`, locale);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Order lines: the dress (three bought, two can still go back) and a skirt already in a request. */
const LINES = [orderItem({ id: "oi-1", productName: "Dress", quantity: 3 }), orderItem({ id: "oi-2", productName: "Skirt", size: "L", color: "Blue", quantity: 1 })];
const ELIGIBLE = (over: Partial<ReturnEligibility> = {}) =>
  eligibility({ deadline: "2026-04-01T05:00:00.000Z", items: [{ orderItemId: "oi-1", quantity: 3, returnableQuantity: 2 }, { orderItemId: "oi-2", quantity: 1, returnableQuantity: 0 }], ...over });

beforeEach(() => {
  navigation.searchParams = new URLSearchParams("orderId=o-1");
});

async function open(options: ReturnsBackend = {}, view: { as?: "guest" | "user"; locale?: "vi" | "en"; waitForAuth?: boolean } = {}) {
  const calls = returnsBackend({ order: order({ items: LINES }), eligibility: ELIGIBLE(), ...options });
  const result = await renderApp(<NewReturnContent />, { as: view.as ?? "user", locale: view.locale, waitForAuth: view.waitForAuth });
  return { calls, ...result };
}

const ready = () => screen.findByRole("heading", { level: 1, name: F("title") });
const row = (name: string) => within(screen.getByText(name).closest("li") as HTMLElement);
const tick = (name: string) => screen.getByRole("checkbox", { name: new RegExp(name) }) as HTMLInputElement;
const reason = (key: string) => screen.getByRole("radio", { name: msg(`private.returns.reason.${key}`) });
const submit = () => screen.getByRole("button", { name: new RegExp(`^(${F("submit")}|${F("submitting")})$`) });
const dressRow = () => row("Dress");

describe("RET-7 a visitor, and the wait before the form shows", () => {
  it("shows the sign-in wall to a visitor and asks the BE for nothing", async () => {
    const { calls } = await open({}, { as: "guest" });

    expect(screen.getByRole("heading", { name: msg("shared.feedback.unauthenticated.title") })).toBeInTheDocument();
    await wait(150);
    expect(calls.eligibility).toEqual([]);
    expect(calls.orders).toEqual([]);
  });

  it("shows only a placeholder until the session, the order and the eligibility are known", async () => {
    await open({}, { waitForAuth: false });

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(await ready()).toBeInTheDocument();
  });

  it("asks for the order and its eligibility named in the address", async () => {
    navigation.searchParams = new URLSearchParams("orderId=o 7");
    const { calls } = await open({ order: order({ id: "o 7", items: LINES }), eligibility: ELIGIBLE({ orderId: "o 7" }) });

    await ready();
    expect(calls.orders).toEqual(["o 7"]);
    expect(calls.eligibility).toEqual(["o 7"]);
  });
});

describe("RET-7E a return that cannot be asked for", () => {
  it("says it cannot be returned, and points back to the orders, when the address names no order", async () => {
    navigation.searchParams = new URLSearchParams();
    await open();

    expect(await screen.findByRole("heading", { level: 1, name: F("unavailable.title") })).toBeInTheDocument();
    expect(screen.getByText(F("unavailable.description"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: F("back") })).toHaveAttribute("href", "/orders");
  });

  it("says so, with the way back to the order, when the order cannot be loaded", async () => {
    await open({ order: 500 });

    expect(await screen.findByRole("heading", { level: 1, name: F("unavailable.title") })).toBeInTheDocument();
    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: F("back") })).toHaveAttribute("href", "/orders/o-1");
  });

  it.each(["ORDER_NOT_PAID", "ORDER_NOT_DELIVERED", "RETURN_WINDOW_EXPIRED", "NOTHING_TO_RETURN"] as const)("says %s in words", async (why) => {
    await open({ eligibility: ELIGIBLE({ eligible: false, reason: why, deadline: null }) });

    expect(await screen.findByRole("heading", { level: 1, name: F("unavailable.title") })).toBeInTheDocument();
    expect(screen.getByText(msg(`private.returns.ineligible.${why}`))).toBeInTheDocument();
  });

  it("shows the BE's words when the eligibility could not be loaded", async () => {
    await open({ eligibility: "error" });

    expect(await screen.findByRole("heading", { level: 1, name: F("unavailable.title") })).toBeInTheDocument();
    expect(screen.getByText("no such order")).toBeInTheDocument();
  });

  it("uses the general sentence when it cannot be returned and no reason is given", async () => {
    await open({ eligibility: ELIGIBLE({ eligible: false, reason: null }) });

    expect(await screen.findByText(F("unavailable.description"))).toBeInTheDocument();
  });
});

describe("RET-8 choosing what to send back", () => {
  it("lists the order's lines with how many can still be returned, and the reasons to choose from", async () => {
    await open();
    await ready();

    expect(screen.getByRole("heading", { level: 2, name: F("items.title") })).toBeInTheDocument();
    expect(dressRow().getByText(`M · Red · ${msgf("private.returns.form.items.max", { max: 2, total: 3 })}`)).toBeInTheDocument();
    for (const key of ["WRONG_SIZE", "CHANGED_MIND", "DEFECTIVE", "WRONG_ITEM", "OTHER"]) expect(reason(key)).not.toBeChecked();
    expect(screen.getByRole("link", { name: F("back") })).toHaveAttribute("href", "/orders/o-1");
  });

  it("ticks a line with a quantity of one and lets the shopper change it within what can be returned", async () => {
    await open();
    await ready();

    await userEvent.click(tick("Dress"));
    expect(dressRow().getByText("1")).toBeInTheDocument();
    await userEvent.click(dressRow().getByRole("button", { name: F("items.increase") }));
    expect(dressRow().getByText("2")).toBeInTheDocument();
    expect(dressRow().getByRole("button", { name: F("items.increase") })).toBeDisabled();
    await userEvent.click(dressRow().getByRole("button", { name: F("items.decrease") }));

    expect(dressRow().getByText("1")).toBeInTheDocument();
    expect(dressRow().getByRole("button", { name: F("items.increase") })).toBeEnabled();
  });

  it("unticks the line when the quantity goes down to nothing", async () => {
    await open();
    await ready();
    await userEvent.click(tick("Dress"));

    await userEvent.click(dressRow().getByRole("button", { name: F("items.decrease") }));

    expect(tick("Dress")).not.toBeChecked();
    expect(dressRow().queryByRole("button", { name: F("items.decrease") })).not.toBeInTheDocument();
  });

  it("shows the note with a counter that follows what is typed and stops at 500", async () => {
    await open();
    await ready();
    const note = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(screen.getByText("0/500")).toBeInTheDocument();

    await userEvent.type(note, "too small");

    expect(screen.getByText("9/500")).toBeInTheDocument();
    expect(note).toHaveAttribute("maxlength", "500");
  });

  it("shows the policy from the shop's settings, with the deadline and the size hint", async () => {
    await open();
    await ready();

    expect(screen.getByRole("heading", { level: 2, name: F("policy.title") })).toBeInTheDocument();
    expect(screen.getByText(msgf("private.returns.form.policy.deadline", { date: dateText("2026-04-01T05:00:00.000Z", "dateTime") }))).toBeInTheDocument();
    expect(await screen.findByText("Returns within 7 days.")).toBeInTheDocument();
    expect(screen.getByText("Unworn")).toBeInTheDocument();
    expect(screen.getByText("Tags attached")).toBeInTheDocument();
    expect(screen.getByText(F("sizeHint"))).toBeInTheDocument();
  });

  it("speaks English in English", async () => {
    await open({}, { locale: "en" });

    expect(await screen.findByRole("heading", { level: 1, name: F("title", "en") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: F("submit", "en") })).toBeInTheDocument();
  });
});

describe("RET-8E choices that are not allowed, and a form sent too early", () => {
  it("locks a line that is already in a request and says so", async () => {
    await open();
    await ready();

    expect(tick("Skirt")).toBeDisabled();
    expect(row("Skirt").getByText(new RegExp(F("items.alreadyRequested")))).toBeInTheDocument();
  });

  it("locks a line the eligibility does not list at all", async () => {
    await open({ eligibility: ELIGIBLE({ items: [{ orderItemId: "oi-1", quantity: 3, returnableQuantity: 2 }] }) });
    await ready();

    expect(tick("Skirt")).toBeDisabled();
  });

  it("falls back to the number of days when the shop's policy cannot be loaded", async () => {
    await open({ shipping: "error" });
    await ready();

    expect(await screen.findByText("Đổi trả trong 7 ngày kể từ khi nhận hàng.")).toBeInTheDocument();
  });

  it("shows no deadline when the eligibility has none", async () => {
    await open({ eligibility: ELIGIBLE({ deadline: null }) });
    await ready();

    expect(screen.queryByText(/Còn hạn đến/)).not.toBeInTheDocument();
  });

  it("asks for a line and a reason when neither is chosen, and sends nothing", async () => {
    const { calls } = await open();
    await ready();

    await userEvent.click(submit());

    const alerts = screen.getAllByRole("alert");
    expect(alerts.map((a) => a.textContent)).toEqual([F("errors.items"), F("errors.reason")]);
    await wait(100);
    expect(calls.creates).toEqual([]);
  });

  it("asks only for the reason when a line is chosen", async () => {
    const { calls } = await open();
    await ready();
    await userEvent.click(tick("Dress"));

    await userEvent.click(submit());

    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toEqual([F("errors.reason")]);
    await wait(100);
    expect(calls.creates).toEqual([]);
  });

  it("asks only for a line when a reason is chosen", async () => {
    const { calls } = await open();
    await ready();
    await userEvent.click(reason("OTHER"));

    await userEvent.click(submit());

    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toEqual([F("errors.items")]);
    await wait(100);
    expect(calls.creates).toEqual([]);
  });

  it("takes an error away as soon as the shopper fixes that part", async () => {
    await open();
    await ready();
    await userEvent.click(submit());
    expect(screen.getAllByRole("alert")).toHaveLength(2);

    await userEvent.click(tick("Dress"));
    expect(screen.getAllByRole("alert").map((a) => a.textContent)).toEqual([F("errors.reason")]);
    await userEvent.click(reason("DEFECTIVE"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("RET-9 sending the request", () => {
  const fill = async () => {
    await userEvent.click(tick("Dress"));
    await userEvent.click(dressRow().getByRole("button", { name: F("items.increase") }));
    await userEvent.click(reason("WRONG_SIZE"));
  };

  it("sends the order, the reason, the trimmed note and only the lines chosen, then goes to the new request", async () => {
    const { calls } = await open();
    await ready();
    await fill();
    await userEvent.type(screen.getByRole("textbox"), "  Too small, sorry  ");

    await userEvent.click(submit());

    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/returns/r-new"));
    expect(calls.creates).toEqual([{ orderId: "o-1", reason: "WRONG_SIZE", note: "Too small, sorry", items: [{ orderItemId: "oi-1", quantity: 2 }] }]);
    expect(await screen.findByText(F("toast.created"))).toBeInTheDocument();
  });

  it("sends only the lines still chosen when a line was chosen and then given up", async () => {
    const two = eligibility({ deadline: "2026-04-01T05:00:00.000Z", items: [{ orderItemId: "oi-1", quantity: 3, returnableQuantity: 2 }, { orderItemId: "oi-2", quantity: 1, returnableQuantity: 1 }] });
    const { calls } = await open({ eligibility: two });
    await ready();
    await userEvent.click(tick("Dress"));
    await userEvent.click(tick("Skirt"));
    await userEvent.click(tick("Skirt"));
    await userEvent.click(reason("OTHER"));

    await userEvent.click(submit());

    await waitFor(() => expect(calls.creates).toHaveLength(1));
    expect(calls.creates[0].items).toEqual([{ orderItemId: "oi-1", quantity: 1 }]);
  });

  it("leaves the note out when it is empty or only spaces", async () => {
    const { calls } = await open();
    await ready();
    await fill();
    await userEvent.type(screen.getByRole("textbox"), "   ");

    await userEvent.click(submit());

    await waitFor(() => expect(calls.creates).toHaveLength(1));
    expect(calls.creates[0]).not.toHaveProperty("note");
  });

  it("goes to the list when the BE does not name the new request, and puts a strange id safely in the address", async () => {
    await open({ create: { data: { data: {} } } });
    await ready();
    await fill();

    await userEvent.click(submit());

    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/returns"));
  });

  it("puts a strange id safely in the address", async () => {
    await open({ create: { data: { data: { id: "r 1/2" } } } });
    await ready();
    await fill();

    await userEvent.click(submit());

    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/returns/r%201%2F2"));
  });
});

describe("RET-9E a request the BE does not accept", () => {
  const fill = async () => {
    await userEvent.click(tick("Dress"));
    await userEvent.click(reason("CHANGED_MIND"));
  };

  it("clears the choice and reads the eligibility again when what can be returned has changed (1802)", async () => {
    const { calls } = await open({ create: { status: 400, body: { message: "Nothing left to return", errorCode: 1802 } } });
    await ready();
    await fill();

    await userEvent.click(submit());

    expect(await screen.findByText("Nothing left to return")).toBeInTheDocument();
    await waitFor(() => expect(calls.eligibility).toHaveLength(2));
    await waitFor(() => expect(tick("Dress")).not.toBeChecked());
    expect(reason("CHANGED_MIND")).toBeChecked();
    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it("does the same, with the translated message, when the return window has closed (1803)", async () => {
    const { calls } = await open({ create: { status: 400, body: { message: "Window closed", errorCode: 1803 } } });
    await ready();
    await fill();

    await userEvent.click(submit());

    expect(await screen.findByText(msg("shared.errors.byCode.1803"))).toBeInTheDocument();
    await waitFor(() => expect(calls.eligibility).toHaveLength(2));
  });

  it("keeps the choice and says what the BE said for any other error", async () => {
    const { calls } = await open({ create: { status: 500, body: {} } });
    await ready();
    await fill();

    await userEvent.click(submit());

    expect(await screen.findByText(F("toast.failed"))).toBeInTheDocument();
    expect(tick("Dress")).toBeChecked();
    expect(calls.eligibility).toHaveLength(1);
    await waitFor(() => expect(submit()).toBeEnabled());
  });

  it("locks the button while the request is being sent, and a second press sends nothing", async () => {
    let release!: () => void;
    const slow = new Promise<void>((resolve) => (release = resolve));
    const { calls } = await open();
    server.use(
      http.post(`${API}/api/returns`, async ({ request }) => {
        calls.creates.push((await request.json()) as Record<string, unknown>);
        await slow;
        return HttpResponse.json({ data: { id: "r-new" } });
      })
    );
    await ready();
    await fill();

    await userEvent.click(submit());

    const busy = await screen.findByRole("button", { name: F("submitting") });
    expect(busy).toBeDisabled();
    await userEvent.click(busy);
    release();
    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledTimes(1));
    expect(calls.creates).toHaveLength(1);
  });
});
