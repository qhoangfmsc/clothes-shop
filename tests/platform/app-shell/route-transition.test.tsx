/* eslint-disable @next/next/no-html-link-for-pages -- the tests need plain anchors, the way the browser sees links */
import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RouteTransition from "@/src/app/[locale]/_components/RouteTransition";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* The cream veil between two pages: when it comes, how long it stays, when it is skipped (specs/platform/app-shell.md, flows SHL-10 to SHL-12E). */

const FRAME = 16;
const frame = () => act(() => void vi.advanceTimersByTime(FRAME));
const veil = () => document.querySelector<HTMLElement>('[aria-hidden="true"].fixed');

/* The links are real: stop the browser from trying to go there after the veil has seen the click */
const stay = (e: Event) => e.preventDefault();
/* A handler that throws does not fail the click, jsdom only reports it */
const crashes: unknown[] = [];
const crashed = (e: ErrorEvent) => {
  e.preventDefault();
  crashes.push(e.error);
};
beforeEach(() => {
  crashes.length = 0;
  document.addEventListener("click", stay);
  window.addEventListener("error", crashed);
});
afterEach(() => {
  document.removeEventListener("click", stay);
  window.removeEventListener("error", crashed);
  vi.useRealTimers();
});

/** The shell and a page with the links and buttons the tests click */
const page = () => (
  <>
    <RouteTransition />
    <a href="/vi/new-in">to new in</a>
    <a href="/vi/shop">to this page</a>
    <a href="/vi/shop?sort=price">to this page, sorted</a>
    <a href="/vi/shop#reviews">to this page, reviews</a>
    <a href="https://example.com">outside</a>
    <a href="#top">top</a>
    <a href="/vi/new-in" target="_blank">
      new tab
    </a>
    <a href="/vi/new-in">
      <button type="button">inside a link</button>
    </a>
    <span>not a link</span>
    <a href="/vi/">home</a>
    <a href="/vi">bare home</a>
    <a>no address</a>
  </>
);

/** Started with the page open at `pathname`; time is the test's from here on */
async function shell(pathname = "/shop") {
  navigation.pathname = pathname;
  const view = await renderApp(page());
  vi.useFakeTimers();
  const raf = vi.spyOn(window, "requestAnimationFrame");
  return Object.assign(view, { raf });
}
const click = (name: string, init: MouseEventInit = {}) => fireEvent.click(screen.getByText(name), init);
const goTo = (view: Awaited<ReturnType<typeof shell>>, pathname: string) => {
  navigation.pathname = pathname;
  act(() => view.rerender(page()));
};

describe("SHL-10 when the veil comes", () => {
  it("is not there before anything is clicked", async () => {
    await shell();

    expect(veil()).toBeNull();
  });

  it("comes over the page, quickly, when a link to another page is clicked", async () => {
    await shell();

    click("to new in");

    expect(veil()).not.toBeNull();
    expect(veil()!.className).toContain("rt-in_180ms");
    expect(veil()!.className).toContain("z-9999");
    expect(veil()!.className).toContain("pointer-events-none");
  });

  it.each([
    ["a link to the page already open (with the language in front)", "to this page"],
    ["the same page with another query", "to this page, sorted"],
    ["the same page with a hash", "to this page, reviews"],
    ["a link to another site", "outside"],
    ["a link to a place on the page", "top"],
    ["a link that opens a new tab", "new tab"],
    ["a button inside a link", "inside a link"],
    ["a click that is not on a link", "not a link"],
    ["a link with no address", "no address"],
  ])("does not come for %s", async (_what, label) => {
    await shell();

    click(label);

    expect(veil()).toBeNull();
    expect(crashes).toEqual([]);
  });

  it.each([["metaKey"], ["ctrlKey"], ["shiftKey"]] as const)("does not come when %s is held (the link opens elsewhere)", async (key) => {
    await shell();

    click("to new in", { [key]: true });

    expect(veil()).toBeNull();
  });

  it("does come for the language's home when another page is open", async () => {
    await shell("/shop");

    click("home");

    expect(veil()).not.toBeNull();
  });

  it("does not come for the language's home when the home page is open, with or without the slash", async () => {
    await shell("/");

    click("home");
    click("bare home");

    expect(veil()).toBeNull();
  });
});

describe("SHL-10 letting go", () => {
  it("stops listening for clicks when the shell goes", async () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const view = await shell();

    view.unmount();

    expect(remove.mock.calls.filter(([type, , capture]) => type === "click" && capture === true)).toHaveLength(1);
  });
});

describe("SHL-11 when the veil goes", () => {
  it("holds at least 300 ms even when the new page is there at once, then waits for three frames of drawing, then fades out over 350 ms", async () => {
    const view = await shell();
    click("to new in");
    goTo(view, "/new-in");

    act(() => void vi.advanceTimersByTime(299));
    expect(view.raf).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1));
    expect(view.raf).toHaveBeenCalledTimes(1);
    frame();
    expect(view.raf).toHaveBeenCalledTimes(2);
    frame();
    expect(view.raf).toHaveBeenCalledTimes(3);
    expect(veil()!.className).toContain("rt-in");
    frame();
    expect(veil()!.className).toContain("rt-out_350ms");
    act(() => void vi.advanceTimersByTime(333));
    expect(veil()).not.toBeNull();
    act(() => void vi.advanceTimersByTime(20));
    expect(veil()).toBeNull();
  });

  it("only holds for what is left of the 300 ms when the new page took a while", async () => {
    const view = await shell();
    click("to new in");
    act(() => void vi.advanceTimersByTime(200));

    goTo(view, "/new-in");
    act(() => void vi.advanceTimersByTime(99));
    expect(view.raf).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1));
    expect(view.raf).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 3; i += 1) frame();

    expect(veil()!.className).toContain("rt-out");
  });

  it("goes without holding when the new page took longer than 300 ms", async () => {
    const view = await shell();
    click("to new in");
    act(() => void vi.advanceTimersByTime(1000));
    expect(veil()!.className).toContain("rt-in");

    goTo(view, "/new-in");
    act(() => void vi.advanceTimersByTime(0));
    for (let i = 0; i < 4; i += 1) frame();

    expect(veil()!.className).toContain("rt-out");
  });

  it("goes by itself after 4 seconds if the page never changes", async () => {
    await shell();
    click("to new in");

    act(() => void vi.advanceTimersByTime(3999));
    expect(veil()!.className).toContain("rt-in");
    act(() => void vi.advanceTimersByTime(1));
    expect(veil()!.className).toContain("rt-out");
    act(() => void vi.advanceTimersByTime(350));

    expect(veil()).toBeNull();
  });

  it("does not come on its own when the address changes without a click (back button)", async () => {
    const view = await shell();

    goTo(view, "/new-in");
    act(() => void vi.advanceTimersByTime(1000));

    expect(veil()).toBeNull();
  });

  it("can come again for the next link once it has gone", async () => {
    const view = await shell();
    click("to new in");
    goTo(view, "/new-in");
    act(() => void vi.advanceTimersByTime(300));
    for (let i = 0; i < 4; i += 1) frame();
    act(() => void vi.advanceTimersByTime(400));
    expect(veil()).toBeNull();

    click("home");

    expect(veil()).not.toBeNull();
  });
});

describe("SHL-12 leaving", () => {
  it("stops listening for clicks and drops its timers when the shell goes", async () => {
    const view = await shell();
    click("to new in");
    const pending = vi.getTimerCount();

    view.unmount();

    expect(vi.getTimerCount()).toBeLessThan(pending);
    expect(veil()).toBeNull();
  });
});
