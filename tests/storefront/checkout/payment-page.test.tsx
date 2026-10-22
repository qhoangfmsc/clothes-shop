import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PaymentContent from "@/src/app/[locale]/(private)/checkout/payment/[orderId]/PaymentContent";
import { API } from "@/tests/_support/api";
import { paymentSession } from "@/tests/_support/fixtures";
import { msg, msgf } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";
import { paymentsBackend } from "./checkout-kit";

/* The VietQR payment page (specs/storefront/checkout.md, flows CHK-13 to CHK-14E). */

const P = (key: string, locale: "vi" | "en" = "vi") => msg(`private.checkout.payment.${key}`, locale);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  navigation.params = { orderId: "o1" };
});

async function open(options: { as?: "guest" | "user"; locale?: "vi" | "en"; waitForAuth?: boolean } = {}) {
  const bend = paymentsBackend();
  const show = async () => renderApp(<PaymentContent />, { as: options.as ?? "user", locale: options.locale, waitForAuth: options.waitForAuth });
  return { bend, show };
}

describe("CHK-13 waiting for the transfer", () => {
  it("shows the QR, the amount, the time left, and the bank details to transfer to", async () => {
    const { show } = await open();
    await show();

    expect(await screen.findByRole("heading", { level: 1, name: P("title") })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: P("qrAlt") })).toHaveAttribute("src", "https://img.vietqr.io/image/qr.png");
    expect(screen.getByText(P("amount"))).toBeInTheDocument();
    expect(screen.getByText("380.000 VNĐ")).toBeInTheDocument();
    expect(await screen.findByText(new RegExp(`^${msg("private.checkout.payment.countdown.remaining").split("{")[0]}\\d+:\\d{2}$`))).toBeInTheDocument();
    for (const [labelKey, value] of [["bank", "Vietcombank"], ["accountName", "DOOVAN CO"], ["accountNumber", "0123456789"], ["transferContent", "DOOVAN O1 AAA111"]]) {
      const row = screen.getByText(P(labelKey)).parentElement as HTMLElement;
      expect(within(row).getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByText(P("waiting"))).toBeInTheDocument();
    expect(screen.getByText(P("guide.step1"))).toBeInTheDocument();
    expect(screen.getByText(P("guide.mobileHint"))).toBeInTheDocument();
    expect(screen.getByText("o1")).toBeInTheDocument();
    expect(screen.queryByText(/Mã trước đó đã hết hạn/)).not.toBeInTheDocument();
  });

  it("counts down in minutes and seconds, two digits each", async () => {
    const { bend, show } = await open();
    bend.qr = () => paymentSession({ expiresAt: new Date(Date.now() + 62_000).toISOString() });
    await show();

    expect(await screen.findByText(new RegExp(`^${msg("private.checkout.payment.countdown.remaining").split("{")[0]}01:0[0-2]$`))).toBeInTheDocument();
  });

  it("says the time is over, not 00:00, when the code's time has already passed (the BE decides on the next check)", async () => {
    const { bend, show } = await open();
    bend.qr = () => paymentSession({ expiresAt: new Date(Date.now() - 1000).toISOString() });
    await show();

    expect(await screen.findByText(P("countdown.ended"))).toBeInTheDocument();
    expect(screen.queryByText(/^Mã còn hiệu lực/)).not.toBeInTheDocument();
  });

  it("shows no countdown when the session has no deadline", async () => {
    const { bend, show } = await open();
    bend.qr = () => paymentSession({ expiresAt: null });
    await show();

    await screen.findByRole("heading", { level: 1, name: P("title") });
    expect(screen.queryByText(/^Mã còn hiệu lực/)).not.toBeInTheDocument();
    expect(screen.queryByText(P("countdown.ended"))).not.toBeInTheDocument();
  });

  it("shows the amount in dollars in English", async () => {
    const { show } = await open({ locale: "en" });
    await show();

    expect(await screen.findByText("$14.61")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: P("title", "en") })).toBeInTheDocument();
  });

  it("copies the account number and the transfer content, and says so", async () => {
    const user = userEvent.setup();
    const { show } = await open();
    await show();
    await screen.findByRole("heading", { level: 1, name: P("title") });

    await user.click(screen.getByRole("button", { name: msgf("shared.feedback.copy.aria", { field: P("accountNumber") }) }));
    expect(await navigator.clipboard.readText()).toBe("0123456789");
    await user.click(screen.getByRole("button", { name: msgf("shared.feedback.copy.aria", { field: P("transferContent") }) }));

    expect(await navigator.clipboard.readText()).toBe("DOOVAN O1 AAA111");
    expect((await screen.findAllByText(msg("shared.feedback.copy.copied"))).length).toBeGreaterThan(0);
  });

  it("offers a copy button for those two rows only", async () => {
    const { show } = await open();
    await show();
    await screen.findByRole("heading", { level: 1, name: P("title") });

    expect(screen.getAllByRole("button", { name: new RegExp(msg("shared.feedback.copy.aria").split("{")[0]) })).toHaveLength(2);
  });
});

describe("CHK-13E before the QR, and QR problems", () => {
  it("shows the sign-in wall to a visitor and asks the BE for nothing", async () => {
    const { bend, show } = await open({ as: "guest" });
    await show();

    expect(screen.getByRole("heading", { name: msg("shared.feedback.unauthenticated.title") })).toBeInTheDocument();
    await wait(150);
    expect(bend.qrCalls).toBe(0);
    expect(screen.queryByRole("img", { name: P("qrAlt") })).not.toBeInTheDocument();
  });

  it("shows only a placeholder while the session or the QR is being worked out", async () => {
    let release!: () => void;
    const open_ = new Promise<void>((resolve) => (release = resolve));
    const { show } = await open();
    server.use(http.post(`${API}/api/payments/qr`, async () => (await open_, HttpResponse.json({ data: paymentSession() }))));
    await show();

    expect(screen.getByLabelText(P("loading"))).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    release();

    expect(await screen.findByRole("heading", { level: 1, name: P("title") })).toBeInTheDocument();
    expect(screen.queryByLabelText(P("loading"))).not.toBeInTheDocument();
  });

  it("does not draw a QR picture from an address that is not safe, but still shows the details", async () => {
    const { bend, show } = await open();
    bend.qr = () => paymentSession({ qrUrl: "javascript:alert(1)" });
    await show();

    expect(await screen.findByText("0123456789")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: P("qrAlt") })).not.toBeInTheDocument();
  });

  it("warns when the connection to the BE is lost while waiting, and takes the warning away when it is back", async () => {
    const { bend, show } = await open();
    await show();
    await screen.findByRole("heading", { level: 1, name: P("title") });
    bend.status = () => HttpResponse.json({ message: "boom" }, { status: 500 }) as unknown as Response;

    expect(await screen.findByRole("alert", {}, { timeout: 6000 })).toHaveTextContent(P("connectionLost"));
    bend.status = () => ({ status: "PENDING" });

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument(), { timeout: 6000 });
  }, 15_000);

  it("copying that fails says so", async () => {
    const user = userEvent.setup();
    const { show } = await open();
    await show();
    await screen.findByRole("heading", { level: 1, name: P("title") });
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));

    await user.click(screen.getByRole("button", { name: msgf("shared.feedback.copy.aria", { field: P("accountNumber") }) }));

    expect(await screen.findByText(msg("shared.feedback.copy.failed"))).toBeInTheDocument();
  });
});

describe("CHK-14 the other screens", () => {
  it("shows the payment as received: thanks, the amount paid, the code, and a way to the order", async () => {
    const { bend, show } = await open();
    bend.qr = () => paymentSession({ status: "PAID" });
    await show();

    expect(await screen.findByRole("heading", { level: 1, name: P("paid.title") })).toBeInTheDocument();
    expect(screen.getByText(P("paid.description"))).toBeInTheDocument();
    expect(screen.getByText(P("paid.amount"))).toBeInTheDocument();
    expect(screen.getByText("380.000 VNĐ")).toBeInTheDocument();
    expect(screen.getByText("DOOVAN O1 AAA111")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(P("paid.viewOrder")) })).toHaveAttribute("href", "/orders/o1");
    expect(screen.getByRole("link", { name: P("continue") })).toHaveAttribute("href", "/shop");
    expect(screen.queryByRole("img", { name: P("qrAlt") })).not.toBeInTheDocument();
  });

  it("shows the paid screen without the code when the BE refuses a QR for an order already paid", async () => {
    const { bend, show } = await open();
    bend.qr = () => HttpResponse.json({ message: "already paid" }, { status: 409 }) as unknown as Response;
    bend.status = () => ({ status: "PAID", amountVnd: 380_000, amountUsd: 14.61 });
    await show();

    expect(await screen.findByRole("heading", { level: 1, name: P("paid.title") })).toBeInTheDocument();
    expect(screen.getByText("380.000 VNĐ")).toBeInTheDocument();
    expect(screen.queryByText("DOOVAN O1 AAA111")).not.toBeInTheDocument();
  });

  it("says the code expired, warns not to pay it, shows it with the advice to contact the shop, and offers a new one", async () => {
    const { bend, show } = await open();
    bend.qr = () => paymentSession({ status: "EXPIRED" });
    await show();

    expect(await screen.findByRole("heading", { level: 1, name: P("expired.title") })).toBeInTheDocument();
    expect(screen.getByText(P("expired.description"))).toBeInTheDocument();
    expect(screen.getByText("380.000 VNĐ")).toBeInTheDocument();
    expect(screen.getByText("DOOVAN O1 AAA111")).toBeInTheDocument();
    expect(screen.getByText(P("expired.oldCodeHint"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: P("expired.recreate") })).toBeEnabled();
    expect(screen.getByRole("link", { name: P("viewOrder") })).toHaveAttribute("href", "/orders/o1");
  });

  it("makes a new QR from the expired screen, shows it, and lists the old code", async () => {
    const { bend, show } = await open();
    bend.qr = () => paymentSession({ status: "EXPIRED", transferContent: "CODE-OLD" });
    await show();
    const recreate = await screen.findByRole("button", { name: P("expired.recreate") });
    bend.qr = () => paymentSession({ transferContent: "CODE-NEW" });
    bend.status = () => ({ status: "PENDING" });

    await userEvent.click(recreate);

    await waitFor(() => expect(screen.getByText("CODE-NEW")).toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 1, name: P("title") })).toBeInTheDocument();
    expect(screen.getByText(msgf("private.checkout.payment.previousCodes", { codes: "CODE-OLD" }))).toBeInTheDocument();
  });

  it("shows the cancelled screen with the amount and ways out", async () => {
    const { bend, show } = await open();
    bend.qr = () => paymentSession({ status: "CANCELLED" });
    await show();

    expect(await screen.findByRole("heading", { level: 1, name: P("cancelled.title") })).toBeInTheDocument();
    expect(screen.getByText(P("cancelled.description"))).toBeInTheDocument();
    expect(screen.getByText("380.000 VNĐ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: P("viewOrder") })).toHaveAttribute("href", "/orders/o1");
    expect(screen.getByRole("link", { name: P("continue") })).toHaveAttribute("href", "/shop");
  });

  it("shows the error screen, with a way to try again that works", async () => {
    const { bend, show } = await open();
    bend.qr = () => HttpResponse.json({ message: "Service down" }, { status: 503 }) as unknown as Response;
    await show();

    expect(await screen.findByRole("heading", { level: 1, name: P("error.title") })).toBeInTheDocument();
    expect(screen.getByText("Service down")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: P("viewOrder") })).toHaveAttribute("href", "/orders/o1");
    bend.qr = () => paymentSession();

    await userEvent.click(screen.getByRole("button", { name: P("error.retry") }));

    expect(await screen.findByRole("heading", { level: 1, name: P("title") })).toBeInTheDocument();
  });
});

describe("CHK-14E screens for things that went wrong", () => {
  it("shows the translated message for a BE error code on the error screen", async () => {
    const { bend, show } = await open();
    bend.qr = () => HttpResponse.json({ message: "Product not purchasable", errorCode: 1303 }, { status: 400 }) as unknown as Response;
    await show();

    expect(await screen.findByText(msg("shared.errors.byCode.1303"))).toBeInTheDocument();
  });

  it("when a new QR cannot be made, shows what went wrong and leaves the button ready for another try", async () => {
    const { bend, show } = await open();
    bend.qr = () => paymentSession({ status: "EXPIRED" });
    await show();
    const button = await screen.findByRole("button", { name: P("expired.recreate") });
    bend.qr = () => HttpResponse.json({ message: "Try again later" }, { status: 503 }) as unknown as Response;

    await userEvent.click(button);

    expect(await screen.findByText("Try again later")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: P("expired.title") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: P("expired.recreate") })).toBeEnabled();
  });

  it("locks the 'new QR' button while it is being made", async () => {
    const { bend, show } = await open();
    bend.qr = () => paymentSession({ status: "EXPIRED" });
    await show();
    const button = await screen.findByRole("button", { name: P("expired.recreate") });
    let release!: () => void;
    const slow = new Promise<void>((resolve) => (release = resolve));
    server.use(http.post(`${API}/api/payments/qr`, async () => (await slow, HttpResponse.json({ data: paymentSession({ transferContent: "NEW" }) }))));

    await userEvent.click(button);

    expect(await screen.findByRole("button", { name: P("expired.recreating") })).toBeDisabled();
    release();
    expect(await screen.findByText("NEW")).toBeInTheDocument();
  });
});
