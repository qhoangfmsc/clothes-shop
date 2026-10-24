import { createRef } from "react";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Carousel, { type CarouselHandle, type CarouselProps } from "@/src/app/[locale]/_components/Carousel";
import { CarouselArrow, CarouselDots } from "@/src/app/[locale]/_components/CarouselControls";
import { observers, scrolls } from "@/tests/_support/browser-apis";
import { carouselLayout } from "@/tests/_support/carousel-layout";
import { media } from "@/tests/_support/media-query";
import { msg, msgf } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";

/* The one carousel of the project (specs/platform/ui-kit.md, flows UI-20 to UI-24E). The layout is a stand-in: slides 300px wide, 16px apart. */

const C = (key: string, vars?: Record<string, string | number>, locale: "vi" | "en" = "vi") => (vars ? msgf(`shared.carousel.${key}`, vars, locale) : msg(`shared.carousel.${key}`, locale));
const STEP = 316;
let restoreLayout = () => {};
afterEach(() => {
  restoreLayout();
  vi.useRealTimers();
});

interface MountOptions extends Partial<CarouselProps> {
  slides?: number;
  trackWidth?: number;
  slideWidth?: number;
}

async function mount({ slides = 3, trackWidth = 300, slideWidth = 300, ...props }: MountOptions = {}) {
  restoreLayout = carouselLayout({ trackWidth, slideWidth, gap: 16 });
  const view = await renderApp(
    <Carousel ariaLabel="Featured" autoplay={false} loop={false} {...props}>
      {Array.from({ length: slides }, (_, i) => (
        <div key={i}>slide {i + 1}</div>
      ))}
    </Carousel>
  );
  const region = screen.getByRole("region", { name: "Featured" });
  const track = region.querySelector(".overflow-x-auto") as HTMLElement;
  return { ...view, region, track };
}

const dots = () => screen.queryAllByRole("button", { name: /^Đến mục/ });
const activeDot = () => dots().findIndex((dot) => dot.getAttribute("aria-current") === "true");
const arrow = (direction: "prev" | "next") => screen.queryByRole("button", { name: C(direction) });
const lastScroll = () => scrolls[scrolls.length - 1];
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 200)));

describe("UI-20 what it shows", () => {
  it("is a named carousel region whose slides know their number", async () => {
    const { region, track } = await mount({ slides: 3 });

    expect(region).toHaveAttribute("aria-roledescription", "carousel");
    const slides = within(track).getAllByRole("group");
    expect(slides.map((s) => s.getAttribute("aria-label"))).toEqual([C("slide", { number: 1, total: 3 }), C("slide", { number: 2, total: 3 }), C("slide", { number: 3, total: 3 })]);
    expect(slides[0]).toHaveAttribute("aria-roledescription", "slide");
  });

  it("makes one page per slide, with a dot for each, the first one current", async () => {
    await mount({ slides: 3 });

    expect(dots()).toHaveLength(3);
    expect(activeDot()).toBe(0);
    expect(dots()[2]).toHaveAccessibleName(C("dot", { number: 3, total: 3 }));
  });

  it("makes a page of every group of slides that fit at once, the last page being the last reachable stop", async () => {
    await mount({ slides: 5, trackWidth: 632, slideWidth: 300 });

    expect(dots()).toHaveLength(3);
  });

  it("shows no arrows and no dots for a single slide, and keeps no row for the dots", async () => {
    const { region } = await mount({ slides: 1 });

    expect(arrow("next")).not.toBeInTheDocument();
    expect(dots()).toHaveLength(0);
    expect(region.querySelector(".h-8")).toBeNull();
  });

  it("shows no arrows or dots when all slides fit on the screen", async () => {
    await mount({ slides: 2, trackWidth: 632, slideWidth: 300 });

    expect(arrow("next")).not.toBeInTheDocument();
    expect(dots()).toHaveLength(0);
  });

  it("puts the dots below the slides by default and over them on request", async () => {
    const below = await mount({ slides: 3 });
    expect(below.region.querySelector(".h-8.mt-2")).not.toBeNull();
    below.unmount();

    const over = await mount({ slides: 3, dots: "overlay" });
    expect(over.region.querySelector(".h-8.mt-2")).toBeNull();
    expect(dots()).toHaveLength(3);
  });

  it("can leave the dots out, and the arrows too", async () => {
    await mount({ slides: 3, dots: false, arrows: false });

    expect(dots()).toHaveLength(0);
    expect(arrow("next")).not.toBeInTheDocument();
  });

  it("turns the number of slides and the gap into classes, one per screen size", async () => {
    const { region } = await mount({ slides: 3, slidesPerView: { base: 1, sm: 2, lg: 4 }, gap: { base: 2, lg: 6 } });

    for (const cls of ["[--slides:1]", "sm:[--slides:2]", "lg:[--slides:4]", "[--gap:0.5rem]", "lg:[--gap:1.5rem]"]) expect(region.className).toContain(cls);
    expect(region.className).not.toContain("sm:[--gap");
  });

  it("takes a single value for every screen size", async () => {
    const { region } = await mount({ slides: 3, slidesPerView: 2.5, gap: 0 });

    expect(region.className).toContain("[--slides:2.5]");
    expect(region.className).toContain("[--gap:0px]");
  });

  it("passes its extra classes to the region and to every slide, and can fill its parent's height", async () => {
    const { region, track } = await mount({ slides: 2, className: "my-region", slideClassName: "my-slide", fill: true });

    expect(region.className).toContain("my-region");
    expect(region.className).toContain("h-full");
    expect(within(track).getAllByRole("group")[0].className).toContain("my-slide");
    expect(track.className).toContain("h-full");
  });
});

describe("UI-21 moving by arrows, dots and keys", () => {
  it("hides 'previous' at the start and 'next' at the end when not looping", async () => {
    const { track } = await mount({ slides: 3 });
    expect(arrow("prev")).not.toBeInTheDocument();
    expect(arrow("next")).toBeInTheDocument();

    track.scrollLeft = 2 * STEP;
    fireEvent.scroll(track);

    await waitFor(() => expect(arrow("next")).not.toBeInTheDocument());
    expect(arrow("prev")).toBeInTheDocument();
    expect(activeDot()).toBe(2);
  });

  it("goes to the next and previous page with the arrows", async () => {
    await mount({ slides: 3 });

    fireEvent.click(arrow("next")!);
    expect(lastScroll().left).toBe(STEP);
    await waitFor(() => expect(activeDot()).toBe(1));
    fireEvent.click(arrow("prev")!);

    expect(lastScroll().left).toBe(0);
    await waitFor(() => expect(activeDot()).toBe(0));
  });

  it("goes to the page of the dot", async () => {
    await mount({ slides: 3 });

    fireEvent.click(dots()[2]);

    expect(lastScroll().left).toBe(2 * STEP);
    await waitFor(() => expect(activeDot()).toBe(2));
  });

  it("scrolls smoothly, or at once for a visitor who asked for less motion", async () => {
    await mount({ slides: 3 });
    fireEvent.click(arrow("next")!);
    expect(lastScroll().behavior).toBe("smooth");

    media.matching = (query) => query.includes("prefers-reduced-motion");
    fireEvent.click(arrow("next")!);

    expect(lastScroll().behavior).toBe("auto");
  });

  it("answers the arrow keys while focus is inside, and nothing else", async () => {
    const { region } = await mount({ slides: 3 });
    const first = within(region).getByText("slide 1");

    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(lastScroll().left).toBe(STEP);
    await waitFor(() => expect(activeDot()).toBe(1));
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(lastScroll().left).toBe(0);
    const count = scrolls.length;
    fireEvent.keyDown(first, { key: "Enter" });

    expect(scrolls).toHaveLength(count);
  });

  it("ignores the arrow keys when keyboard control is off, or when there is only one page", async () => {
    const off = await mount({ slides: 3, keyboard: false });
    fireEvent.keyDown(within(off.region).getByText("slide 1"), { key: "ArrowRight" });
    expect(scrolls).toHaveLength(0);
    off.unmount();

    const single = await mount({ slides: 1 });
    fireEvent.keyDown(within(single.region).getByText("slide 1"), { key: "ArrowRight" });
    expect(scrolls).toHaveLength(0);
  });

  it("tells the caller which page is showing, now and after each move", async () => {
    const onPageChange = vi.fn();
    await mount({ slides: 3, onPageChange });
    expect(onPageChange).toHaveBeenLastCalledWith(0);

    fireEvent.click(dots()[1]);

    await waitFor(() => expect(onPageChange).toHaveBeenLastCalledWith(1));
  });

  it("can be moved from outside with next, prev and scrollToPage", async () => {
    const handle = createRef<CarouselHandle>();
    await mount({ slides: 4, carouselRef: handle });

    act(() => handle.current?.next());
    expect(lastScroll().left).toBe(STEP);
    await waitFor(() => expect(activeDot()).toBe(1));
    act(() => handle.current?.prev());
    expect(lastScroll().left).toBe(0);
    act(() => handle.current?.scrollToPage(3));
    expect(lastScroll().left).toBe(3 * STEP);
    act(() => handle.current?.scrollToPage(99));
    expect(lastScroll().left).toBe(3 * STEP);
    act(() => handle.current?.scrollToPage(-4));
    expect(lastScroll().left).toBe(0);
  });

  it("does not go past either end when not looping, and does nothing with one page", async () => {
    const handle = createRef<CarouselHandle>();
    const { track } = await mount({ slides: 3, carouselRef: handle });
    act(() => handle.current?.prev());
    expect(lastScroll().left).toBe(0);
    track.scrollLeft = 2 * STEP;
    fireEvent.scroll(track);
    await waitFor(() => expect(activeDot()).toBe(2));

    act(() => handle.current?.next());

    expect(lastScroll().left).toBe(2 * STEP);
  });
});

describe("UI-22 going round (loop)", () => {
  it("frames the real slides with copies of the first and last ones, hidden from everyone but the eye", async () => {
    const { track } = await mount({ slides: 3, loop: true });

    const children = Array.from(track.children);
    expect(children).toHaveLength(5);
    expect(children.map((c) => c.textContent)).toEqual(["slide 3", "slide 1", "slide 2", "slide 3", "slide 1"]);
    expect(children.map((c) => c.getAttribute("aria-hidden"))).toEqual(["true", null, null, null, "true"]);
    expect(children[0]).toHaveAttribute("inert");
    expect(children[2]).not.toHaveAttribute("inert");
    expect(children[0].getAttribute("aria-label")).toBe(C("slide", { number: 3, total: 3 }));
  });

  it("starts on the first real slide, not on the copy before it", async () => {
    const { track } = await mount({ slides: 3, loop: true });

    expect(track.scrollLeft).toBe(STEP);
    expect(activeDot()).toBe(0);
  });

  it("keeps both arrows, since there is always somewhere to go", async () => {
    await mount({ slides: 3, loop: true });

    expect(arrow("prev")).toBeInTheDocument();
    expect(arrow("next")).toBeInTheDocument();
  });

  it("goes from the last slide on to the copy of the first, then jumps unseen to the real first", async () => {
    const { track } = await mount({ slides: 3, loop: true });
    fireEvent.click(arrow("next")!);
    fireEvent.click(arrow("next")!);
    expect(lastScroll().left).toBe(3 * STEP);
    expect(activeDot()).toBe(0);
    await waitFor(() => expect(activeDot()).toBe(2));

    fireEvent.click(arrow("next")!);
    expect(lastScroll().left).toBe(4 * STEP);
    await settle();

    expect(track.scrollLeft).toBe(STEP);
    await waitFor(() => expect(activeDot()).toBe(0));
  });

  it("goes from the first slide back to the copy of the last, then jumps unseen to the real last", async () => {
    const { track } = await mount({ slides: 3, loop: true });

    fireEvent.click(arrow("prev")!);
    expect(lastScroll().left).toBe(0);
    await settle();

    expect(track.scrollLeft).toBe(3 * STEP);
  });

  it("goes to the page of a dot through the real slides", async () => {
    await mount({ slides: 3, loop: true });

    fireEvent.click(dots()[2]);

    expect(lastScroll().left).toBe(3 * STEP);
  });

  it("scrolls to a page by number from outside, clamped to the pages there are", async () => {
    const handle = createRef<CarouselHandle>();
    await mount({ slides: 3, loop: true, carouselRef: handle });

    act(() => handle.current?.scrollToPage(99));
    expect(lastScroll().left).toBe(3 * STEP);
    act(() => handle.current?.scrollToPage(-1));

    expect(lastScroll().left).toBe(STEP);
  });

  it("does not loop when every slide fits, or when it is turned off", async () => {
    const fits = await mount({ slides: 2, trackWidth: 632, slidesPerView: 2, loop: true });
    expect(fits.track.children).toHaveLength(2);
    fits.unmount();

    const off = await mount({ slides: 3, loop: false });
    expect(off.track.children).toHaveLength(3);
  });

  it("moves a whole page at a time when several slides show at once", async () => {
    const handle = createRef<CarouselHandle>();
    const { track } = await mount({ slides: 5, trackWidth: 632, slideWidth: 300, slidesPerView: 2, loop: true, carouselRef: handle });
    expect(track.children).toHaveLength(9);
    expect(dots()).toHaveLength(3);

    act(() => handle.current?.next());

    expect(lastScroll().left).toBe((2 + 2) * STEP);
    await waitFor(() => expect(activeDot()).toBe(1));
  });

  it("snaps to the start of the nearest page when the size changes", async () => {
    const { track } = await mount({ slides: 3, loop: true });
    fireEvent.click(dots()[1]);
    await waitFor(() => expect(activeDot()).toBe(1));
    expect(track.scrollLeft).toBe(2 * STEP);
    restoreLayout();
    restoreLayout = carouselLayout({ trackWidth: 300, slideWidth: 200, gap: 16 });

    act(() => observers.resize[observers.resize.length - 1].trigger());

    expect(track.scrollLeft).toBe(3 * 216);
  });
});

describe("UI-23 playing by itself", () => {
  it("does not play unless asked to", async () => {
    await mount({ slides: 3 });

    expect(observers.intersection).toHaveLength(0);
  });

  it("moves on every interval while on screen and not held", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await mount({ slides: 3, autoplay: 1000 });
      act(() => observers.intersection[observers.intersection.length - 1].trigger(true));

      await act(async () => void vi.advanceTimersByTime(1000));

      expect(lastScroll().left).toBe(STEP);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not play when there is only one page", async () => {
    await mount({ slides: 1, autoplay: 1000 });

    expect(observers.intersection).toHaveLength(0);
  });

  it("holds for a moment after a dot was used", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await mount({ slides: 3, autoplay: 1000 });
      act(() => observers.intersection[observers.intersection.length - 1].trigger(true));
      fireEvent.click(dots()[2]);
      const count = scrolls.length;

      await act(async () => void vi.advanceTimersByTime(2000));
      expect(scrolls).toHaveLength(count);
      await act(async () => void vi.advanceTimersByTime(2500));

      expect(scrolls.length).toBeGreaterThan(count);
    } finally {
      vi.useRealTimers();
    }
  });

  it("holds for a moment after an arrow was used", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await mount({ slides: 3, autoplay: 1000 });
      act(() => observers.intersection[observers.intersection.length - 1].trigger(true));
      fireEvent.click(arrow("next")!);
      const count = scrolls.length;

      await act(async () => void vi.advanceTimersByTime(2000));
      expect(scrolls).toHaveLength(count);
      await act(async () => void vi.advanceTimersByTime(2500));

      expect(scrolls.length).toBeGreaterThan(count);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("UI-24 dragging with the mouse", () => {
  const drag = (track: HTMLElement, dx: number, extra: PointerEventInit = {}) => {
    fireEvent.pointerDown(track, { pointerType: "mouse", button: 0, clientX: 200, ...extra });
    fireEvent(window, new PointerEvent("pointermove", { clientX: 200 + dx }));
    fireEvent(window, new PointerEvent("pointerup", {}));
  };

  it("scrolls with the mouse and settles on the nearest slide when let go", async () => {
    const { track } = await mount({ slides: 3 });
    track.scrollLeft = STEP;

    fireEvent.pointerDown(track, { pointerType: "mouse", button: 0, clientX: 200 });
    fireEvent(window, new PointerEvent("pointermove", { clientX: 0 }));
    expect(track.scrollLeft).toBe(STEP + 200);
    expect(track.className).toContain("cursor-grabbing");
    fireEvent(window, new PointerEvent("pointerup", {}));

    expect(lastScroll().left).toBe(2 * STEP);
    expect(track.className).not.toContain("cursor-grabbing");
  });

  it("treats a small movement as a click, not a drag", async () => {
    const { track } = await mount({ slides: 3 });

    drag(track, 4);

    expect(scrolls).toHaveLength(0);
    expect(track.className).not.toContain("cursor-grabbing");
  });

  it("does not follow the link under the mouse after a drag, but only that one click", async () => {
    const onClick = vi.fn();
    restoreLayout = carouselLayout({ trackWidth: 300, slideWidth: 300, gap: 16 });
    await renderApp(
      <Carousel ariaLabel="Featured" autoplay={false} loop={false}>
        {[1, 2, 3].map((n) => (
          <a key={n} href={`#${n}`} onClick={onClick}>
            link {n}
          </a>
        ))}
      </Carousel>
    );
    const track = screen.getByRole("region").querySelector(".overflow-x-auto") as HTMLElement;
    drag(track, -80);

    fireEvent.click(screen.getByText("link 1"));
    expect(onClick).not.toHaveBeenCalled();
    await act(() => new Promise((resolve) => setTimeout(resolve, 10)));
    fireEvent.click(screen.getByText("link 1"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a finger", { pointerType: "touch" }],
    ["the right button", { pointerType: "mouse", button: 2 }],
  ])("is not started by %s", async (_label, init) => {
    const { track } = await mount({ slides: 3 });

    drag(track, -80, init);

    expect(scrolls).toHaveLength(0);
    expect(track.scrollLeft).toBe(0);
  });

  it("is off when dragging is turned off", async () => {
    const { track } = await mount({ slides: 3, draggable: false });

    drag(track, -80);

    expect(scrolls).toHaveLength(0);
  });

  it("only offers the grab hand when there is something to drag", async () => {
    const many = await mount({ slides: 3 });
    expect(many.track.className).toContain("cursor-grab");
    many.unmount();

    const few = await mount({ slides: 1 });
    expect(few.track.className).not.toContain("cursor-grab");
    few.unmount();

    const off = await mount({ slides: 3, draggable: false });
    expect(off.track.className).not.toContain("cursor-grab");
  });

  it("does not start the browser's own image drag", async () => {
    const { track } = await mount({ slides: 2 });

    const notCancelled = fireEvent.dragStart(track);

    expect(notCancelled).toBe(false);
  });
});

describe("UI-24E arrows and dots as parts", () => {
  it("an arrow has a name per direction, can be locked and takes a tone and extra classes", async () => {
    const onClick = vi.fn();
    const view = await renderApp(<CarouselArrow direction="prev" onClick={onClick} className="left-3" />);
    expect(screen.getByRole("button", { name: C("prev") }).className).toContain("left-3");
    expect(screen.getByRole("button", { name: C("prev") }).className).toContain("bg-[var(--color-noir)]/50");
    fireEvent.click(screen.getByRole("button", { name: C("prev") }));
    expect(onClick).toHaveBeenCalledTimes(1);
    view.unmount();

    await renderApp(<CarouselArrow direction="next" onClick={onClick} tone="onSurface" disabled />);
    expect(screen.getByRole("button", { name: C("next") })).toBeDisabled();
    expect(screen.getByRole("button", { name: C("next") }).className).toContain("bg-[var(--bg-primary)]");
  });

  it("dots show nothing for fewer than two, mark the current one and report the one clicked", async () => {
    const onSelect = vi.fn();
    const one = await renderApp(<CarouselDots count={1} index={0} onSelect={onSelect} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    one.unmount();

    await renderApp(<CarouselDots count={3} index={1} onSelect={onSelect} tone="onSurface" className="extra" />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("aria-current"))).toEqual(["false", "true", "false"]);
    expect(buttons[1].firstElementChild!.className).toContain("w-6");
    expect(buttons[0].firstElementChild!.className).toContain("bg-[var(--color-obsidian)]/20");
    fireEvent.click(buttons[2]);
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("speaks English in English", async () => {
    await renderApp(<CarouselDots count={2} index={0} onSelect={() => {}} />, { locale: "en" });

    expect(screen.getByRole("button", { name: C("dot", { number: 1, total: 2 }, "en") })).toBeInTheDocument();
  });
});
