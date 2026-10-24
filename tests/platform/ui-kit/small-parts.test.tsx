import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import Checkbox from "@/src/app/[locale]/_components/Checkbox";
import CopyButton from "@/src/app/[locale]/_components/CopyButton";
import JsonLd from "@/src/app/[locale]/_components/JsonLd";
import OrderPaymentBadge from "@/src/app/[locale]/_components/OrderPaymentBadge";
import PendingActionNotice from "@/src/app/[locale]/_components/PendingActionNotice";
import ProductBagButton from "@/src/app/[locale]/_components/ProductBagButton";
import ProductLink from "@/src/app/[locale]/_components/ProductLink";
import { useBreakpoint } from "@/src/hooks/useMediaQuery";
import { useSortOptions } from "@/src/hooks/use-sort-options";
import { ADMIN_BADGE_STYLES, PRODUCT_CARD_BADGE_STYLES, PRODUCT_DETAIL_BADGE_STYLES } from "@/src/lib/product-badge";
import { buildOrderInquiryHref, CONTACT_PATH, getPurchaseMode, hasPublicPrice, isPurchasable } from "@/src/lib/product-purchase";
import { PRODUCT_BADGES } from "@/src/types/enums";
import { msg, MESSAGES } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* The small shared parts (specs/platform/ui-kit.md, flows UI-33 to UI-40E). */

describe("UI-33 the themed checkbox", () => {
  it("is a real checkbox that reports what it became", async () => {
    const onCheckedChange = vi.fn();
    await renderApp(<Checkbox checked={false} onCheckedChange={onCheckedChange} aria-label="Pick" />);

    await userEvent.click(screen.getByRole("checkbox", { name: "Pick" }));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("reports false when a ticked one is clicked", async () => {
    const onCheckedChange = vi.fn();
    await renderApp(<Checkbox checked onCheckedChange={onCheckedChange} aria-label="Pick" />);

    await userEvent.click(screen.getByRole("checkbox", { name: "Pick" }));

    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it("is named by a label around it", async () => {
    await renderApp(
      <label>
        Remember me
        <Checkbox checked={false} onCheckedChange={() => {}} />
      </label>
    );

    expect(screen.getByRole("checkbox", { name: "Remember me" })).toBeInTheDocument();
  });

  it("shows a dash and says 'mixed' when some are selected, and a tick when ticked", async () => {
    const { container, rerender } = await renderApp(<Checkbox checked={false} indeterminate onCheckedChange={() => {}} aria-label="All" />);
    expect((screen.getByRole("checkbox") as HTMLInputElement).indeterminate).toBe(true);
    expect(screen.getByRole("checkbox")).toBePartiallyChecked();
    expect(container.querySelector("svg.lucide-minus")).not.toBeNull();

    rerender(<Checkbox checked indeterminate={false} onCheckedChange={() => {}} aria-label="All" />);
    expect((screen.getByRole("checkbox") as HTMLInputElement).indeterminate).toBe(false);
    expect(container.querySelector("svg.lucide-check")).not.toBeNull();
  });

  it("fills the box only when ticked or mixed", async () => {
    const { container, rerender } = await renderApp(<Checkbox checked={false} onCheckedChange={() => {}} aria-label="x" />);
    const box = () => container.querySelector("[aria-hidden]")!;
    expect(box().className).toContain("bg-[var(--color-white)]");

    rerender(<Checkbox checked onCheckedChange={() => {}} aria-label="x" />);
    expect(box().className).toContain("bg-[var(--accent-primary)]");
    rerender(<Checkbox checked={false} indeterminate onCheckedChange={() => {}} aria-label="x" />);
    expect(box().className).toContain("bg-[var(--accent-primary)]");
  });

  it("can be switched off and takes extra attributes and classes", async () => {
    const onCheckedChange = vi.fn();
    const { container } = await renderApp(<Checkbox checked={false} disabled name="agree" className="mine" onCheckedChange={onCheckedChange} aria-label="x" />);

    await userEvent.click(screen.getByRole("checkbox"));

    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("checkbox")).toHaveAttribute("name", "agree");
    expect((container.firstElementChild as HTMLElement).className).toContain("mine");
  });
});

describe("UI-34 the copy button", () => {
  function clipboard(write: (text: string) => Promise<void>) {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn(write) } });
    return navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
  }

  it("is named after what it copies", async () => {
    await renderApp(<CopyButton value="ABC" label="transfer code" />);

    const button = screen.getByRole("button", { name: msg("shared.feedback.copy.aria").replace("{field}", "transfer code") });
    expect(button).toHaveAttribute("title", button.getAttribute("aria-label"));
  });

  it("puts the value on the clipboard, says so, and shows a tick for a moment", async () => {
    const write = clipboard(async () => {});
    const { container } = await renderApp(<CopyButton value="ABC123" label="code" />);
    expect(container.querySelector("svg.lucide-copy")).not.toBeNull();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await userEvent.click(screen.getByRole("button"), { advanceTimers: vi.advanceTimersByTime });

      expect(write).toHaveBeenCalledWith("ABC123");
      expect(await screen.findByText(msg("shared.feedback.copy.copied"))).toBeInTheDocument();
      expect(container.querySelector("svg.lucide-check")).not.toBeNull();
      await act(async () => void vi.advanceTimersByTime(1400));
      expect(container.querySelector("svg.lucide-check")).not.toBeNull();
      await act(async () => void vi.advanceTimersByTime(200));
      expect(container.querySelector("svg.lucide-copy")).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("tells the shopper to copy by hand when the browser refuses", async () => {
    clipboard(async () => Promise.reject(new Error("denied")));
    const { container } = await renderApp(<CopyButton value="ABC" label="code" />);

    await userEvent.click(screen.getByRole("button"));

    expect(await screen.findByText(msg("shared.feedback.copy.failed"))).toBeInTheDocument();
    expect(container.querySelector("svg.lucide-check")).toBeNull();
  });

  it("starts the tick over when copied twice quickly, and does not touch the page after it went away", async () => {
    clipboard(async () => {});
    const { container, unmount } = await renderApp(<CopyButton value="ABC" label="code" />);
    const copy = () => screen.getByRole("button", { name: /Sao chép/ });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await userEvent.click(copy(), { advanceTimers: vi.advanceTimersByTime });
      await act(async () => void vi.advanceTimersByTime(1000));
      await userEvent.click(copy(), { advanceTimers: vi.advanceTimersByTime });
      await act(async () => void vi.advanceTimersByTime(1000));
      expect(container.querySelector("svg.lucide-check")).not.toBeNull();
      await act(async () => void vi.advanceTimersByTime(600));
      expect(container.querySelector("svg.lucide-copy")).not.toBeNull();

      await userEvent.click(copy(), { advanceTimers: vi.advanceTimersByTime });
      const clear = vi.spyOn(globalThis, "clearTimeout");
      unmount();
      expect(clear).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("UI-35 structured data (JsonLd)", () => {
  it("writes the data as JSON inside an ld+json script", () => {
    const { container } = render(<JsonLd data={{ "@type": "Thing", name: "DOOVAN" }} />);

    const script = container.querySelector("script")!;
    expect(script).toHaveAttribute("type", "application/ld+json");
    expect(JSON.parse(script.innerHTML)).toEqual({ "@type": "Thing", name: "DOOVAN" });
  });

  it("takes a list of things too", () => {
    const { container } = render(<JsonLd data={[{ a: 1 }, { b: 2 }]} />);

    expect(JSON.parse(container.querySelector("script")!.innerHTML)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("escapes < so that nothing in the data can close the script", () => {
    const { container } = render(<JsonLd data={{ name: "</script><script>alert(1)</script>" }} />);

    const html = container.querySelector("script")!.innerHTML;
    expect(html).not.toContain("<");
    expect(html).toContain("\\u003c/script>");
    expect(JSON.parse(html).name).toBe("</script><script>alert(1)</script>");
  });
});

describe("UI-36 the 'work waiting' box (PendingActionNotice)", () => {
  const BASE = { title: "3 orders to handle", includes: "Orders that are paid.", how: "Open each and confirm it.", viewLabel: "Show them", onToggle: () => {} };
  const N = (key: string) => msg(`admin.components.pendingNotice.${key}`);

  it("shows nothing for a user without the permission to see the count (no number)", async () => {
    const { container } = await renderApp(<PendingActionNotice {...BASE} count={undefined} active={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing when there is nothing waiting", async () => {
    const { container } = await renderApp(<PendingActionNotice {...BASE} count={0} active={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows what is counted, what is not, how to deal with it and a note, and a button that turns the filter on", async () => {
    const onToggle = vi.fn();
    await renderApp(<PendingActionNotice {...BASE} count={3} active={false} excludes="Cancelled ones are left out." note="Mind the refunds." onToggle={onToggle} />);

    const box = screen.getByRole("region", { name: "3 orders to handle" });
    expect(box).toHaveTextContent("Orders that are paid.");
    expect(box).toHaveTextContent("Cancelled ones are left out.");
    expect(box).toHaveTextContent(`${N("howLabel")} Open each and confirm it.`);
    expect(box).toHaveTextContent("Mind the refunds.");
    expect(screen.queryByText(N("filtering"))).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Show them" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("leaves out the optional lines it was not given", async () => {
    await renderApp(<PendingActionNotice {...BASE} count={3} active={false} />);

    expect(screen.getByRole("region").querySelectorAll("p")).toHaveLength(2);
  });

  it("says the list is filtered while the filter is on, and offers 'view all' to turn it off", async () => {
    await renderApp(<PendingActionNotice {...BASE} count={3} active />);

    expect(screen.getByText(N("filtering"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: N("viewAll") })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Show them" })).not.toBeInTheDocument();
  });

  it("uses the caller's own words for 'view all'", async () => {
    await renderApp(<PendingActionNotice {...BASE} count={3} active viewAllLabel="Back to all orders" />);

    expect(screen.getByRole("button", { name: "Back to all orders" })).toBeInTheDocument();
  });

  it("shows the extra line under the steps", async () => {
    await renderApp(<PendingActionNotice {...BASE} count={3} active={false} extra={<button>Approved ones</button>} />);

    expect(screen.getByRole("button", { name: "Approved ones" })).toBeInTheDocument();
  });

  it("at zero, with the filter on, shrinks to 'all done' with the way back, when asked to", async () => {
    const onToggle = vi.fn();
    await renderApp(<PendingActionNotice {...BASE} count={0} active keepWhenDone onToggle={onToggle} />);

    expect(screen.getByRole("status")).toHaveTextContent(N("allDone"));
    await userEvent.click(screen.getByRole("button", { name: N("viewAll") }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("at zero, uses the caller's words for the way back", async () => {
    await renderApp(<PendingActionNotice {...BASE} count={0} active keepWhenDone viewAllLabel="All requests" />);

    expect(screen.getByRole("button", { name: "All requests" })).toBeInTheDocument();
  });

  it.each([
    ["the filter is off", false, true],
    ["it was not asked to keep it", true, false],
  ])("at zero, shows nothing when %s", async (_label, active, keepWhenDone) => {
    const { container } = await renderApp(<PendingActionNotice {...BASE} count={0} active={active} keepWhenDone={keepWhenDone} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("UI-37 paid or not (OrderPaymentBadge)", () => {
  it.each([
    ["unpaid", "bg-[rgba(240,228,166,0.2)]"],
    ["paid", "bg-[rgba(163,177,138,0.15)]"],
    ["refunded", "bg-[rgba(143,163,180,0.15)]"],
  ])("says %s in the language of the page, in its own colour", async (status, colour) => {
    await renderApp(<OrderPaymentBadge status={status} />);

    const pill = screen.getByText(msg(`common.orderPaymentStatus.${status}`));
    expect(pill.className).toContain(colour);
  });

  it("speaks English in English", async () => {
    await renderApp(<OrderPaymentBadge status="paid" />, { locale: "en" });

    expect(screen.getByText(msg("common.orderPaymentStatus.paid", "en"))).toBeInTheDocument();
  });

  it("shows a status it does not know in a neutral colour instead of failing", async () => {
    const { container } = await renderApp(<OrderPaymentBadge status="mystery" />);

    expect(container.firstElementChild!.className).toContain("bg-[rgba(107,101,96,0.05)]");
  });
});

describe("UI-38 the bag button on a product card (ProductBagButton)", () => {
  const P = (badge: Parameters<typeof getPurchaseMode>[0]) => ({ id: "p 1", badge: badge ?? null });

  it("adds to the bag for a normal product, with the click handed on", async () => {
    const onAddToBag = vi.fn();
    await renderApp(<ProductBagButton product={P(null)} variant="icon" onAddToBag={onAddToBag} className="base" enabledClassName="lively" />);

    const button = screen.getByRole("button", { name: msg("shared.cart.productAction.addToBagAria") });
    await userEvent.click(button);

    expect(onAddToBag).toHaveBeenCalledTimes(1);
    expect(button.className).toContain("lively");
    expect(button.className).toContain("base");
  });

  it("shows the words, not only an icon, in its text form", async () => {
    await renderApp(<ProductBagButton product={P("new")} variant="text" onAddToBag={() => {}} className="b" />);

    const button = screen.getByRole("button", { name: msg("shared.cart.productAction.addToBag") });
    expect(button).not.toHaveAttribute("aria-label");
  });

  it("is locked and says 'sold out' for a sold-out product, and never adds", async () => {
    const onAddToBag = vi.fn();
    await renderApp(<ProductBagButton product={P("sold_out")} variant="icon" onAddToBag={onAddToBag} className="b" enabledClassName="lively" />);

    const button = screen.getByRole("button", { name: msg("shared.cart.productAction.soldOutAria") });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button.className).toContain("opacity-50");
    expect(button.className).not.toContain("lively");
    expect(onAddToBag).not.toHaveBeenCalled();
  });

  it("sends a custom order to the contact page with the product, and stops the card's link from opening", async () => {
    const onAddToBag = vi.fn();
    await renderApp(
      <a href="#card">
        <ProductBagButton product={P("custom_order")} variant="text" onAddToBag={onAddToBag} className="b" />
      </a>
    );
    const outer = vi.fn();
    document.addEventListener("click", outer);

    const notCancelled = fireEvent.click(screen.getByRole("button", { name: msg("shared.cart.productAction.customOrder") }));
    document.removeEventListener("click", outer);

    expect(notCancelled).toBe(false);
    expect(outer).not.toHaveBeenCalled();
    expect(navigation.router.push).toHaveBeenCalledWith("/contact?product=p%201");
    expect(onAddToBag).not.toHaveBeenCalled();
  });

  it("names the custom order button for screen readers in its icon form", async () => {
    await renderApp(<ProductBagButton product={P("custom_order")} variant="icon" onAddToBag={() => {}} className="b" />);

    expect(screen.getByRole("button", { name: msg("shared.cart.productAction.customOrderAria") })).toBeEnabled();
  });
});

describe("UI-39 link to a product (ProductLink)", () => {
  const product = { id: "p1", category: { slug: "women" }, subcategory: { slug: "dresses" } };

  it("links to the product page by its category and sub-category", async () => {
    await renderApp(<ProductLink product={product} className="mine">Silk dress</ProductLink>);

    const link = screen.getByRole("link", { name: "Silk dress" });
    expect(link).toHaveAttribute("href", "/shop/women/dresses/p1");
    expect(link.className).toContain("mine");
    expect(link).not.toHaveAttribute("target");
  });

  it("opens in a new tab, safely, when asked", async () => {
    await renderApp(<ProductLink product={product} newTab>Silk dress</ProductLink>);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it.each([
    ["deleted", null],
    ["unknown", undefined],
    ["without a category", { id: "p1", category: null, subcategory: { slug: "dresses" } }],
    ["without a sub-category", { id: "p1", category: { slug: "women" }, subcategory: null }],
  ])("shows plain text for a product that is %s", async (_label, value) => {
    const { container } = await renderApp(<ProductLink product={value} className="mine">Silk dress</ProductLink>);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container.querySelector("span")).toHaveTextContent("Silk dress");
    expect(container.querySelector("span")!.className).toContain("mine");
  });
});

describe("UI-40 sort labels, screen size and badge rules", () => {
  it("useSortOptions turns keys into the shared sort labels", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NextIntlClientProvider locale="vi" messages={MESSAGES.vi}>
        {children}
      </NextIntlClientProvider>
    );

    const { result } = renderHook(
      () =>
        useSortOptions([
          { value: "-createdAt", key: "newest" },
          { value: "name", key: "nameAsc" },
        ]),
      { wrapper }
    );

    expect(result.current).toEqual([
      { value: "-createdAt", label: msg("admin.components.crud.sort.newest") },
      { value: "name", label: msg("admin.components.crud.sort.nameAsc") },
    ]);
  });

  it.each([
    [390, { isMobile: true, isTablet: false, isDesktop: false }],
    [639, { isMobile: true, isTablet: false, isDesktop: false }],
    [640, { isMobile: false, isTablet: true, isDesktop: false }],
    [1023, { isMobile: false, isTablet: true, isDesktop: false }],
    [1024, { isMobile: false, isTablet: false, isDesktop: true }],
    [1920, { isMobile: false, isTablet: false, isDesktop: true }],
  ])("useBreakpoint at %spx", (width, expected) => {
    window.innerWidth = width;

    const { result } = renderHook(() => useBreakpoint());

    expect(result.current).toEqual(expected);
  });

  it("useBreakpoint follows the window when it is resized, and stops listening when it goes away", () => {
    window.innerWidth = 1200;
    const { result, unmount } = renderHook(() => useBreakpoint());
    expect(result.current.isDesktop).toBe(true);

    act(() => {
      window.innerWidth = 500;
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current.isMobile).toBe(true);

    const remove = vi.spyOn(window, "removeEventListener");
    unmount();
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("every badge has a style in each of the three places it is shown", () => {
    for (const styles of [PRODUCT_CARD_BADGE_STYLES, PRODUCT_DETAIL_BADGE_STYLES, ADMIN_BADGE_STYLES]) {
      expect(Object.keys(styles).sort()).toEqual([...PRODUCT_BADGES].sort());
    }
  });

  it("decides how a product can be bought from its badge", () => {
    expect(getPurchaseMode(null)).toBe("cart");
    expect(getPurchaseMode(undefined)).toBe("cart");
    expect(getPurchaseMode("new")).toBe("cart");
    expect(getPurchaseMode("sold_out")).toBe("soldOut");
    expect(getPurchaseMode("custom_order")).toBe("customOrder");
    expect(isPurchasable("sale")).toBe(true);
    expect(isPurchasable("sold_out")).toBe(false);
    expect(isPurchasable("custom_order")).toBe(false);
  });

  it("shows a price for everything but a custom order (a sold-out product keeps its price)", () => {
    expect(hasPublicPrice("custom_order")).toBe(false);
    expect(hasPublicPrice("sold_out")).toBe(true);
    expect(hasPublicPrice(null)).toBe(true);
    expect(hasPublicPrice(undefined)).toBe(true);
  });

  it("builds the contact link that carries the product, with the id made safe", () => {
    expect(CONTACT_PATH).toBe("/contact");
    expect(buildOrderInquiryHref("abc-1")).toBe("/contact?product=abc-1");
    expect(buildOrderInquiryHref("a b&c")).toBe("/contact?product=a%20b%26c");
  });
});
