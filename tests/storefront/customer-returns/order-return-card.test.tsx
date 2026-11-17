import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import OrderReturnCard from "@/src/app/[locale]/(private)/returns/_components/OrderReturnCard";
import ReturnProgress from "@/src/app/[locale]/(private)/returns/_components/ReturnProgress";
import ReturnStatusBadge from "@/src/app/[locale]/(private)/returns/_components/ReturnStatusBadge";
import { RETURN_STATUSES, type ReturnStatus } from "@/src/app/[locale]/(private)/returns/_common/types";
import { useReturnEligibility } from "@/src/app/[locale]/(private)/returns/_common/use-return-eligibility";
import { API } from "@/tests/_support/api";
import { eligibility, returnRequest } from "@/tests/_support/fixtures";
import { dateText, msg, msgf } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";
import { returnsBackend, type ReturnsBackend } from "./returns-kit";

/* The return card of an order, the status badge and progress bar, and the eligibility hook
   (specs/storefront/customer-returns.md, flows RET-10 to RET-12E). */

const C = (key: string) => msg(`private.returns.orderCard.${key}`);
const S = (status: string) => msg(`private.returns.status.${status}`);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function showCard(orderStatus: string, options: ReturnsBackend = {}) {
  const calls = returnsBackend(options);
  const view = await renderApp(<OrderReturnCard orderId="o-1" orderStatus={orderStatus} className="card" titleClassName="title" />, { as: "user" });
  return { calls, ...view };
}
const cardTitle = () => screen.findByRole("heading", { level: 2, name: C("title") });

describe("RET-10 the return card of an order", () => {
  it.each(["delivered", "completed"])("on a %s order shows the deadline and a button to ask for a return", async (status) => {
    const { calls } = await showCard(status, { eligibility: eligibility({ deadline: "2026-04-01T05:00:00.000Z" }) });

    const card = within((await cardTitle()).closest("section") as HTMLElement);
    expect(card.getByText(msgf("private.returns.orderCard.eligible", { date: dateText("2026-04-01T05:00:00.000Z", "dateTime") }))).toBeInTheDocument();
    expect(card.getByRole("link", { name: C("request") })).toHaveAttribute("href", "/returns/new?orderId=o-1");
    expect(calls.eligibility).toEqual(["o-1"]);
  });

  it("puts the order id safely in the link", async () => {
    returnsBackend({ eligibility: eligibility() });
    await renderApp(<OrderReturnCard orderId="o 1" orderStatus="delivered" className="card" titleClassName="title" />, { as: "user" });

    expect(await screen.findByRole("link", { name: C("request") })).toHaveAttribute("href", "/returns/new?orderId=o%201");
  });

  it("asks for the requests sent for this order, newest first", async () => {
    const { calls } = await showCard("delivered", { eligibility: eligibility() });

    await cardTitle();
    await waitFor(() => expect(calls.lists).toHaveLength(1));
    expect(calls.lists[0].get("orderId")).toBe("o-1");
    expect(calls.lists[0].get("sort")).toBe("-createdAt");
    expect(calls.lists[0].get("limit")).toBe("25");
  });

  it("lists the requests already sent, each a link with its state and day", async () => {
    await showCard("delivered", { eligibility: eligibility(), returns: [returnRequest({ id: "r 5", status: "APPROVED", createdAt: "2026-03-12T05:00:00.000Z" })] });

    const card = within((await cardTitle()).closest("section") as HTMLElement);
    const link = await card.findByRole("link", { name: new RegExp(S("APPROVED")) });
    expect(link).toHaveAttribute("href", "/returns/r%205");
    expect(within(link).getByText(dateText("2026-03-12T05:00:00.000Z", "short"))).toBeInTheDocument();
  });

  it("still shows the requests when the order can no longer be returned", async () => {
    await showCard("completed", { eligibility: eligibility({ eligible: false, reason: "NOTHING_TO_RETURN", deadline: null }), returns: [returnRequest()] });

    const card = within((await cardTitle()).closest("section") as HTMLElement);
    expect(await card.findByRole("link", { name: new RegExp(S("REQUESTED")) })).toBeInTheDocument();
    expect(card.getByText(msg("private.returns.ineligible.NOTHING_TO_RETURN"))).toBeInTheDocument();
  });

  it("says why it cannot be returned, not the deadline, when the BE still sends a deadline", async () => {
    await showCard("completed", { eligibility: eligibility({ eligible: false, reason: "RETURN_WINDOW_EXPIRED", deadline: "2026-01-01T00:00:00.000Z" }) });

    const card = within((await cardTitle()).closest("section") as HTMLElement);
    expect(card.getByText(msg("private.returns.ineligible.RETURN_WINDOW_EXPIRED"))).toBeInTheDocument();
    expect(card.queryByText(/Còn hạn đến/)).not.toBeInTheDocument();
  });

  it("offers the button even if the BE gave no deadline", async () => {
    await showCard("delivered", { eligibility: eligibility({ deadline: null }) });

    expect(await screen.findByRole("link", { name: C("request") })).toBeInTheDocument();
  });
});

describe("RET-10E when there is nothing to say, or why not", () => {
  it.each(["ORDER_NOT_PAID", "ORDER_NOT_DELIVERED", "RETURN_WINDOW_EXPIRED", "NOTHING_TO_RETURN"] as const)("says %s in words and offers no button", async (why) => {
    await showCard("delivered", { eligibility: eligibility({ eligible: false, reason: why, deadline: null }) });

    const card = within((await cardTitle()).closest("section") as HTMLElement);
    expect(card.getByText(msg(`private.returns.ineligible.${why}`))).toBeInTheDocument();
    expect(card.queryByRole("link", { name: C("request") })).not.toBeInTheDocument();
  });

  it.each(["pending", "confirmed", "shipping", "cancelled"])("on a %s order draws nothing and asks the BE nothing", async (status) => {
    const { calls, container } = await showCard(status, { eligibility: eligibility(), returns: [returnRequest()] });

    await wait(200);
    expect(container.querySelector("section")).toBeNull();
    expect(calls.eligibility).toEqual([]);
    expect(calls.lists).toEqual([]);
  });

  it("draws nothing when the eligibility cannot be had and no request was sent", async () => {
    const { calls, container } = await showCard("delivered", { eligibility: "error" });

    await waitFor(() => expect(calls.eligibility).toEqual(["o-1"]));
    await wait(200);
    expect(container.querySelector("section")).toBeNull();
  });

  it("shows the requests alone when the eligibility cannot be had", async () => {
    await showCard("delivered", { eligibility: "error", returns: [returnRequest({ id: "r-2" })] });

    const card = within((await cardTitle()).closest("section") as HTMLElement);
    expect(await card.findByRole("link", { name: new RegExp(S("REQUESTED")) })).toHaveAttribute("href", "/returns/r-2");
    expect(card.queryByRole("link", { name: C("request") })).not.toBeInTheDocument();
  });

  it("treats a list of requests that cannot be loaded as empty", async () => {
    await showCard("delivered", { eligibility: eligibility() });
    server.use(http.get(`${API}/api/returns`, () => HttpResponse.json({ message: "boom" }, { status: 500 })));

    const card = within((await cardTitle()).closest("section") as HTMLElement);
    expect(card.getByRole("link", { name: C("request") })).toBeInTheDocument();
  });

  it("draws nothing while the eligibility is still being read", async () => {
    let release!: () => void;
    const slow = new Promise<void>((resolve) => (release = resolve));
    returnsBackend({ returns: [returnRequest()] });
    server.use(http.get(`${API}/api/returns/eligibility/:id`, async () => (await slow, HttpResponse.json({ data: eligibility() }))));
    const { container } = await renderApp(<OrderReturnCard orderId="o-1" orderStatus="delivered" className="card" titleClassName="title" />, { as: "user" });

    await wait(100);
    expect(container.querySelector("section")).toBeNull();
    release();
  });
});

describe("RET-11 the badge and the progress bar", () => {
  it.each(RETURN_STATUSES)("the badge for %s has its own words", async (status) => {
    await renderApp(<ReturnStatusBadge status={status} />, { as: "user" });

    expect(screen.getByText(S(status))).toBeInTheDocument();
  });

  it("colours the badge by state", async () => {
    await renderApp(
      <>
        <ReturnStatusBadge status="REFUNDED" />
        <ReturnStatusBadge status="REJECTED" />
      </>,
      { as: "user" }
    );

    expect(screen.getByText(S("REFUNDED")).getAttribute("style")).toContain("var(--accent-sage)");
    expect(screen.getByText(S("REJECTED")).getAttribute("style")).toContain("var(--color-deep-rose)");
  });

  const stepsOf = () =>
    within(screen.getByRole("list", { name: msg("private.returns.status.progress") }))
      .getAllByRole("listitem")
      .map((li) => (li.getAttribute("aria-current") === "step" ? "active" : li.querySelector("svg") ? "done" : "todo"));

  it.each([
    ["REQUESTED", ["active", "todo", "todo", "todo"]],
    ["APPROVED", ["done", "active", "todo", "todo"]],
    ["RECEIVED", ["done", "done", "active", "todo"]],
    ["REFUNDED", ["done", "done", "done", "done"]],
  ])("a %s request is at %j on the bar", async (status, expected) => {
    await renderApp(<ReturnProgress status={status as ReturnStatus} />, { as: "user" });

    expect(stepsOf()).toEqual(expected);
  });

  it("names the four steps in order", async () => {
    await renderApp(<ReturnProgress status="APPROVED" />, { as: "user" });

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([S("REQUESTED"), S("APPROVED"), S("RECEIVED"), S("REFUNDED")]);
  });
});

describe("RET-11E states the bar and badge do not know", () => {
  it.each(["REJECTED", "CANCELLED"] as const)("a %s request has no bar", async (status) => {
    await renderApp(<ReturnProgress status={status} />, { as: "user" });

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows a state it does not know as written, in the colour of a request that is waiting", async () => {
    await renderApp(<ReturnStatusBadge status="ON_HOLD" />, { as: "user" });

    const badge = screen.getByText("ON_HOLD");
    expect(badge.getAttribute("style")).toContain("var(--accent-primary)");
  });
});

function Probe({ orderId, enabled }: { orderId: string | undefined; enabled: boolean }) {
  const { eligibility: found, isLoading, error, reload } = useReturnEligibility(orderId, enabled);
  return (
    <div>
      <p>{isLoading ? "loading" : "idle"}</p>
      <p>{found ? `eligible=${found.eligible} days=${found.returnWindowDays}` : "no data"}</p>
      <p>{error ? "has error" : "no error"}</p>
      <button onClick={() => reload()}>reload</button>
    </div>
  );
}

describe("RET-12 reading whether an order can be returned", () => {
  it("asks for the order, with its id made safe, and gives the answer", async () => {
    const calls = returnsBackend({ eligibility: eligibility({ returnWindowDays: 14 }) });

    await renderApp(<Probe orderId="o 1" enabled />, { as: "user" });

    expect(await screen.findByText("eligible=true days=14")).toBeInTheDocument();
    expect(calls.eligibility).toEqual(["o 1"]);
    expect(screen.getByText("idle")).toBeInTheDocument();
    expect(screen.getByText("no error")).toBeInTheDocument();
  });

  it("is loading until the answer comes", async () => {
    let release!: () => void;
    const slow = new Promise<void>((resolve) => (release = resolve));
    returnsBackend({ eligibility: eligibility() });
    server.use(http.get(`${API}/api/returns/eligibility/:id`, async () => (await slow, HttpResponse.json({ data: eligibility() }))));

    await renderApp(<Probe orderId="o-1" enabled />, { as: "user" });

    expect(screen.getByText("loading")).toBeInTheDocument();
    release();
    expect(await screen.findByText("idle")).toBeInTheDocument();
  });

  it("asks again when told to", async () => {
    const calls = returnsBackend({ eligibility: eligibility() });
    await renderApp(<Probe orderId="o-1" enabled />, { as: "user" });
    await screen.findByText("eligible=true days=7");

    await userEvent.click(screen.getByRole("button", { name: "reload" }));

    await waitFor(() => expect(calls.eligibility).toHaveLength(2));
  });
});

describe("RET-12E when it is off, has no order, or fails", () => {
  it("asks nothing and is not loading when switched off", async () => {
    const calls = returnsBackend({ eligibility: eligibility() });

    await renderApp(<Probe orderId="o-1" enabled={false} />, { as: "user" });
    await wait(150);

    expect(calls.eligibility).toEqual([]);
    expect(screen.getByText("idle")).toBeInTheDocument();
    expect(screen.getByText("no data")).toBeInTheDocument();
  });

  it("asks nothing when there is no order id", async () => {
    const calls = returnsBackend({ eligibility: eligibility() });

    await renderApp(<Probe orderId={undefined} enabled />, { as: "user" });
    await wait(150);

    expect(calls.eligibility).toEqual([]);
    expect(screen.getByText("idle")).toBeInTheDocument();
  });

  it("keeps the error, and stops loading, when the BE refuses", async () => {
    returnsBackend({ eligibility: "error" });

    await renderApp(<Probe orderId="o-1" enabled />, { as: "user" });

    expect(await screen.findByText("has error")).toBeInTheDocument();
    expect(screen.getByText("idle")).toBeInTheDocument();
    expect(screen.getByText("no data")).toBeInTheDocument();
  });

  it("forgets an earlier error once asking again works", async () => {
    returnsBackend({ eligibility: "error" });
    await renderApp(<Probe orderId="o-1" enabled />, { as: "user" });
    await screen.findByText("has error");
    server.use(http.get(`${API}/api/returns/eligibility/:id`, () => HttpResponse.json({ data: eligibility() })));

    await userEvent.click(screen.getByRole("button", { name: "reload" }));

    expect(await screen.findByText("eligible=true days=7")).toBeInTheDocument();
    expect(screen.getByText("no error")).toBeInTheDocument();
  });

  it("keeps the last answer, and shows the error, when asking again fails", async () => {
    returnsBackend({ eligibility: eligibility() });
    await renderApp(<Probe orderId="o-1" enabled />, { as: "user" });
    await screen.findByText("eligible=true days=7");
    server.use(http.get(`${API}/api/returns/eligibility/:id`, () => HttpResponse.json({ message: "boom" }, { status: 500 })));

    await userEvent.click(screen.getByRole("button", { name: "reload" }));

    expect(await screen.findByText("has error")).toBeInTheDocument();
    expect(screen.getByText("eligible=true days=7")).toBeInTheDocument();
  });
});
