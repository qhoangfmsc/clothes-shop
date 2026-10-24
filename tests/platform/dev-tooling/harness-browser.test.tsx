import { describe, expect, it, vi } from "vitest";
import { observers, resetBrowserApis, scrolls } from "@/tests/_support/browser-apis";
import { carouselLayout } from "@/tests/_support/carousel-layout";

/* The browser features jsdom lacks and the layout the carousel measures (specs/platform/dev-tooling.md, flow QG-17). */

describe("QG-17 browser stand-ins", () => {
  it("a ResizeObserver remembers what it watches, answers when told, and notes when it was stopped", () => {
    const callback = vi.fn();
    const target = document.createElement("div");
    const observer = new ResizeObserver(callback);

    observer.observe(target);
    expect(observers.resize).toHaveLength(1);
    expect(observers.resize[0].observed).toEqual([target]);
    observers.resize[0].trigger();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(observers.resize[0].disconnected).toBe(false);
    observer.disconnect();

    expect(observers.resize[0].disconnected).toBe(true);
  });

  it("an IntersectionObserver reports whatever the test says is on screen, and keeps its options", () => {
    const callback = vi.fn();
    const target = document.createElement("div");
    const observer = new IntersectionObserver(callback, { threshold: 0.3 });

    observer.observe(target);
    observers.intersection[0].trigger(true);
    observers.intersection[0].trigger(false);

    expect(callback.mock.calls.map((call) => call[0][0].isIntersecting)).toEqual([true, false]);
    expect(observers.intersection[0].options).toEqual({ threshold: 0.3 });
    expect(observers.intersection[0].observed).toEqual([target]);
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
    expect(observers.intersection[0].disconnected).toBe(true);
  });

  it("scrollTo moves scrollLeft, fires a scroll event and is written down", () => {
    const el = document.createElement("div");
    const onScroll = vi.fn();
    el.addEventListener("scroll", onScroll);

    el.scrollTo({ left: 120, behavior: "smooth" });
    el.scrollTo(40, 0);
    el.scrollTo({ top: 5 });

    expect(scrolls.map((s) => [s.left, s.behavior])).toEqual([[120, "smooth"], [40, undefined], [40, undefined]]);
    expect(el.scrollLeft).toBe(40);
    expect(onScroll).toHaveBeenCalledTimes(3);
    expect(scrolls[0].element).toBe(el);
  });

  it("is emptied between tests", () => {
    resetBrowserApis();

    expect(observers.resize).toEqual([]);
    expect(observers.intersection).toEqual([]);
    expect(scrolls).toEqual([]);
  });
});

describe("QG-17 carousel layout", () => {
  function row(count: number) {
    const track = document.createElement("div");
    for (let i = 0; i < count; i += 1) {
      const slide = document.createElement("div");
      slide.setAttribute("aria-roledescription", "slide");
      track.appendChild(slide);
    }
    return track;
  }

  it("puts the slides in a row, each as wide as asked, gap apart, inside a track of the given width", () => {
    const restore = carouselLayout({ trackWidth: 300, slideWidth: 200, gap: 10 });
    try {
      const track = row(3);
      const slides = Array.from(track.children) as HTMLElement[];

      expect(slides.map((s) => s.offsetLeft)).toEqual([0, 210, 420]);
      expect(slides.map((s) => s.offsetWidth)).toEqual([200, 200, 200]);
      expect(track.clientWidth).toBe(300);
      expect(track.scrollWidth).toBe(3 * 200 + 2 * 10);
    } finally {
      restore();
    }
  });

  it("measures nothing outside a carousel", () => {
    const restore = carouselLayout({ trackWidth: 300, slideWidth: 200, gap: 10 });
    try {
      const other = document.createElement("div");
      other.appendChild(document.createElement("p"));

      expect([other.offsetLeft, other.offsetWidth, other.clientWidth, other.scrollWidth]).toEqual([0, 0, 0, 0]);
    } finally {
      restore();
    }
  });

  it("puts jsdom back as it was", () => {
    const before = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    carouselLayout({ trackWidth: 300, slideWidth: 200, gap: 10 })();

    expect(Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth")).toEqual(before);
    expect(row(2).children[1]).toHaveProperty("offsetWidth", 0);
  });
});
