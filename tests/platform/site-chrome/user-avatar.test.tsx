import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserAvatar } from "@/src/app/[locale]/_components/UserAvatar";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";

/* The round picture of a signed-in customer, in the burger drawer and on the account page (specs/platform/site-chrome.md, flow CHR-27). */

const A = (key: string, locale: "vi" | "en" = "vi") => msg(`shared.header.account.${key}`, locale);
const avatar = (user: { name: string | null; image: string | null }, props: { size?: number; className?: string; onClick?: () => void } = {}, locale?: "vi" | "en") => renderApp(<UserAvatar user={user} {...props} />, { locale });

describe("CHR-27 the round picture", () => {
  it("shows the first letters of the first two words of the name, in capitals", async () => {
    await avatar({ name: "nguyen van an", image: null });

    expect(screen.getByText("NV")).toBeInTheDocument();
  });

  it("shows one letter for a one-word name", async () => {
    await avatar({ name: "mai", image: null });

    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("shows a question mark when the name is missing", async () => {
    await avatar({ name: null, image: null });

    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("shows the picture, named after the customer, when there is one", async () => {
    await avatar({ name: "Mai", image: "https://example.com/mai.png" });

    const image = screen.getByAltText("Mai");
    expect(image.getAttribute("src")).toContain("mai.png");
    expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(image.style.objectFit).toBe("cover");
    expect(image.style.borderRadius).toBe("50%");
    expect(screen.queryByText("M")).not.toBeInTheDocument();
  });

  it("names the picture 'user' when the name is missing, in both languages", async () => {
    await avatar({ name: null, image: "https://example.com/x.png" }, {}, "en");

    expect(screen.getByAltText(A("userFallback", "en"))).toBeInTheDocument();
  });

  it("is a plain circle of the size asked for (32 by default) when nothing happens on press", async () => {
    const { container } = await avatar({ name: "Mai", image: null });

    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("SPAN");
    expect(root.style.width).toBe("32px");
    expect(root.style.height).toBe("32px");
    expect(root.style.borderRadius).toBe("50%");
    expect(root.style.cursor).toBe("default");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("takes the size and the extra class it is given", async () => {
    const { container } = await avatar({ name: "Mai", image: null }, { size: 64, className: "extra" });

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe("64px");
    expect(root.className).toBe("extra");
  });

  it("is a button with a name when it does something on press, and does it", async () => {
    const onClick = vi.fn();
    await avatar({ name: "Mai", image: null }, { onClick });

    const button = screen.getByRole("button", { name: A("userMenu") });
    expect(button.style.cursor).toBe("pointer");
    expect(button.className).toContain("user-avatar-btn");
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
