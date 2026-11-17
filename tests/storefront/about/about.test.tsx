import { act, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AboutPage, { generateMetadata } from "@/src/app/[locale]/(public)/about/page";
import { SERVICES } from "@/src/app/[locale]/(public)/about/_common/constants";
import type { AppLocale } from "@/src/i18n/routing";
import { CONTACT_EMAIL } from "@/src/lib/contact";
import { intlServerModule } from "@/tests/_support/intl-server";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";

/* The About page: the invitation, the story and the services (specs/storefront/about.md, flows ABT-1 to ABT-5). */

const A = (key: string, locale: "vi" | "en" = "vi") => msg(`public.about.${key}`, locale);
const params = (locale: AppLocale) => ({ params: Promise.resolve({ locale }) });
afterEach(() => {
  window.innerWidth = 1024;
});

async function show(locale: AppLocale = "vi") {
  const page = await AboutPage(params(locale));
  return renderApp(<>{page}</>, { locale });
}
const storyGrid = () => screen.getByRole("heading", { level: 2, name: A("story.title") }).parentElement!.parentElement as HTMLElement;

describe("ABT-1 the page", () => {
  it("has the three parts in order: the invitation, the story and the services", async () => {
    const { container } = await show();

    const headings = screen.getAllByRole("heading").map((h) => [h.tagName, h.textContent]);
    expect(headings.slice(0, 2)).toEqual([["H1", A("hero.heading")], ["H2", A("story.title")]]);
    expect(container.querySelectorAll("main > section")).toHaveLength(3);
    expect(screen.getByRole("heading", { level: 2, name: A("services.title") })).toBeInTheDocument();
  });

  it("speaks English in English", async () => {
    await show("en");

    expect(screen.getByRole("heading", { level: 1, name: A("hero.heading", "en") })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: A("cta.button", "en") })).toBeInTheDocument();
  });

  it("tells the framework which language it renders", async () => {
    let seen = "";
    const original = intlServerModule.setRequestLocale;
    intlServerModule.setRequestLocale = (locale: string) => {
      seen = locale;
      original(locale);
    };
    try {
      await AboutPage(params("en"));
    } finally {
      intlServerModule.setRequestLocale = original;
    }

    expect(seen).toBe("en");
  });

  it("has a title with the brand, a description, language alternates and a share card", async () => {
    const meta = await generateMetadata(params("vi"));

    expect(meta.title).toBe(`${A("meta.title")} — DOOVAN`);
    expect(meta.description).toBe(A("meta.description"));
    expect(meta.alternates).toMatchObject({ canonical: "/vi/about", languages: { vi: "/vi/about", en: "/en/about", "x-default": "/vi/about" } });
    expect(meta.openGraph).toMatchObject({ url: "/vi/about", title: meta.title });
  });
});

describe("ABT-2 the invitation", () => {
  it("says what the page is about, invites, and states when the house was founded", async () => {
    await show();

    expect(screen.getByText(A("hero.label"))).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: A("hero.heading") })).toBeInTheDocument();
    expect(screen.getByText(A("hero.subheading"))).toBeInTheDocument();
    expect(screen.getByText(A("hero.established"))).toBeInTheDocument();
  });

  it("has a wallpaper that is only decoration: a picture with no words for a screen reader", async () => {
    const { container } = await show();

    const wallpaper = container.querySelector("main > section:first-child img")!;
    expect(decodeURIComponent(wallpaper.getAttribute("src") ?? "")).toContain("wall_sticker_pink_floral");
    expect(wallpaper).toHaveAttribute("alt", "");
  });
});

describe("ABT-3 the story", () => {
  it("has a line above, a title, the four paragraphs in order, and a quote", async () => {
    await show();

    expect(screen.getByText(A("story.subtitle"))).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: A("story.title") })).toBeInTheDocument();
    const paragraphs = ["first", "second", "third", "identity"].map((key) => screen.getByText(A(`story.paragraphs.${key}`)));
    expect(paragraphs).toHaveLength(4);
    for (let i = 1; i < paragraphs.length; i += 1) expect(paragraphs[i - 1].compareDocumentPosition(paragraphs[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(A("story.quote")).tagName).toBe("BLOCKQUOTE");
  });

  it("shows a picture with a description", async () => {
    await show();

    const img = screen.getByAltText(A("story.imageAlt"));
    expect(decodeURIComponent(img.getAttribute("src") ?? "")).toContain("wall_sticker_soft_cream_roses");
  });

  it("puts the words and the picture side by side on a wide screen, and one above the other on a narrow one", async () => {
    window.innerWidth = 1280;
    const wide = await show();
    expect(storyGrid().className).toContain("grid-cols-2");
    wide.unmount();

    window.innerWidth = 600;
    const narrow = await show();

    expect(storyGrid().className).toContain("grid-cols-1");
    expect(storyGrid().className).not.toContain("grid-cols-2");
  });

  it("switches at 1024 pixels exactly", async () => {
    window.innerWidth = 1023;
    const view = await show();
    expect(storyGrid().className).toContain("grid-cols-1");

    act(() => {
      window.innerWidth = 1024;
      window.dispatchEvent(new Event("resize"));
    });

    expect(storyGrid().className).toContain("grid-cols-2");
  });

  it("follows the window when it is resized, and stops listening once the page is gone", async () => {
    const remove = vi.spyOn(window, "removeEventListener");
    window.innerWidth = 1280;
    const view = await show();

    act(() => {
      window.innerWidth = 500;
      window.dispatchEvent(new Event("resize"));
    });
    expect(storyGrid().className).toContain("grid-cols-1");
    view.unmount();

    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});

describe("ABT-3E a window with no usable width", () => {
  it.each([[0], [320]])("keeps the story in one column at %i pixels, and breaks nothing", async (width) => {
    window.innerWidth = width;

    await show();

    expect(storyGrid().className).toContain("grid-cols-1");
    expect(screen.getByText(A("story.quote"))).toBeInTheDocument();
  });
});

describe("ABT-4 the services", () => {
  it("names the section and shows the three services in order, each with its mark, title and description", async () => {
    await show();

    const section = screen.getByRole("heading", { level: 2, name: A("services.title") }).closest("section")!;
    expect(within(section).getByText(A("services.label"))).toBeInTheDocument();
    const cards = within(section).getAllByRole("heading", { level: 3 });
    expect(cards.map((h) => h.textContent)).toEqual(["curated", "custom", "styling"].map((key) => A(`services.items.${key}.title`)));
    for (const { key, icon } of SERVICES) {
      expect(within(section).getByText(A(`services.items.${key}.description`))).toBeInTheDocument();
      expect(within(section).getByText(icon)).toBeInTheDocument();
    }
  });

  it("gives each card its own tint and its own border, which are really applied", async () => {
    await show();

    const section = screen.getByRole("heading", { level: 2, name: A("services.title") }).closest("section")!;
    const cards = within(section).getAllByRole("heading", { level: 3 }).map((h) => h.parentElement as HTMLElement);
    expect(cards.map((c) => c.style.background)).toEqual(["var(--color-rose-milk)", "var(--color-sage-cream)", "var(--color-lavender-cream)"]);
    expect(cards.map((c) => c.style.borderColor)).toEqual(["var(--border-light)", "var(--border-light)", "var(--border-light)"]);
    expect(cards.every((c) => c.className.split(" ").includes("border"))).toBe(true);
  });

  it("gives each mark the colour of its card's family", async () => {
    await show();

    const marks = SERVICES.map((s) => screen.getByText(s.icon));
    expect(marks.map((m) => m.style.color)).toEqual(["var(--color-dusty-rose)", "var(--color-sage)", "var(--color-lavender)"]);
  });
});

describe("ABT-5 the way to the shop", () => {
  it("is an email to the shop's inbox", async () => {
    await show();

    expect(screen.getByRole("link", { name: A("cta.button") })).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
  });
});
