import { useRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoAdvance } from "@/src/hooks/use-auto-advance";
import { useBannerRotation } from "@/src/hooks/use-banner-rotation";
import { media } from "@/tests/_support/media-query";
import { observers } from "@/tests/_support/browser-apis";

/* The timer behind every auto-playing slider (specs/platform/ui-kit.md, flows UI-18 to UI-19E). */

let pauseFn: () => void;
function Probe({ enabled = true, intervalMs = 1000, onAdvance, pauseOnHover }: { enabled?: boolean; intervalMs?: number; onAdvance: () => void; pauseOnHover?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  pauseFn = useAutoAdvance(ref, { enabled, intervalMs, onAdvance, pauseOnHover });
  return (
    <div ref={ref} data-testid="el">
      <button>inner</button>
    </div>
  );
}

const el = () => screen.getByTestId("el");
const tick = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));
const inView = (value = true) => act(() => observers.intersection[observers.intersection.length - 1].trigger(value));

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
});

describe("UI-18 advancing on a timer", () => {
  it("does nothing until the element is on screen, then moves on every interval", async () => {
    const onAdvance = vi.fn();
    render(<Probe onAdvance={onAdvance} />);

    await tick(3000);
    expect(onAdvance).not.toHaveBeenCalled();
    inView();
    await tick(2000);

    expect(onAdvance).toHaveBeenCalledTimes(2);
  });

  it("stops again when the element goes off screen", async () => {
    const onAdvance = vi.fn();
    render(<Probe onAdvance={onAdvance} />);
    inView();
    await tick(1000);
    expect(onAdvance).toHaveBeenCalledTimes(1);

    inView(false);
    await tick(3000);

    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("watches for 30% of the element to be visible", () => {
    render(<Probe onAdvance={() => {}} />);

    expect(observers.intersection[0].options).toEqual({ threshold: 0.3 });
    expect(observers.intersection[0].observed).toEqual([el()]);
  });

  it("does nothing at all while switched off", async () => {
    const onAdvance = vi.fn();
    render(<Probe enabled={false} onAdvance={onAdvance} />);

    expect(observers.intersection).toHaveLength(0);
    await tick(5000);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("does not move for a visitor who asked for less motion", async () => {
    media.matching = (query) => query.includes("prefers-reduced-motion");
    const onAdvance = vi.fn();
    render(<Probe onAdvance={onAdvance} />);
    inView();

    await tick(3000);

    expect(onAdvance).not.toHaveBeenCalled();
  });

  it("does not move while the browser tab is hidden", async () => {
    const onAdvance = vi.fn();
    render(<Probe onAdvance={onAdvance} />);
    inView();
    Object.defineProperty(document, "hidden", { configurable: true, value: true });

    await tick(3000);
    expect(onAdvance).not.toHaveBeenCalled();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    await tick(1000);

    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("calls the latest function it was given, not the first", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const view = render(<Probe onAdvance={first} />);
    inView();

    view.rerender(<Probe onAdvance={second} />);
    await tick(1000);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("starts the timer over with the new interval when the interval changes", async () => {
    const onAdvance = vi.fn();
    const view = render(<Probe onAdvance={onAdvance} intervalMs={1000} />);
    inView();
    view.rerender(<Probe onAdvance={onAdvance} intervalMs={4000} />);
    inView();

    await tick(3000);
    expect(onAdvance).not.toHaveBeenCalled();
    await tick(1000);

    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("cleans up when it goes away: no timer, no observer, no listeners", async () => {
    const onAdvance = vi.fn();
    const view = render(<Probe onAdvance={onAdvance} />);
    inView();
    const target = el();
    const remove = vi.spyOn(target, "removeEventListener");

    view.unmount();
    await tick(5000);

    expect(onAdvance).not.toHaveBeenCalled();
    expect(observers.intersection[0].disconnected).toBe(true);
    expect(remove.mock.calls.map((call) => call[0]).sort()).toEqual(["focusin", "focusout", "pointerdown", "pointerenter", "pointerleave", "touchstart", "wheel"]);
  });
});

describe("UI-19 holding still while the visitor is using it", () => {
  it("waits while the mouse is over it, and for three seconds after the mouse leaves", async () => {
    const onAdvance = vi.fn();
    render(<Probe onAdvance={onAdvance} />);
    inView();

    fireEvent.pointerEnter(el());
    await tick(5000);
    expect(onAdvance).not.toHaveBeenCalled();
    fireEvent.pointerLeave(el());
    await tick(2000);
    expect(onAdvance).not.toHaveBeenCalled();
    await tick(2000);

    expect(onAdvance).toHaveBeenCalled();
  });

  it("keeps moving under the mouse when told hovering does not count (hero banners)", async () => {
    const onAdvance = vi.fn();
    render(<Probe onAdvance={onAdvance} pauseOnHover={false} />);
    inView();

    fireEvent.pointerEnter(el());
    await tick(2000);

    expect(onAdvance).toHaveBeenCalledTimes(2);
  });

  it("waits while focus is inside it, and moves again when focus leaves", async () => {
    const onAdvance = vi.fn();
    render(<Probe onAdvance={onAdvance} />);
    inView();

    fireEvent.focusIn(screen.getByRole("button"));
    await tick(3000);
    expect(onAdvance).not.toHaveBeenCalled();
    fireEvent.focusOut(screen.getByRole("button"));
    await tick(1000);

    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it.each(["pointerDown", "touchStart", "wheel"] as const)("holds for three seconds after a %s", async (event) => {
    const onAdvance = vi.fn();
    render(<Probe onAdvance={onAdvance} />);
    inView();

    fireEvent[event](el());
    await tick(2900);
    expect(onAdvance).not.toHaveBeenCalled();
    await tick(1100);

    expect(onAdvance).toHaveBeenCalled();
  });

  it("holds for three seconds when the code asks (after an arrow or dot was used)", async () => {
    const onAdvance = vi.fn();
    render(<Probe onAdvance={onAdvance} />);
    inView();

    act(() => pauseFn());
    await tick(2900);
    expect(onAdvance).not.toHaveBeenCalled();
    await tick(1100);

    expect(onAdvance).toHaveBeenCalled();
  });
});

describe("UI-19E rotating banners (useBannerRotation)", () => {
  let rotation: ReturnType<typeof useBannerRotation<HTMLDivElement>>;
  function Hero({ banners, intervalMs }: { banners: readonly unknown[]; intervalMs?: number }) {
    rotation = useBannerRotation<HTMLDivElement>(banners, intervalMs);
    return (
      <div ref={rotation.ref} data-testid="hero">
        {rotation.index}/{rotation.count}
      </div>
    );
  }
  const THREE = [{ a: 1 }, { a: 2 }, { a: 3 }];
  const hero = () => screen.getByTestId("hero").textContent;

  it("shows the first banner, moves on every five seconds and wraps around", async () => {
    render(<Hero banners={THREE} />);
    inView();
    expect(hero()).toBe("0/3");

    await tick(5000);
    expect(hero()).toBe("1/3");
    await tick(10_000);

    expect(hero()).toBe("0/3");
  });

  it("uses the interval it is given", async () => {
    render(<Hero banners={THREE} intervalMs={2000} />);
    inView();

    await tick(2000);

    expect(hero()).toBe("1/3");
  });

  it("does not rotate a single banner, or none", async () => {
    const view = render(<Hero banners={[{ a: 1 }]} />);
    expect(observers.intersection).toHaveLength(0);
    await tick(10_000);
    expect(hero()).toBe("0/1");
    view.rerender(<Hero banners={[]} />);
    expect(hero()).toBe("0/0");
  });

  it("keeps rotating under the mouse", async () => {
    render(<Hero banners={THREE} />);
    inView();

    fireEvent.pointerEnter(screen.getByTestId("hero"));
    await tick(5000);

    expect(hero()).toBe("1/3");
  });

  it("jumps to the banner a dot points at and waits three seconds before rotating again", async () => {
    render(<Hero banners={THREE} />);
    inView();
    await tick(4900);

    act(() => rotation.goTo(2));
    expect(hero()).toBe("2/3");
    await tick(200);
    expect(hero()).toBe("2/3");
    await tick(5000);

    expect(hero()).toBe("0/3");
  });

  it("goes back to the first banner when the list of banners is replaced", async () => {
    const view = render(<Hero banners={THREE} />);
    inView();
    await tick(5000);
    expect(hero()).toBe("1/3");

    view.rerender(<Hero banners={[...THREE]} />);

    expect(hero()).toBe("0/3");
  });
});
