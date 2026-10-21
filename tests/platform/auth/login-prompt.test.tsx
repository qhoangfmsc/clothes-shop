import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { useLoginPrompt } from "@/src/app/[locale]/_components/LoginPromptModal";
import { useAuth } from "@/src/contexts/auth-context";
import { useAuthAction } from "@/src/hooks/use-auth-action";
import { API } from "@/tests/_support/api";
import { IDENTITIES } from "@/tests/_support/identities";
import { msg } from "@/tests/_support/messages";
import { server } from "@/tests/_support/msw-server";
import { renderApp } from "@/tests/_support/render";

/* "Sign in to continue" without leaving the page: useAuthAction().requireAuth and the login prompt modal
   (specs/platform/auth.md, flows ACT-1 … ACT-3 and LP-1 … LP-4). */

let auth: ReturnType<typeof useAuth>;

function Actions({ action, loginAction }: { action: () => void; loginAction?: "continue" | "addToBag" | "saveToWishlist" }) {
  const { requireAuth } = useAuthAction();
  const { openLoginPrompt } = useLoginPrompt();
  auth = useAuth();
  return (
    <div>
      <button onClick={() => requireAuth(action, loginAction)}>require</button>
      <button onClick={() => openLoginPrompt(action, loginAction)}>open</button>
    </div>
  );
}

const title = () => screen.queryByText(msg("shared.feedback.loginPrompt.title"));
const press = (name: string) => userEvent.click(screen.getByRole("button", { name }));
const signInWithGoogle = () => {
  server.use(http.post(`${API}/api/auth/google`, () => HttpResponse.json({ accessToken: "a1", refreshToken: "r1", user: IDENTITIES.user })));
  server.use(http.get(`${API}/api/auth/me`, () => HttpResponse.json({ user: IDENTITIES.user })));
  return act(() => auth.login("google-code"));
};

describe("ACT-1 requireAuth for a signed-in user (user)", () => {
  it("runs the action right away and never opens the prompt", async () => {
    const action = vi.fn();
    await renderApp(<Actions action={action} />, { as: "user" });

    await press("require");

    expect(action).toHaveBeenCalledTimes(1);
    expect(title()).toBeNull();
  });
});

describe("ACT-2 requireAuth for a guest (khách)", () => {
  it("holds the action and opens the prompt with the default wording", async () => {
    const action = vi.fn();
    await renderApp(<Actions action={action} />);

    await press("require");

    expect(action).not.toHaveBeenCalled();
    expect(title()).toBeInTheDocument();
    expect(screen.getByText(msg("shared.feedback.loginPrompt.subtitle.continue"))).toBeInTheDocument();
  });

  it.each(["addToBag", "saveToWishlist"] as const)("words the prompt for the %s action", async (loginAction) => {
    await renderApp(<Actions action={vi.fn()} loginAction={loginAction} />);

    await press("require");

    expect(screen.getByText(msg(`shared.feedback.loginPrompt.subtitle.${loginAction}`))).toBeInTheDocument();
  });
});

describe("LP-1 the prompt, for a guest (khách)", () => {
  it("offers Google sign-in, locked until the terms are accepted", async () => {
    await renderApp(<Actions action={vi.fn()} />);
    await press("open");

    const google = screen.getByRole("button", { name: msg("auth.login.google.continue") });
    expect(google).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(google).toBeEnabled();
  });

  it("closes with the dismiss button, with the close button and with Escape", async () => {
    await renderApp(<Actions action={vi.fn()} />);

    await press("open");
    await press(msg("shared.feedback.loginPrompt.dismiss"));
    await waitFor(() => expect(title()).toBeNull());

    await press("open");
    await press(msg("common.actions.close"));
    await waitFor(() => expect(title()).toBeNull());

    await press("open");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(title()).toBeNull());
  });

  it("locks page scrolling while it is open and releases it after", async () => {
    await renderApp(<Actions action={vi.fn()} />);

    await press("open");
    expect(document.body.style.overflow).toBe("hidden");
    await press(msg("shared.feedback.loginPrompt.dismiss"));
    await waitFor(() => expect(document.body.style.overflow).toBe(""));
  });
});

describe("LP-2 signing in while the prompt is open", () => {
  it("closes the prompt and runs the held action", async () => {
    const action = vi.fn();
    await renderApp(<Actions action={action} />);
    await press("require");
    expect(action).not.toHaveBeenCalled();

    await signInWithGoogle();

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(title()).toBeNull());
  });
});

describe("LP-3 the prompt is dismissed", () => {
  it("drops the held action, so a later sign-in does not run it", async () => {
    const action = vi.fn();
    await renderApp(<Actions action={action} />);
    await press("require");
    await press(msg("shared.feedback.loginPrompt.dismiss"));
    await waitFor(() => expect(title()).toBeNull());

    await signInWithGoogle();
    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(action).not.toHaveBeenCalled();
  });
});

describe("LP-4 opening the prompt without an action", () => {
  it("opens, and signing in simply closes it", async () => {
    await renderApp(<Actions action={vi.fn()} />);

    window.dispatchEvent(new CustomEvent("login-prompt:open", { detail: {} }));
    expect(await screen.findByText(msg("shared.feedback.loginPrompt.title"))).toBeInTheDocument();
    expect(screen.getByText(msg("shared.feedback.loginPrompt.subtitle.continue"))).toBeInTheDocument();
  });
});
