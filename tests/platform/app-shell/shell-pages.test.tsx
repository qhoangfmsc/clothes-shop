import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import NotFound from "@/src/app/[locale]/not-found";
import PublicError from "@/src/app/[locale]/(public)/error";
import UnauthorizedContent from "@/src/app/[locale]/unauthorized/UnauthorizedContent";
import UnauthorizedPage, { generateMetadata } from "@/src/app/[locale]/unauthorized/page";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";

/* The pages that say something went wrong: not found, server error, no permission (specs/platform/app-shell.md, flows SHL-7 to SHL-9E). */

const E = (key: string, locale: "vi" | "en" = "vi") => msg(`shared.errors.${key}`, locale);

describe("SHL-7E the page that does not exist", () => {
  it("names the shop, says the page is gone, and offers the way home and to the shop", async () => {
    await renderApp(<NotFound />);

    expect(screen.getByText("DOOVAN")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: E("notFound.title") })).toBeInTheDocument();
    expect(screen.getByText(E("notFound.description"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: E("notFound.home") })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: E("notFound.explore") })).toHaveAttribute("href", "/shop");
  });

  it("speaks English in English", async () => {
    await renderApp(<NotFound />, { locale: "en" });

    expect(screen.getByRole("heading", { level: 1, name: E("notFound.title", "en") })).toBeInTheDocument();
  });

  it("has a wallpaper that is only decoration", async () => {
    const { container } = await renderApp(<NotFound />);

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("fills the first button with a different look under the mouse, and puts it back", async () => {
    await renderApp(<NotFound />);
    const home = screen.getByRole("link", { name: E("notFound.home") });

    fireEvent.mouseEnter(home);
    expect(home.style.opacity).toBe("0.9");
    expect(home.style.transform).toBe("scale(1.02)");
    fireEvent.mouseLeave(home);

    expect(home.style.opacity).toBe("1");
    expect(home.style.transform).toBe("scale(1)");
  });

  it("tints the second button under the mouse, and puts it back", async () => {
    await renderApp(<NotFound />);
    const explore = screen.getByRole("link", { name: E("notFound.explore") });

    fireEvent.mouseEnter(explore);
    expect(explore.style.background).toBe("var(--color-rose-milk)");
    expect(explore.style.transform).toBe("translateY(-2px)");
    fireEvent.mouseLeave(explore);

    expect(explore.style.background).toBe("transparent");
    expect(explore.style.transform).toBe("translateY(0)");
  });
});

describe("SHL-8E the page that failed to load", () => {
  const boom = Object.assign(new Error("boom"), { digest: "d1" });
  const view = (reset = vi.fn(), locale?: "vi" | "en") => renderApp(<PublicError error={boom} reset={reset} />, { locale });

  it("says something went wrong, and offers to try again and to go home", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await view();

    expect(screen.getByRole("heading", { level: 1, name: E("serverError.title") })).toBeInTheDocument();
    expect(screen.getByText(E("serverError.description"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: E("serverError.retry") })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: E("serverError.home") })).toHaveAttribute("href", "/");
  });

  it("asks the framework to draw the page again when 'try again' is pressed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reset = vi.fn();
    await view(reset);

    await userEvent.click(screen.getByRole("button", { name: E("serverError.retry") }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("records the error for whoever reads the console, once", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await view();

    expect(log).toHaveBeenCalledWith(boom);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("speaks English in English", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await view(vi.fn(), "en");

    expect(screen.getByRole("button", { name: E("serverError.retry", "en") })).toBeInTheDocument();
  });
});

describe("SHL-9 the page for someone who may not enter", () => {
  it("tells a visitor to sign in, with a way to do it", async () => {
    await renderApp(<UnauthorizedContent />, { as: "guest" });

    expect(screen.getByRole("heading", { level: 1, name: E("unauthorized.title") })).toBeInTheDocument();
    expect(screen.getByText(E("unauthorized.signedOut"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: E("unauthorized.signIn") })).toHaveAttribute("href", "/login");
    expect(screen.queryByText(E("unauthorized.role"))).not.toBeInTheDocument();
  });

  it("tells a signed-in customer which account has no right, with their role and a way back to the shop", async () => {
    await renderApp(<UnauthorizedContent />, { as: "user" });

    expect(screen.getByText("Tài khoản của bạn (mai@example.com) không có quyền truy cập khu vực này.")).toBeInTheDocument();
    expect(screen.getByText(E("unauthorized.role"))).toBeInTheDocument();
    const role = screen.getByText(msg("common.role.user"));
    expect(role.className).toContain("accent-blue");
    expect(screen.getByRole("link", { name: E("unauthorized.back") })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: E("unauthorized.signIn") })).not.toBeInTheDocument();
  });

  it("shows an admin's role in the gold look", async () => {
    await renderApp(<UnauthorizedContent />, { as: "adminLimited" });

    const role = screen.getByText(msg("common.role.admin"));
    expect(role.className).toContain("accent-primary");
    expect(role.className).not.toContain("accent-blue");
  });

  it("speaks English in English", async () => {
    await renderApp(<UnauthorizedContent />, { as: "guest", locale: "en" });

    expect(screen.getByText(E("unauthorized.signedOut", "en"))).toBeInTheDocument();
  });

  it("is the whole page of its address", async () => {
    await renderApp(<UnauthorizedPage />, { as: "guest" });

    expect(screen.getByRole("heading", { level: 1, name: E("unauthorized.title") })).toBeInTheDocument();
  });

  it("has a title with the brand and stays out of search results", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "vi" }) });

    expect(meta.title).toBe(`${E("unauthorized.meta.title")} — DOOVAN`);
    expect(meta.robots).toEqual({ index: false, follow: false });
  });
});
