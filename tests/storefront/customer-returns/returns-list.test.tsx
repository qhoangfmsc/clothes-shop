import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import ReturnsContent from "@/src/app/[locale]/(private)/returns/ReturnsContent";
import { API } from "@/tests/_support/api";
import { returnRequest } from "@/tests/_support/fixtures";
import { dateText, msg, msgf } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";
import { returnsBackend, type ReturnsBackend } from "./returns-kit";

/* The list of my return requests (specs/storefront/customer-returns.md, flows RET-1 to RET-3E). */

const L = (key: string, locale: "vi" | "en" = "vi") => msg(`private.returns.list.${key}`, locale);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function open(options: ReturnsBackend = {}, view: { as?: "guest" | "user"; locale?: "vi" | "en"; waitForAuth?: boolean } = {}) {
  const calls = returnsBackend(options);
  const result = await renderApp(<ReturnsContent />, { as: view.as ?? "user", locale: view.locale, waitForAuth: view.waitForAuth });
  return { calls, ...result };
}

const cards = () => screen.getAllByRole("link").filter((a) => /^\/returns\/r-/.test(a.getAttribute("href") ?? ""));

describe("RET-1 a visitor who is not signed in", () => {
  it("sees the sign-in wall and nothing is asked of the BE", async () => {
    const { calls } = await open({ pages: [{ data: [returnRequest()], total: 1 }] }, { as: "guest" });

    expect(screen.getByRole("heading", { name: msg("shared.feedback.unauthenticated.title") })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: L("title") })).not.toBeInTheDocument();
    await wait(150);
    expect(calls.lists).toEqual([]);
  });
});

describe("RET-1E while the session is being worked out", () => {
  it("shows only a placeholder, then the list", async () => {
    const { calls } = await open({ pages: [{ data: [returnRequest()], total: 1 }] }, { waitForAuth: false });

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(calls.lists).toEqual([]);
    expect(await screen.findByRole("heading", { level: 1, name: L("title") })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /r-1|Dress/ })).toBeInTheDocument();
  });
});

describe("RET-2 my return requests", () => {
  it("asks for the newest first, 25 at a time, and shows the title and the way back to the orders", async () => {
    const { calls } = await open({ pages: [{ data: [returnRequest()], total: 1 }] });

    await screen.findByText("Dress", { exact: false });
    expect(calls.lists).toHaveLength(1);
    expect(calls.lists[0].get("sort")).toBe("-createdAt");
    expect(calls.lists[0].get("limit")).toBe("25");
    expect(calls.lists[0].has("page")).toBe(false);
    expect(calls.lists[0].has("orderId")).toBe(false);
    expect(screen.getByRole("heading", { level: 1, name: L("title") })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: L("back") })).toHaveAttribute("href", "/orders");
  });

  it("narrows the list to one order, and the way back goes to that order, when the address names it", async () => {
    navigation.searchParams = new URLSearchParams("orderId=o 5");
    const { calls } = await open({ pages: [{ data: [returnRequest({ orderId: "o 5" })], total: 1 }] });

    await screen.findByText("Dress", { exact: false });
    expect(calls.lists[0].get("orderId")).toBe("o 5");
    expect(screen.getByRole("link", { name: L("backToOrder") })).toHaveAttribute("href", "/orders/o%205");
  });

  it("shows each request as one link with status, day, lines, order and reason, and the refund when there is one", async () => {
    await open({
      pages: [
        {
          data: [
            returnRequest({ id: "r-7", status: "REFUNDED", reason: "DEFECTIVE", orderId: "o-4", createdAt: "2026-03-12T05:00:00.000Z", refund: { amountVnd: 350_000, amountUsd: 13.46, status: "COMPLETED", bankReference: "B", processedAt: null } }),
            returnRequest({ id: "r-8", status: "REQUESTED" }),
          ],
          total: 2,
        },
      ],
    });

    const list = (await screen.findAllByRole("listitem")).filter((li) => li.querySelector("a[href^='/returns/r-']"));
    const first = within(list[0].querySelector("a") as HTMLElement);
    expect(list[0].querySelector("a")).toHaveAttribute("href", "/returns/r-7");
    expect(first.getByText(msg("private.returns.status.REFUNDED"))).toBeInTheDocument();
    expect(first.getByText(dateText("2026-03-12T05:00:00.000Z", "short"))).toBeInTheDocument();
    expect(first.getByText(/Dress/)).toHaveTextContent("Dress · M · Red · SL 1");
    expect(first.getByText(`${msgf("private.returns.list.card.orderNumber", { id: "o-4" })} · ${msg("private.returns.reason.DEFECTIVE")}`)).toBeInTheDocument();
    expect(first.getByText("350.000 VNĐ")).toBeInTheDocument();
    const second = within(list[1].querySelector("a") as HTMLElement);
    expect(second.getByText(msg("private.returns.status.REQUESTED"))).toBeInTheDocument();
    expect(second.queryByText(/VNĐ/)).not.toBeInTheDocument();
  });

  it("puts a request id with odd characters safely in the link", async () => {
    await open({ pages: [{ data: [returnRequest({ id: "r 5/x" })], total: 1 }] });

    const card = (await screen.findByText(/Dress/)).closest("a");
    expect(card).toHaveAttribute("href", "/returns/r%205%2Fx");
  });

  it("names two lines and counts the rest", async () => {
    const items = ["Dress", "Skirt", "Coat", "Scarf"].map((name, i) => ({ ...returnRequest().items[0], id: `ri-${i}`, productName: name }));
    await open({ pages: [{ data: [returnRequest({ items })], total: 1 }] });

    const card = within((await screen.findByText(/Dress/)).closest("a") as HTMLElement);
    expect(card.getByText(/Skirt/)).toBeInTheDocument();
    expect(card.queryByText(/Coat/)).not.toBeInTheDocument();
    expect(card.getByText(msgf("private.returns.list.card.more", { count: 2 }))).toBeInTheDocument();
  });

  it("shows no 'more' note for two lines", async () => {
    const items = ["Dress", "Skirt"].map((name, i) => ({ ...returnRequest().items[0], id: `ri-${i}`, productName: name }));
    await open({ pages: [{ data: [returnRequest({ items })], total: 1 }] });

    const card = within((await screen.findByText(/Dress/)).closest("a") as HTMLElement);
    expect(card.queryByText(/\+\d/)).not.toBeInTheDocument();
  });

  it("shows dollars and English words in English", async () => {
    await open({ pages: [{ data: [returnRequest({ status: "REFUNDED", refund: { amountVnd: 350_000, amountUsd: 13.46, status: "COMPLETED", bankReference: null, processedAt: null } })], total: 1 }] }, { locale: "en" });

    const card = within((await screen.findByText(/Dress/)).closest("a") as HTMLElement);
    expect(card.getByText("$13.46")).toBeInTheDocument();
    expect(card.getByText(msg("private.returns.status.REFUNDED", "en"))).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: L("title", "en") })).toBeInTheDocument();
  });
});

describe("RET-2E nothing to show, or a list that cannot be loaded", () => {
  it("says there are no requests and points to the orders", async () => {
    await open({ pages: [{ data: [], total: 0 }] });

    expect(await screen.findByRole("heading", { level: 2, name: L("empty.title") })).toBeInTheDocument();
    expect(screen.getByText(L("empty.description"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: L("empty.cta") })).toHaveAttribute("href", "/orders");
    expect(screen.queryByRole("button", { name: L("loadMore") })).not.toBeInTheDocument();
  });

  it("tells the shopper the list could not be loaded, and does not claim there are no requests", async () => {
    await open({ pages: [], failPage: 1 });

    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(await screen.findByText(L("error.title"))).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: L("empty.title") })).not.toBeInTheDocument();
  });

  it("loads the first page again on 'try again', and the error goes away", async () => {
    const { calls } = await open({ pages: [], failPage: 1 });
    await screen.findByText(L("error.title"));
    server.use(http.get(`${API}/api/returns`, () => HttpResponse.json({ data: [returnRequest({ id: "r-9" })], total: 1 })));

    await userEvent.click(screen.getByRole("button", { name: L("error.retry") }));

    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(screen.queryByText(L("error.title"))).not.toBeInTheDocument();
    expect(calls.lists).toHaveLength(1);
  });

  it("shows the error again, not the empty page, when 'try again' fails too", async () => {
    await open({ pages: [], failPage: 1 });
    await screen.findByText(L("error.title"));

    await userEvent.click(screen.getByRole("button", { name: L("error.retry") }));

    await waitFor(() => expect(screen.getByRole("button", { name: L("error.retry") })).toBeEnabled());
    expect(screen.getByText(L("error.title"))).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: L("empty.title") })).not.toBeInTheDocument();
  });

  it("speaks English in English", async () => {
    await open({ pages: [], failPage: 1 }, { locale: "en" });

    expect(await screen.findByText(L("error.title", "en"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: L("error.retry", "en") })).toBeInTheDocument();
  });
});

describe("RET-3 more requests", () => {
  const first = [returnRequest({ id: "r-1" }), returnRequest({ id: "r-2" })];

  it("offers 'more' while there are requests left, adds the next page at the end and hides it when all are shown", async () => {
    const { calls } = await open({ pages: [{ data: first, total: 3 }, { data: [returnRequest({ id: "r-3" })], total: 3 }] });
    await screen.findAllByText(/Dress/);

    await userEvent.click(screen.getByRole("button", { name: L("loadMore") }));

    await waitFor(() => expect(cards().map((a) => a.getAttribute("href"))).toEqual(["/returns/r-1", "/returns/r-2", "/returns/r-3"]));
    expect(calls.lists[1].get("page")).toBe("2");
    expect(screen.queryByRole("button", { name: L("loadMore") })).not.toBeInTheDocument();
  });

  it("is not offered when everything fits on the first page", async () => {
    await open({ pages: [{ data: first, total: 2 }] });
    await screen.findAllByText(/Dress/);

    expect(screen.queryByRole("button", { name: L("loadMore") })).not.toBeInTheDocument();
  });

  it("locks the button and says it is loading while the next page comes", async () => {
    let release!: () => void;
    const slow = new Promise<void>((resolve) => (release = resolve));
    await open({ pages: [{ data: first, total: 3 }] });
    await screen.findAllByText(/Dress/);
    server.use(
      http.get(`${API}/api/returns`, async () => {
        await slow;
        return HttpResponse.json({ data: [returnRequest({ id: "r-3" })], total: 3 });
      })
    );

    await userEvent.click(screen.getByRole("button", { name: L("loadMore") }));

    expect(await screen.findByRole("button", { name: L("loadingMore") })).toBeDisabled();
    release();
    await waitFor(() => expect(cards()).toHaveLength(3));
  });
});

describe("RET-3E the next page cannot be loaded", () => {
  it("says so, keeps the requests already shown, and leaves the button to try again", async () => {
    await open({ pages: [{ data: [returnRequest({ id: "r-1" }), returnRequest({ id: "r-2" })], total: 3 }], failPage: 2 });
    await screen.findAllByText(/Dress/);

    await userEvent.click(screen.getByRole("button", { name: L("loadMore") }));

    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(cards()).toHaveLength(2);
    expect(screen.queryByText(L("error.title"))).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: L("loadMore") })).toBeEnabled());
  });
});
