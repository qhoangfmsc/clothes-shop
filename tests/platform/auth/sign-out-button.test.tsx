import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SignOutButton from "@/src/app/[locale]/_components/SignOutButton";
import { useAuth } from "@/src/contexts/auth-context";
import { ACCESS_KEY, REFRESH_KEY } from "@/tests/_support/api";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";

/* Signing out asks first, so a mis-tap does not end the session (specs/platform/auth.md, flows OUT-1 … OUT-3). */

function Who() {
  const { user } = useAuth();
  return <p data-testid="who">{user ? user.email : "nobody"}</p>;
}

const label = msg("shared.header.account.signOut");
const dialog = () => screen.findByRole("alertdialog");
const inDialog = async (name: string) => within(await dialog()).getByRole("button", { name });
const confirmLabel = msg("shared.header.account.signOutConfirm.confirm");

describe.each(["profile", "drawer"] as const)("OUT-1 … OUT-3 the %s sign-out button, for a signed-in user (user)", (variant) => {
  const render = (onSignedOut?: () => void) =>
    renderApp(
      <>
        <Who />
        <SignOutButton variant={variant} onSignedOut={onSignedOut} />
      </>,
      { as: "user" }
    );

  it("asks for confirmation first and signs out only after the user confirms", async () => {
    const onSignedOut = vi.fn();
    await render(onSignedOut);
    expect(screen.getByTestId("who")).toHaveTextContent("mai@example.com");

    await userEvent.click(screen.getByRole("button", { name: label }));
    const ask = await dialog();
    expect(within(ask).getByText(msg("shared.header.account.signOutConfirm.title"))).toBeInTheDocument();
    expect(onSignedOut).not.toHaveBeenCalled();
    expect(screen.getByTestId("who")).toHaveTextContent("mai@example.com");

    await userEvent.click(await inDialog(confirmLabel));

    await waitFor(() => expect(screen.getByTestId("who")).toHaveTextContent("nobody"));
    expect(onSignedOut).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(ACCESS_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
  });

  it("does nothing when the user cancels", async () => {
    const onSignedOut = vi.fn();
    await render(onSignedOut);

    await userEvent.click(screen.getByRole("button", { name: label }));
    await userEvent.click(await inDialog(msg("common.actions.cancel")));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByTestId("who")).toHaveTextContent("mai@example.com");
    expect(onSignedOut).not.toHaveBeenCalled();
    expect(localStorage.getItem(ACCESS_KEY)).not.toBeNull();
  });

  it("works without an onSignedOut callback", async () => {
    await render();

    await userEvent.click(screen.getByRole("button", { name: label }));
    await userEvent.click(await inDialog(confirmLabel));

    await waitFor(() => expect(screen.getByTestId("who")).toHaveTextContent("nobody"));
  });
});
