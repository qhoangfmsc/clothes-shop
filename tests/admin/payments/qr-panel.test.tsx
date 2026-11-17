import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminQrPanel from "@/src/app/[locale]/(admin)/admin/payments/_components/AdminQrPanel";
import QrPresentation from "@/src/app/[locale]/(admin)/admin/payments/_components/QrPresentation";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";
import { qrSession } from "./payments-kit";

/* The QR an admin makes: the panel beside the order and the full-screen view for the customer (specs/admin/payments.md, flows APY-14 to APY-15E). */

const Q = (key: string) => msg(`admin.payments.orderTab.qr.${key}`);
const PR = (key: string) => msg(`admin.payments.orderTab.qr.present.${key}`);
afterEach(() => {
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
});

describe("APY-14 the QR panel", () => {
  it("shows the picture, the amount and the bank details with copy buttons for the number and the content", async () => {
    await renderApp(<AdminQrPanel qr={qrSession()} paid={false} expired={false} />);

    expect(screen.getByRole("img", { name: Q("alt") })).toHaveAttribute("src", "https://img.vietqr.io/image/qr.png");
    expect(screen.getByText("380.000 VNĐ")).toBeInTheDocument();
    for (const value of ["ACB", "DOOVAN", "123456789", "DHGNEWCODE"]) expect(screen.getByText(value)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Sao chép/ })).toHaveLength(2);
  });

  it("shows no picture for an address that is not safe", async () => {
    await renderApp(<AdminQrPanel qr={qrSession({ qrUrl: "javascript:alert(1)" })} paid={false} expired={false} />);

    expect(screen.queryByRole("img", { name: Q("alt") })).not.toBeInTheDocument();
    expect(screen.getByText("DHGNEWCODE")).toBeInTheDocument();
  });

  it("accepts an inline picture", async () => {
    await renderApp(<AdminQrPanel qr={qrSession({ qrUrl: "data:image/png;base64,AAAA" })} paid={false} expired={false} />);

    expect(screen.getByRole("img", { name: Q("alt") })).toBeInTheDocument();
  });

  it("says it is waiting, with the time the code ends, or only that it is waiting when there is no end", async () => {
    const view = await renderApp(<AdminQrPanel qr={qrSession({ expiresAt: "2099-01-01T00:00:00.000Z" })} paid={false} expired={false} />);
    expect(screen.getByRole("status")).toHaveTextContent(/^Đang chờ khách chuyển khoản\. Mã hết hạn lúc/);
    expect(view.container.querySelector(".animate-spin")).not.toBeNull();
    view.unmount();

    const none = await renderApp(<AdminQrPanel qr={qrSession({ expiresAt: null })} paid={false} expired={false} />);
    expect(screen.getByRole("status")).toHaveTextContent(Q("waitingNoExpiry"));
    none.unmount();
  });

  it("says the code expired, in rose and without the spinner", async () => {
    const { container } = await renderApp(<AdminQrPanel qr={qrSession()} paid={false} expired />);

    expect(screen.getByText(Q("expired")).className).toContain("accent-rose");
    expect(container.querySelector(".animate-spin")).toBeNull();
  });

  it("names the old codes that this one replaced, only when there are some", async () => {
    const view = await renderApp(<AdminQrPanel qr={qrSession({ supersededTransferCodes: ["OLD1", "OLD2"] })} paid={false} expired={false} />);
    expect(screen.getByText("Mã cũ đã hết hạn: OLD1, OLD2. Nếu khách đã chuyển khoản theo mã cũ thì cần xác nhận thủ công.")).toBeInTheDocument();
    view.unmount();

    await renderApp(<AdminQrPanel qr={qrSession()} paid={false} expired={false} />);
    expect(screen.queryByText(/Mã cũ đã hết hạn/)).not.toBeInTheDocument();
  });

  it("gives way to 'money received' once the order is paid", async () => {
    await renderApp(<AdminQrPanel qr={qrSession()} paid expired={false} />);

    expect(screen.getByRole("status")).toHaveTextContent(Q("paid"));
    expect(screen.queryByRole("img", { name: Q("alt") })).not.toBeInTheDocument();
  });

  it("closes the full-screen view from the panel and shows the QR again", async () => {
    await renderApp(<AdminQrPanel qr={qrSession()} paid={false} expired={false} />);
    await userEvent.click(screen.getByRole("button", { name: PR("open") }));
    await screen.findByRole("dialog", { name: PR("title") });

    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: PR("close") }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: Q("alt") })).toBeInTheDocument();
  });

  it("keeps the customer's full-screen view open through the paid state, so they see the thanks", async () => {
    const view = await renderApp(<AdminQrPanel qr={qrSession()} paid={false} expired={false} />);
    await userEvent.click(screen.getByRole("button", { name: PR("open") }));
    expect(await screen.findByRole("dialog", { name: PR("title") })).toBeInTheDocument();

    view.rerender(<AdminQrPanel qr={qrSession()} paid expired={false} />);

    expect(screen.getByRole("dialog")).toHaveTextContent(PR("paid"));
    expect(screen.getByRole("dialog")).toHaveTextContent(PR("thanks"));
  });
});

describe("APY-15 the full-screen view for the customer", () => {
  const present = (props: Partial<React.ComponentProps<typeof QrPresentation>> = {}) => {
    const onClose = vi.fn();
    return renderApp(<QrPresentation qr={qrSession()} paid={false} onClose={onClose} {...props} />).then((view) => ({ onClose, ...view }));
  };

  it("shows the QR, the amount large and the transfer details", async () => {
    await present();
    const dialog = screen.getByRole("dialog", { name: PR("title") });

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByRole("img", { name: PR("alt") })).toHaveAttribute("src", "https://img.vietqr.io/image/qr.png");
    expect(within(dialog).getByText(PR("scan"))).toBeInTheDocument();
    expect(within(dialog).getByText("380.000 VNĐ")).toBeInTheDocument();
    for (const value of ["ACB", "DOOVAN", "123456789", "DHGNEWCODE"]) expect(within(dialog).getByText(value)).toBeInTheDocument();
    expect(within(dialog).getAllByRole("button", { name: /Sao chép/ })).toHaveLength(2);
    expect(within(dialog).getByText(/^Mã hết hạn lúc/)).toBeInTheDocument();
  });

  it("leaves out the end time when there is none, and shows no picture for an unsafe address", async () => {
    await present({ qr: qrSession({ expiresAt: null, qrUrl: "http://insecure.test/qr.png" }) });
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).queryByText(/^Mã hết hạn lúc/)).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows only 'money received' and thanks once paid", async () => {
    await present({ paid: true });
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByRole("status")).toHaveTextContent(PR("paid"));
    expect(within(dialog).getByText(PR("thanks"))).toBeInTheDocument();
    expect(within(dialog).queryByRole("img")).not.toBeInTheDocument();
  });

  it("closes with its small button", async () => {
    const { onClose } = await present();

    await userEvent.click(screen.getByRole("button", { name: PR("close") }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes with Escape, and not with other keys", async () => {
    const { onClose } = await present();

    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("takes the whole screen when the browser lets it, and closes when the browser leaves full screen", async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    HTMLElement.prototype.requestFullscreen = request;
    try {
      const { onClose } = await present();
      expect(request).toHaveBeenCalledTimes(1);
      Object.defineProperty(document, "fullscreenElement", { configurable: true, value: screen.getByRole("dialog") });
      fireEvent(document, new Event("fullscreenchange"));
      expect(onClose).not.toHaveBeenCalled();

      Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
      fireEvent(document, new Event("fullscreenchange"));

      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      delete (HTMLElement.prototype as { requestFullscreen?: unknown }).requestFullscreen;
    }
  });

  it("still covers the page when the browser refuses full screen", async () => {
    HTMLElement.prototype.requestFullscreen = vi.fn().mockRejectedValue(new Error("no"));
    try {
      await present();

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      await waitFor(() => expect(HTMLElement.prototype.requestFullscreen).toHaveBeenCalled());
    } finally {
      delete (HTMLElement.prototype as { requestFullscreen?: unknown }).requestFullscreen;
    }
  });

  it("leaves full screen when it goes away, and stops listening", async () => {
    const exit = vi.fn().mockResolvedValue(undefined);
    document.exitFullscreen = exit;
    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: document.body });
    const { onClose, unmount } = await present();

    unmount();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(exit).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    delete (document as { exitFullscreen?: unknown }).exitFullscreen;
  });

  it("takes focus, is attached to the page's body, and uses English in English", async () => {
    await renderApp(<QrPresentation qr={qrSession()} paid={false} onClose={() => {}} />, { locale: "en" });
    const dialog = screen.getByRole("dialog");

    expect(dialog).toHaveFocus();
    expect(dialog.parentElement).toBe(document.body);
    expect(within(dialog).getByText(msg("admin.payments.orderTab.qr.present.scan", "en"))).toBeInTheDocument();
  });
});
