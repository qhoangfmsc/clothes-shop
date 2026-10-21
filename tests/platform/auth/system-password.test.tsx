import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminPasswordGate } from "@/src/app/[locale]/_components/AdminPasswordGate";
import { useSystemPasswordPrompt } from "@/src/app/[locale]/_components/SystemPasswordPrompt";
import { SYSTEM_PASSWORD } from "@/src/lib/system-password";
import { isSystemUnlocked, markSystemUnlocked } from "@/src/lib/system-password-session";
import { msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* The shared "system password" that sits on top of the admin role check (specs/platform/auth.md, flows
   SYS-1 … SYS-3). It is a speed bump, not a security boundary: the BE decides what an account may do. */

const KEY = "admin_system_unlocked_at";
const MINUTE = 60_000;

afterEach(() => vi.useRealTimers());

describe("SYS-1 the 15-minute unlock", () => {
  it("is locked until the password was entered", () => {
    expect(isSystemUnlocked()).toBe(false);
  });

  it("stays open for 15 minutes, then locks again", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-21T10:00:00Z"));
    markSystemUnlocked();

    vi.setSystemTime(new Date("2026-10-21T10:14:59Z"));
    expect(isSystemUnlocked()).toBe(true);
    vi.setSystemTime(new Date("2026-10-21T10:15:00Z"));
    expect(isSystemUnlocked()).toBe(false);
  });

  it.each(["", "abc", "NaN", "Infinity"])("treats the stored value %j as locked", (value) => {
    sessionStorage.setItem(KEY, value);

    expect(isSystemUnlocked()).toBe(false);
  });

  it("is locked on the server, where there is no window", () => {
    markSystemUnlocked();
    vi.stubGlobal("window", undefined);
    try {
      expect(isSystemUnlocked()).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("SYS-2 the password prompt", () => {
  let outcome: boolean | undefined;

  function Opener() {
    const requestPassword = useSystemPasswordPrompt();
    return <button onClick={() => requestPassword().then((ok) => (outcome = ok))}>ask</button>;
  }

  const field = () => screen.getByPlaceholderText(msg("shared.feedback.systemPassword.placeholder"));
  const wrongPassword = () => screen.queryByText(msg("shared.feedback.systemPassword.error"));

  async function open() {
    outcome = undefined;
    await renderApp(<Opener />);
    await userEvent.click(screen.getByRole("button", { name: "ask" }));
    await screen.findByText(msg("shared.feedback.systemPassword.title"));
  }

  it("accepts the right password: resolves true and unlocks for 15 minutes", async () => {
    await open();

    await userEvent.type(field(), `${SYSTEM_PASSWORD}{Enter}`);

    await waitFor(() => expect(outcome).toBe(true));
    expect(isSystemUnlocked()).toBe(true);
    expect(wrongPassword()).toBeNull();
  });

  it("refuses a wrong password: says so, empties the field, stays locked and keeps asking", async () => {
    await open();

    await userEvent.type(field(), "not-it{Enter}");

    expect(await screen.findByText(msg("shared.feedback.systemPassword.error"))).toBeInTheDocument();
    expect(field()).toHaveValue("");
    expect(isSystemUnlocked()).toBe(false);
    expect(outcome).toBeUndefined();
  });

  it("hides the error again as soon as the visitor types", async () => {
    await open();
    await userEvent.type(field(), "x{Enter}");
    await screen.findByText(msg("shared.feedback.systemPassword.error"));

    await userEvent.type(field(), "y");

    expect(wrongPassword()).toBeNull();
  });

  it("resolves false when cancelled, and stays locked", async () => {
    await open();

    await userEvent.click(screen.getByRole("button", { name: msg("common.actions.cancel") }));

    await waitFor(() => expect(outcome).toBe(false));
    expect(isSystemUnlocked()).toBe(false);
  });

  it("resolves false when the backdrop is clicked", async () => {
    await open();

    await userEvent.click(field().closest("form")!.parentElement!);

    await waitFor(() => expect(outcome).toBe(false));
  });
});

describe("SYS-3 the admin gate", () => {
  const Gate = () => (
    <AdminPasswordGate>
      <p>ADMIN AREA</p>
    </AdminPasswordGate>
  );
  const prompt = () => screen.queryByText(msg("shared.feedback.systemPassword.title"));

  it("asks for the password and keeps the area hidden while locked", async () => {
    await renderApp(<Gate />, { as: "adminFull" });

    expect(await screen.findByText(msg("shared.feedback.systemPassword.title"))).toBeInTheDocument();
    expect(screen.queryByText("ADMIN AREA")).toBeNull();
  });

  it("shows the area after the right password", async () => {
    await renderApp(<Gate />, { as: "adminFull" });
    await screen.findByText(msg("shared.feedback.systemPassword.title"));

    await userEvent.type(screen.getByPlaceholderText(msg("shared.feedback.systemPassword.placeholder")), `${SYSTEM_PASSWORD}{Enter}`);

    expect(await screen.findByText("ADMIN AREA")).toBeInTheDocument();
  });

  it("sends the visitor to the home page when the prompt is cancelled", async () => {
    await renderApp(<Gate />, { as: "adminFull" });
    await screen.findByText(msg("shared.feedback.systemPassword.title"));

    await userEvent.click(screen.getByRole("button", { name: msg("common.actions.cancel") }));

    await waitFor(() => expect(navigation.router.replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("ADMIN AREA")).toBeNull();
  });

  it("does not ask again while the unlock is fresh", async () => {
    markSystemUnlocked();

    await renderApp(<Gate />, { as: "adminFull" });

    expect(await screen.findByText("ADMIN AREA")).toBeInTheDocument();
    expect(prompt()).toBeNull();
  });

  it("asks again on the next admin page once the 15 minutes have passed", async () => {
    sessionStorage.setItem(KEY, String(Date.now() - 5 * MINUTE));
    navigation.pathname = "/admin";
    const { rerender } = await renderApp(<Gate />, { as: "adminFull" });
    expect(await screen.findByText("ADMIN AREA")).toBeInTheDocument();

    sessionStorage.setItem(KEY, String(Date.now() - 16 * MINUTE));
    navigation.pathname = "/admin/orders";
    rerender(<Gate />);

    expect(await screen.findByText(msg("shared.feedback.systemPassword.title"))).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("ADMIN AREA")).toBeNull());
  });
});
