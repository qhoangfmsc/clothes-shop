import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import LanguageSwitcher from "@/src/app/[locale]/_components/LanguageSwitcher";
import SiteFooter from "@/src/app/[locale]/_components/SiteFooter";
import SocialIcons from "@/src/app/[locale]/_components/SocialIcons";
import { CONTACT_ADDRESS, CONTACT_EMAIL, CONTACT_MAPS_URL, CONTACT_PHONE, CONTACT_PHONE_E164 } from "@/src/lib/contact";
import { LEGAL_DOCS } from "@/src/lib/legal";
import { CONTACT_LINKS, SOCIALS } from "@/src/lib/socials";
import { msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* The footer, its icon row and the language choice (specs/platform/site-chrome.md, flows CHR-1 to CHR-3). */

const F = (key: string, locale: "vi" | "en" = "vi") => msg(`shared.footer.${key}`, locale);
const H = (key: string, locale: "vi" | "en" = "vi") => msg(`shared.header.${key}`, locale);

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("CHR-1 the footer", () => {
  it("names the shop with a link home, says what it does, and gives the address and the hotline as links", async () => {
    await renderApp(<SiteFooter />);

    expect(screen.getByRole("link", { name: F("homeAria") })).toHaveAttribute("href", "/");
    expect(screen.getByText(F("tagline"))).toBeInTheDocument();
    const address = screen.getByRole("link", { name: CONTACT_ADDRESS });
    expect(address).toHaveAttribute("href", CONTACT_MAPS_URL);
    expect(address).toHaveAttribute("target", "_blank");
    expect(address).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: CONTACT_PHONE })).toHaveAttribute("href", `tel:${CONTACT_PHONE_E164}`);
    expect(screen.getByText(`${F("address")}:`)).toBeInTheDocument();
    expect(screen.getByText(`${F("hotline")}:`)).toBeInTheDocument();
  });

  it("lists the four places to explore, in order, with the names of the header", async () => {
    await renderApp(<SiteFooter />);

    const nav = screen.getByRole("navigation", { name: F("explore.title") });
    expect(within(nav).getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      [H("nav.shop"), "/shop"],
      [H("nav.newIn"), "/new-in"],
      [H("nav.collections"), "/collections"],
      [H("nav.about"), "/about"],
    ]);
  });

  it("lists the three legal documents under the policies heading", async () => {
    await renderApp(<SiteFooter />);

    const nav = screen.getByRole("navigation", { name: F("policies.title") });
    expect(within(nav).getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")])).toEqual(
      LEGAL_DOCS.map((d) => [msg(`shared.legal.${d.key}`), d.path])
    );
  });

  it("has the language choice in its own column", async () => {
    await renderApp(<SiteFooter />);

    expect(screen.getByRole("heading", { level: 2, name: F("language.title") })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: msg("common.language.label") })).toBeInTheDocument();
  });

  it("has the icon row: email first, then each social profile", async () => {
    await renderApp(<SiteFooter />);

    for (const { label } of CONTACT_LINKS) expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  });

  it("says the year it is in the copyright line", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2031-05-05T05:00:00Z"));
    try {
      await renderApp(<SiteFooter />);

      expect(screen.getByText("© 2031 DOOVAN. Bảo lưu mọi quyền.")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("speaks English in English", async () => {
    await renderApp(<SiteFooter />, { locale: "en" });

    expect(screen.getByText(F("tagline", "en"))).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: F("policies.title", "en") })).toBeInTheDocument();
  });
});

describe("CHR-2 the icon row", () => {
  const row = (props: Partial<React.ComponentProps<typeof SocialIcons>> = {}) => renderApp(<SocialIcons linkClassName="icon-link" {...props} />);

  it("has a link for the email and each profile, named after it, in that order", async () => {
    await row();

    expect(screen.getAllByRole("link").map((a) => a.getAttribute("aria-label"))).toEqual(["Email", ...SOCIALS.map((s) => s.label)]);
  });

  it("opens a profile in a new tab and does not give it the page, but opens the email in the same one", async () => {
    await row();

    const instagram = screen.getByRole("link", { name: "Instagram" });
    expect(instagram).toHaveAttribute("target", "_blank");
    expect(instagram).toHaveAttribute("rel", "noopener noreferrer");
    expect(instagram).toHaveAttribute("href", "https://www.instagram.com/doovan.vn");
    expect(screen.getByRole("link", { name: "Facebook" })).toHaveAttribute("href", "https://www.facebook.com/doovan.vn");
    const email = screen.getByRole("link", { name: "Email" });
    expect(email).not.toHaveAttribute("target");
    expect(email).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
  });

  it("puts the name in a tooltip, applies the class given, and draws icons of the size asked for", async () => {
    const { container } = await row({ iconSize: 22, className: "gap-9" });

    const link = screen.getByRole("link", { name: "Facebook" });
    expect(link).toHaveAttribute("title", "Facebook");
    expect(link).toHaveClass("icon-link");
    expect(container.querySelector("svg")).toHaveAttribute("width", "22");
    expect(container.querySelector("ul")).toHaveClass("gap-9");
  });

  it("draws icons 18 pixels wide unless told otherwise", async () => {
    const { container } = await row();

    expect(container.querySelector("svg")).toHaveAttribute("width", "18");
  });
});

describe("CHR-3 the language choice in the footer", () => {
  const footer = (locale: "vi" | "en" = "vi") => renderApp(<LanguageSwitcher />, { locale });

  it("lists each language by its own name, the open one marked", async () => {
    await footer();

    const buttons = within(screen.getByRole("list", { name: msg("common.language.label") })).getAllByRole("button");
    expect(buttons.map((b) => [b.textContent, b.getAttribute("lang"), b.getAttribute("aria-current")])).toEqual([
      ["Tiếng Việt", "vi", "true"],
      ["English", "en", null],
    ]);
  });

  it("puts a tick only after the open language", async () => {
    await footer();

    expect(screen.getByRole("button", { name: "Tiếng Việt" }).querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("button", { name: "English" }).querySelector("svg")).toBeNull();
  });

  it("marks English as the open one on the English site", async () => {
    await footer("en");

    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Tiếng Việt" })).not.toHaveAttribute("aria-current");
  });

  it("changes the language of the page that is open, keeping its path and its query, without scrolling", async () => {
    navigation.pathname = "/shop/tops";
    window.history.replaceState(null, "", "/vi/shop/tops?sort=price");
    await footer();

    await userEvent.click(screen.getByRole("button", { name: "English" }));

    expect(navigation.router.replace).toHaveBeenCalledWith("/shop/tops?sort=price", { locale: "en", scroll: false });
  });

  it("changes nothing when the language that is open is chosen again", async () => {
    await footer();

    await userEvent.click(screen.getByRole("button", { name: "Tiếng Việt" }));

    expect(navigation.router.replace).not.toHaveBeenCalled();
  });

  it("chooses Vietnamese from the English site", async () => {
    navigation.pathname = "/";
    await footer("en");

    await userEvent.click(screen.getByRole("button", { name: "Tiếng Việt" }));

    expect(navigation.router.replace).toHaveBeenCalledWith("/", { locale: "vi", scroll: false });
  });
});
