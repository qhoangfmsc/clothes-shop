import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { ConfirmProvider, useConfirm } from "@/src/app/[locale]/_components/ConfirmDialog";
import { ToastProvider, useToast } from "@/src/app/[locale]/_components/Toast";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";
import { MESSAGES } from "@/tests/_support/messages";

/* The toast and the themed confirm box (specs/platform/ui-kit.md, flows UI-10 to UI-11E). */

let api: ReturnType<typeof useToast>["toast"];
function ToastProbe() {
  api = useToast().toast;
  return null;
}

let ask: ReturnType<typeof useConfirm>;
function ConfirmProbe() {
  ask = useConfirm();
  return null;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const dismissLabel = () => msg("shared.feedback.toast.dismiss");

describe("UI-10 toasts", () => {
  it.each(["success", "error", "info", "warning"] as const)("shows a %s message", async (variant) => {
    await renderApp(<ToastProbe />);

    act(() => api[variant](`${variant} text`));

    expect(await screen.findByText(`${variant} text`)).toBeInTheDocument();
  });

  it("accepts rich content, not only text", async () => {
    await renderApp(<ToastProbe />);

    act(() => api.info(<span data-testid="rich">go to <strong>orders</strong></span>));

    expect(await screen.findByTestId("rich")).toHaveTextContent("go to orders");
    expect(screen.getByText("orders").tagName).toBe("STRONG");
  });

  it("goes away by itself after its time, 3 seconds unless told otherwise", async () => {
    await renderApp(<ToastProbe />);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      act(() => {
        api.success("quick", 100);
        api.success("normal");
      });
      expect(screen.getByText("quick")).toBeInTheDocument();

      await act(async () => vi.advanceTimersByTime(150));
      await waitFor(() => expect(screen.queryByText("quick")).not.toBeInTheDocument());
      expect(screen.getByText("normal")).toBeInTheDocument();

      await act(async () => vi.advanceTimersByTime(2900));
      await waitFor(() => expect(screen.queryByText("normal")).not.toBeInTheDocument());
    } finally {
      vi.useRealTimers();
    }
  });

  it("goes away when the shopper closes it, and the close button has a name", async () => {
    await renderApp(<ToastProbe />);
    act(() => api.error("close me"));

    await userEvent.click(await screen.findByRole("button", { name: dismissLabel() }));

    await waitFor(() => expect(screen.queryByText("close me")).not.toBeInTheDocument());
  });

  it("can be closed by the code with its id, or all at once", async () => {
    await renderApp(<ToastProbe />);
    act(() => {
      api.info("one");
      api.info("two");
    });
    await screen.findByText("two");

    act(() => api.dismiss("toast-1"));
    await waitFor(() => expect(screen.queryByText("one")).not.toBeInTheDocument());
    expect(screen.getByText("two")).toBeInTheDocument();

    act(() => api.dismissAll());
    await waitFor(() => expect(screen.queryByText("two")).not.toBeInTheDocument());
  });

  it("closing a toast does not touch the others, and an unknown id does nothing", async () => {
    await renderApp(<ToastProbe />);
    act(() => api.info("stays"));
    await screen.findByText("stays");

    act(() => api.dismiss("toast-999"));

    expect(screen.getByText("stays")).toBeInTheDocument();
  });

  it("keeps at most five at a time (the oldest makes room)", async () => {
    await renderApp(<ToastProbe />);

    act(() => {
      for (let i = 1; i <= 6; i += 1) api.info(`msg ${i}`);
    });

    await waitFor(() => expect(screen.queryByText("msg 1")).not.toBeInTheDocument());
    for (let i = 2; i <= 6; i += 1) expect(screen.getByText(`msg ${i}`)).toBeInTheDocument();
  });

  it("keeps as many as the provider is told to", async () => {
    render(
      <NextIntlClientProvider locale="vi" messages={MESSAGES.vi}>
        <ToastProvider maxToasts={2}>
          <ToastProbe />
        </ToastProvider>
      </NextIntlClientProvider>
    );

    act(() => {
      api.info("a");
      api.info("b");
      api.info("c");
    });

    await waitFor(() => expect(screen.queryByText("a")).not.toBeInTheDocument());
    expect(screen.getByText("b")).toBeInTheDocument();
    expect(screen.getByText("c")).toBeInTheDocument();
  });

  it("the oldest toast pushed out no longer fires its timer on the others", async () => {
    await renderApp(<ToastProbe />);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      act(() => {
        api.info("old", 500);
        for (let i = 1; i <= 5; i += 1) api.info(`later ${i}`, 10_000);
      });
      await act(async () => vi.advanceTimersByTime(600));

      expect(screen.getByText("later 1")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("has a live region where it puts the messages, in the corner it was told to", async () => {
    render(
      <NextIntlClientProvider locale="vi" messages={MESSAGES.vi}>
        <ToastProvider position="top-right">
          <ToastProbe />
        </ToastProvider>
      </NextIntlClientProvider>
    );
    act(() => api.info("corner"));

    const region = (await screen.findByText("corner")).closest("[aria-live]") as HTMLElement;

    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region.className).toContain("top-6 right-4");
  });

  it("is at the bottom centre by default", async () => {
    render(
      <NextIntlClientProvider locale="vi" messages={MESSAGES.vi}>
        <ToastProvider>
          <ToastProbe />
        </ToastProvider>
      </NextIntlClientProvider>
    );
    act(() => api.info("middle"));

    const region = (await screen.findByText("middle")).closest("[aria-live]") as HTMLElement;

    expect(region.className).toContain("bottom-6 left-1/2");
  });

  it("speaks English in English", async () => {
    await renderApp(<ToastProbe />, { locale: "en" });
    act(() => api.info("hello"));

    expect(await screen.findByRole("button", { name: msg("shared.feedback.toast.dismiss", "en") })).toBeInTheDocument();
  });
});

describe("UI-10E using the toast where there is no provider", () => {
  it("fails loudly, so a missing provider is found in development", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<ToastProbe />)).toThrow("useToast must be used within a <ToastProvider>");
    spy.mockRestore();
  });
});

describe("UI-11 the confirm box", () => {
  const dialog = () => screen.findByRole("alertdialog", {}, { timeout: 4000 });

  it("asks with the title and message, and answers true on confirm", async () => {
    await renderApp(<ConfirmProbe />);
    const answer = ask({ title: "Delete it?", message: "This cannot be undone." });

    const box = await dialog();

    expect(box).toHaveTextContent("Delete it?");
    expect(box).toHaveTextContent("This cannot be undone.");
    await userEvent.click(screen.getByRole("button", { name: msg("common.actions.confirm") }));
    await expect(answer).resolves.toBe(true);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("answers false on cancel", async () => {
    await renderApp(<ConfirmProbe />);
    const answer = ask({ message: "Sure?" });
    await dialog();

    await userEvent.click(screen.getByRole("button", { name: msg("common.actions.cancel") }));

    await expect(answer).resolves.toBe(false);
  });

  it("answers false when the shopper clicks the dark area, but not when clicking inside the box", async () => {
    await renderApp(<ConfirmProbe />);
    const answer = ask({ message: "Sure?" });
    const box = await dialog();

    fireEvent.click(box);
    await act(async () => void (await wait(400)));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    fireEvent.click(box.parentElement as HTMLElement);

    await expect(answer).resolves.toBe(false);
  });

  it("answers false on Escape, and only while it is open", async () => {
    await renderApp(<ConfirmProbe />);
    fireEvent.keyDown(document, { key: "Escape" });
    const answer = ask({ message: "Sure?" });
    await dialog();

    fireEvent.keyDown(document, { key: "Enter" });
    await act(async () => void (await wait(400)));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    await expect(answer).resolves.toBe(false);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("uses the caller's button names, and has no heading without a title", async () => {
    await renderApp(<ConfirmProbe />);
    void ask({ message: "Sure?", confirmLabel: "Yes, remove", cancelLabel: "Keep" });
    await dialog();

    expect(screen.getByRole("button", { name: "Yes, remove" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("focuses the confirm button, and marks a dangerous question in rose", async () => {
    await renderApp(<ConfirmProbe />);
    void ask({ message: "Delete?", danger: true });
    await dialog();
    const confirm = screen.getByRole("button", { name: msg("common.actions.confirm") });

    expect(confirm).toHaveFocus();
    expect(confirm.className).toContain("bg-[var(--accent-rose)]");
  });

  it("a harmless question is gold", async () => {
    await renderApp(<ConfirmProbe />);
    void ask({ message: "Go on?" });
    await dialog();

    expect(screen.getByRole("button", { name: msg("common.actions.confirm") }).className).toContain("bg-[var(--accent-primary)]");
  });

  it("can show rich content as the message", async () => {
    await renderApp(<ConfirmProbe />);
    void ask({ message: <strong>Careful</strong> });

    expect(await screen.findByText("Careful")).toBeInTheDocument();
  });

  it("asks again after it was answered", async () => {
    await renderApp(<ConfirmProbe />);
    const first = ask({ message: "One" });
    await dialog();
    await userEvent.click(screen.getByRole("button", { name: msg("common.actions.cancel") }));
    await first;
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    const second = ask({ message: "Two" });

    expect(await screen.findByText("Two")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: msg("common.actions.confirm") }));
    await expect(second).resolves.toBe(true);
  });

  it("speaks English in English", async () => {
    await renderApp(<ConfirmProbe />, { locale: "en" });
    void ask({ message: "Sure?" });
    await dialog();

    expect(screen.getByRole("button", { name: msg("common.actions.confirm", "en") })).toBeInTheDocument();
    await wait(0);
  });
});

describe("UI-11E using the confirm box where there is no provider", () => {
  it("fails loudly", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<ConfirmProbe />)).toThrow("useConfirm must be used within a <ConfirmProvider>");
    spy.mockRestore();
  });

  it("the provider alone works without the app's other providers", async () => {
    render(
      <NextIntlClientProvider locale="vi" messages={MESSAGES.vi}>
        <ConfirmProvider>
          <ConfirmProbe />
        </ConfirmProvider>
      </NextIntlClientProvider>
    );
    const answer = ask({ message: "Alone?" });

    await userEvent.click(await screen.findByRole("button", { name: msg("common.actions.confirm") }));

    await expect(answer).resolves.toBe(true);
  });
});
