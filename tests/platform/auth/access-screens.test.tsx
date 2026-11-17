import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoginContent from "@/src/app/[locale]/(auth)/login/LoginContent";
import UnauthenticatedState from "@/src/app/[locale]/_components/UnauthenticatedState";
import UnauthorizedContent from "@/src/app/[locale]/unauthorized/UnauthorizedContent";
import { IDENTITIES } from "@/tests/_support/identities";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";

/* The three screens a visitor meets when access is refused or needs a sign-in
   (specs/platform/auth.md, flows WALL-1, DENIED-1 … DENIED-3 and PAGE-1). */

describe("WALL-1 the sign-in wall on private pages, for a guest (khách)", () => {
  it("explains, offers Google sign-in (locked until the terms are accepted) and a way home", async () => {
    await renderApp(<UnauthenticatedState />);

    expect(screen.getByRole("heading", { name: msg("shared.feedback.unauthenticated.title") })).toBeInTheDocument();
    expect(screen.getByText(msg("shared.feedback.unauthenticated.subtitle"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: msg("auth.login.google.continue") })).toBeDisabled();
    expect(screen.getByRole("link", { name: msg("shared.feedback.unauthenticated.home") })).toHaveAttribute("href", "/");
  });

  it("cannot be closed: no close button and no dismiss control", async () => {
    await renderApp(<UnauthenticatedState />);

    expect(screen.queryByRole("button", { name: msg("common.actions.close") })).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1); // only the Google button
  });

  it("locks page scrolling while shown and releases it when it goes away", async () => {
    const { unmount } = await renderApp(<UnauthenticatedState />);
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");

    unmount();

    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("speaks English when the site is in English", async () => {
    await renderApp(<UnauthenticatedState />, { locale: "en" });

    expect(screen.getByRole("heading", { name: msg("shared.feedback.unauthenticated.title", "en") })).toBeInTheDocument();
  });
});

describe("DENIED-1 … DENIED-3 the access-denied page", () => {
  it("tells a guest to sign in and links to /login (khách)", async () => {
    await renderApp(<UnauthorizedContent />);

    expect(screen.getByText(msg("shared.errors.unauthorized.signedOut"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: msg("shared.errors.unauthorized.signIn") })).toHaveAttribute("href", "/login");
    expect(screen.queryByText(msg("shared.errors.unauthorized.role"))).toBeNull();
  });

  it("tells a customer which account lacks access, shows the customer role and links back to the store (user)", async () => {
    await renderApp(<UnauthorizedContent />, { as: "user" });

    expect(screen.getByText(msg("shared.errors.unauthorized.signedIn").replace("{email}", "mai@example.com"))).toBeInTheDocument();
    expect(screen.getByText(msg("common.role.user"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: msg("shared.errors.unauthorized.back") })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: msg("shared.errors.unauthorized.signIn") })).toBeNull();
  });

  it("shows the admin role for an admin who still lacks access to this area (admin thiếu quyền)", async () => {
    await renderApp(<UnauthorizedContent />, { as: "adminLimited" });

    expect(screen.getByText(msg("common.role.admin"))).toBeInTheDocument();
  });

  it("shows a role it has no label for as it is", async () => {
    await renderApp(<UnauthorizedContent />, { as: { ...IDENTITIES.user!, role: "auditor" } });

    expect(screen.getByText("auditor")).toBeInTheDocument();
  });
});

describe("PAGE-1 the login page, for a guest (khách)", () => {
  it("welcomes, offers Google sign-in (locked until the terms are accepted) and a way back home", async () => {
    await renderApp(<LoginContent />);

    expect(screen.getByRole("heading", { level: 1, name: msg("auth.login.welcome.title") })).toBeInTheDocument();
    expect(screen.getByText(msg("auth.login.welcome.subtitle"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: msg("auth.login.google.continue") })).toBeDisabled();
    expect(screen.getByRole("link", { name: msg("auth.login.backHome") })).toHaveAttribute("href", "/");
  });
});
