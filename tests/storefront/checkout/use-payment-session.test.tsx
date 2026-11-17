import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePaymentSession } from "@/src/app/[locale]/(private)/checkout/_common/use-payment-session";
import { API } from "@/tests/_support/api";
import { paymentSession } from "@/tests/_support/fixtures";
import { signInAs } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { paymentsBackend } from "./checkout-kit";

/* The payment session hook: QR, polling, expiry (specs/storefront/checkout.md, flows CHK-11 to CHK-12E).
   Time is faked (setTimeout and Date) so three-second polls take no real time. */

const NOW = new Date("2026-06-01T10:00:00.000Z");
const fakeBackend = paymentsBackend;

/** Moves the fake clock and lets the answers that were waiting for it arrive. */
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
/** Lets pending requests finish without moving the clock far. */
const settle = async () => {
  for (let i = 0; i < 5; i++) await tick(20);
};

const mount = async (orderId = "o1", enabled = true) => {
  const view = renderHook(() => usePaymentSession(orderId, enabled));
  await settle();
  return view;
};

const gate = () => {
  let release!: () => void;
  const open = new Promise<void>((resolve) => (release = resolve));
  return { open, release };
};

beforeEach(() => {
  signInAs("user");
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
});

describe("CHK-11 asking for the QR and waiting for the transfer", () => {
  it("asks for the QR once, with the order id, and waits for the transfer", async () => {
    const bend = fakeBackend();
    let body: unknown;
    server.use(
      http.post(`${API}/api/payments/qr`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: paymentSession() });
      })
    );

    const { result } = await mount();

    expect(body).toEqual({ orderId: "o1" });
    expect(result.current.phase).toBe("pending");
    expect(result.current.session?.transferContent).toBe("DOOVAN O1 AAA111");
    expect(result.current.amount).toEqual({ amountVnd: 380_000, amountUsd: 14.61 });
    expect(bend.statusCalls).toBe(0);
  });

  it("does nothing until it is switched on", async () => {
    const bend = fakeBackend();

    const { result, rerender } = renderHook(({ on }) => usePaymentSession("o1", on), { initialProps: { on: false } });
    await tick(10_000);

    expect(result.current.phase).toBe("loading");
    expect(bend.qrCalls).toBe(0);
    rerender({ on: true });
    await settle();
    expect(result.current.phase).toBe("pending");
    expect(bend.qrCalls).toBe(1);
  });

  it("asks whether the transfer arrived every three seconds, not sooner", async () => {
    const bend = fakeBackend();
    await mount();

    await tick(2900);
    expect(bend.statusCalls).toBe(0);
    await tick(200);
    expect(bend.statusCalls).toBe(1);
    await tick(3000);
    expect(bend.statusCalls).toBe(2);
    await tick(3000);
    expect(bend.statusCalls).toBe(3);
  });

  it("puts the order id into the status address safely", async () => {
    const bend = fakeBackend();
    await mount("a/b c");

    await tick(3100);

    expect(bend.statusUrls).toEqual(["/api/payments/a%2Fb%20c/status"]);
  });

  it("starts the next question only after the last one was answered", async () => {
    const bend = fakeBackend();
    const slow = gate();
    bend.status = () => ({ status: "PENDING" });
    server.use(
      http.get(`${API}/api/payments/:orderId/status`, async () => {
        bend.statusCalls += 1;
        await slow.open;
        return HttpResponse.json({ data: { status: "PENDING" } });
      })
    );
    await mount();

    await tick(3100);
    await tick(12_000);
    expect(bend.statusCalls).toBe(1);
    slow.release();
    await settle();
    await tick(3100);

    expect(bend.statusCalls).toBe(2);
  });

  it.each([
    ["PAID", "paid"],
    ["EXPIRED", "expired"],
    ["CANCELLED", "cancelled"],
    ["paid", "paid"],
  ] as const)("goes to %s → %s and stops asking", async (status, phase) => {
    const bend = fakeBackend();
    const { result } = await mount();
    bend.status = () => ({ status, amountVnd: 380_000, amountUsd: 14.61 });

    await tick(3100);
    const asked = bend.statusCalls;
    await tick(30_000);

    expect(result.current.phase).toBe(phase);
    expect(bend.statusCalls).toBe(asked);
  });

  it("keeps the amount the BE last reported, from the QR and from each answer", async () => {
    const bend = fakeBackend();
    const { result } = await mount();
    bend.status = () => ({ status: "PENDING", amountVnd: 400_000, amountUsd: 15.38 });

    await tick(3100);

    expect(result.current.amount).toEqual({ amountVnd: 400_000, amountUsd: 15.38 });
  });

  it("stops asking when the page is left", async () => {
    const bend = fakeBackend();
    const { unmount } = await mount();
    await tick(3100);
    const asked = bend.statusCalls;

    unmount();
    await tick(30_000);

    expect(bend.statusCalls).toBe(asked);
  });
});

describe("CHK-11E when the QR or the answers go wrong", () => {
  const refuseQr = () => HttpResponse.json({ message: "No QR for this order", errorCode: 1999 }, { status: 409 });

  it.each([
    ["PAID", "paid"],
    ["CANCELLED", "cancelled"],
  ] as const)("shows the order as %s when the BE will not make a QR and the order is already %s", async (status, phase) => {
    const bend = fakeBackend();
    bend.qr = refuseQr;
    bend.status = () => ({ status, amountVnd: 380_000, amountUsd: 14.61 });

    const { result } = await mount();

    expect(result.current.phase).toBe(phase);
    expect(result.current.amount).toEqual({ amountVnd: 380_000, amountUsd: 14.61 });
  });

  it.each([
    ["still waiting", () => ({ status: "PENDING" })],
    ["expired", () => ({ status: "EXPIRED" })],
    ["not answering", () => HttpResponse.json({ message: "boom" }, { status: 500 })],
  ])("is an error, with the QR request's error, when the BE will not make a QR and the order is %s", async (_what, status) => {
    const bend = fakeBackend();
    bend.qr = refuseQr;
    bend.status = status as typeof bend.status;

    const { result } = await mount();

    expect(result.current.phase).toBe("error");
    expect(result.current.error).toMatchObject({ message: "No QR for this order", errorCode: 1999 });
  });

  it("is an error when the QR answer has no session", async () => {
    const bend = fakeBackend();
    bend.qr = () => HttpResponse.json({}) as unknown as Response;
    bend.status = () => ({ status: "PENDING" });

    const { result } = await mount();

    expect(result.current.phase).toBe("error");
  });

  it("reports a lost connection on a network failure, keeps asking, and clears the warning when an answer comes", async () => {
    const bend = fakeBackend();
    const { result } = await mount();
    bend.status = () => HttpResponse.error() as unknown as Response;

    await tick(3100);
    expect(result.current.connectionLost).toBe(true);
    expect(result.current.phase).toBe("pending");
    await tick(3000);
    const whileDown = bend.statusCalls;
    expect(whileDown).toBeGreaterThanOrEqual(2);

    bend.status = () => ({ status: "PENDING" });
    await tick(3100);

    expect(result.current.connectionLost).toBe(false);
    expect(result.current.phase).toBe("pending");
  });

  it("treats a server error (500) as a lost connection, not a failure", async () => {
    const bend = fakeBackend();
    const { result } = await mount();
    bend.status = () => HttpResponse.json({ message: "boom" }, { status: 500 }) as unknown as Response;

    await tick(3100);

    expect(result.current.connectionLost).toBe(true);
    expect(result.current.phase).toBe("pending");
  });

  it("treats an answer without data as a lost connection too", async () => {
    const bend = fakeBackend();
    const { result } = await mount();
    bend.status = () => HttpResponse.json({}) as unknown as Response;

    await tick(3100);

    expect(result.current.connectionLost).toBe(true);
  });

  it.each([401, 403, 404])("stops with an error on %i, since asking again cannot help", async (code) => {
    const bend = fakeBackend();
    const { result } = await mount();
    bend.status = () => HttpResponse.json({ message: "no" }, { status: code }) as unknown as Response;

    await tick(3100);
    const asked = bend.statusCalls;
    await tick(30_000);

    expect(result.current.phase).toBe("error");
    expect(result.current.error).toMatchObject({ status: code });
    expect(bend.statusCalls).toBe(asked);
  });

  it("does not ask while the tab is hidden, and asks at once when it is shown again", async () => {
    const bend = fakeBackend();
    await mount();
    Object.defineProperty(document, "hidden", { value: true, configurable: true });

    await tick(20_000);
    expect(bend.statusCalls).toBe(0);

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(bend.statusCalls).toBe(1);
  });

  it("does not react to the tab being shown while a question is already out", async () => {
    const bend = fakeBackend();
    const slow = gate();
    await mount();
    server.use(
      http.get(`${API}/api/payments/:orderId/status`, async () => {
        bend.statusCalls += 1;
        await slow.open;
        return HttpResponse.json({ data: { status: "PENDING" } });
      })
    );
    await tick(3100);
    expect(bend.statusCalls).toBe(1);

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(bend.statusCalls).toBe(1);
    slow.release();
  });

  it("says expired once the code's time has passed and the order is still unpaid, checking soon after the deadline", async () => {
    const bend = fakeBackend();
    bend.qr = () => paymentSession({ expiresAt: new Date(NOW.getTime() + 5000).toISOString() });
    const { result } = await mount();

    await tick(3100);
    expect(result.current.phase).toBe("pending");
    expect(bend.statusCalls).toBe(1);
    await tick(2000);

    expect(result.current.phase).toBe("expired");
    const asked = bend.statusCalls;
    await tick(30_000);
    expect(bend.statusCalls).toBe(asked);
  });

  it("lets a payment that landed just before the deadline win over the deadline", async () => {
    const bend = fakeBackend();
    bend.qr = () => paymentSession({ expiresAt: new Date(NOW.getTime() + 5000).toISOString() });
    const { result } = await mount();
    await tick(3100);
    bend.status = () => ({ status: "PAID", amountVnd: 380_000, amountUsd: 14.61 });

    await tick(2500);

    expect(result.current.phase).toBe("paid");
  });

  it("never shows a success for a status it does not know", async () => {
    const bend = fakeBackend();
    const { result } = await mount();
    bend.status = () => ({ status: "SETTLED" });

    await tick(9100);

    expect(result.current.phase).toBe("pending");
  });

  it("goes straight to the phase of a session that is not waiting (the BE says the order is paid)", async () => {
    const bend = fakeBackend();
    bend.qr = () => paymentSession({ status: "PAID" });

    const { result } = await mount();

    expect(result.current.phase).toBe("paid");
    await tick(10_000);
    expect(bend.statusCalls).toBe(0);
  });
});

describe("CHK-12 making a new QR", () => {
  it("replaces the session, remembers the old code once, and waits again", async () => {
    const bend = fakeBackend();
    bend.qr = () => paymentSession({ transferContent: "CODE-OLD" });
    const { result } = await mount();
    bend.status = () => ({ status: "EXPIRED" });
    await tick(3100);
    expect(result.current.phase).toBe("expired");
    bend.qr = () => paymentSession({ transferContent: "CODE-NEW" });
    bend.status = () => ({ status: "PENDING" });

    await act(async () => {
      await result.current.recreate();
    });
    await settle();

    expect(result.current.phase).toBe("pending");
    expect(result.current.session?.transferContent).toBe("CODE-NEW");
    expect(result.current.previousCodes).toEqual(["CODE-OLD"]);
    expect(result.current.isCreating).toBe(false);
    const asked = bend.statusCalls;
    await tick(3100);
    expect(bend.statusCalls).toBeGreaterThan(asked);
  });

  it("collects the codes of several expired sessions, none twice", async () => {
    const bend = fakeBackend();
    bend.qr = () => paymentSession({ transferContent: "C1" });
    const { result } = await mount();
    const next = async (code: string) => {
      bend.qr = () => paymentSession({ transferContent: code });
      await act(async () => {
        await result.current.recreate();
      });
    };

    await next("C2");
    await next("C2");
    await next("C1");
    await next("C2");

    expect(result.current.previousCodes).toEqual(["C1", "C2"]);
  });

  it("does not list a code as old when the BE gave the same one back", async () => {
    const bend = fakeBackend();
    const { result } = await mount();

    await act(async () => {
      await result.current.recreate();
    });

    expect(result.current.previousCodes).toEqual([]);
  });

  it("is busy while it asks", async () => {
    const bend = fakeBackend();
    const slow = gate();
    const { result } = await mount();
    server.use(
      http.post(`${API}/api/payments/qr`, async () => {
        bend.qrCalls += 1;
        await slow.open;
        return HttpResponse.json({ data: paymentSession({ transferContent: "LATER" }) });
      })
    );

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.recreate();
    });
    await settle();
    expect(result.current.isCreating).toBe(true);
    slow.release();
    await act(async () => {
      await pending;
    });

    expect(result.current.isCreating).toBe(false);
  });

  it("starts again from the beginning on retry", async () => {
    const bend = fakeBackend();
    bend.qr = () => HttpResponse.json({ message: "no" }, { status: 500 }) as unknown as Response;
    const { result } = await mount();
    expect(result.current.phase).toBe("error");
    bend.qr = () => paymentSession();

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.phase).toBe("pending");
    expect(result.current.error).toBeNull();
    expect(bend.qrCalls).toBe(2);
  });
});

describe("CHK-12E a new QR that cannot be made, and answers that arrive late", () => {
  it("throws to the caller and leaves the expired screen as it was", async () => {
    const bend = fakeBackend();
    const { result } = await mount();
    bend.status = () => ({ status: "EXPIRED" });
    await tick(3100);
    bend.qr = () => HttpResponse.json({ message: "Try later" }, { status: 503 }) as unknown as Response;

    await act(async () => {
      await expect(result.current.recreate()).rejects.toMatchObject({ message: "Try later", status: 503 });
    });

    expect(result.current.phase).toBe("expired");
    expect(result.current.isCreating).toBe(false);
  });

  it("ignores the late answer of an older request after a newer one started", async () => {
    const bend = fakeBackend();
    const slow = gate();
    let calls = 0;
    server.use(
      http.post(`${API}/api/payments/qr`, async () => {
        calls += 1;
        if (calls === 1) {
          await slow.open;
          return HttpResponse.json({ data: paymentSession({ transferContent: "STALE" }) });
        }
        return HttpResponse.json({ data: paymentSession({ transferContent: "FRESH" }) });
      })
    );
    const { result } = renderHook(() => usePaymentSession("o1", true));
    await settle();

    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.session?.transferContent).toBe("FRESH");
    slow.release();
    await settle();

    expect(result.current.session?.transferContent).toBe("FRESH");
    expect(bend.statusCalls).toBe(0);
  });
});
