/* eslint-disable @next/next/no-html-link-for-pages -- the tests need plain anchors, the way the browser sees links */
import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomCursor } from "@/src/app/[locale]/_components/cursor";
import { CURSOR_VARIANTS, NATIVE_SELECTOR, POINTER_SELECTOR, TEXT_SELECTOR } from "@/src/app/[locale]/_components/cursor/cursor-config";
import { media } from "@/tests/_support/media-query";
import { renderApp } from "@/tests/_support/render";

/* The hand-drawn mouse pointer: who gets it, what it looks like over what, the petals on click (specs/platform/app-shell.md, flows SHL-13 to SHL-16E). */

const fine = () => (media.matching = (query) => query.includes("pointer: fine"));
const html = () => document.documentElement;
const cursor = () => document.querySelector<HTMLElement>('div[aria-hidden="true"][style*="2147483647"]');
/* While one picture fades out for the next, both are there: the newest is the last */
const picture = () => Array.from(document.querySelectorAll<HTMLImageElement>("img[data-cursor-img]")).at(-1) ?? null;
const showing = (src: string) => vi.waitFor(() => expect(picture()!.getAttribute("src")).toBe(src));
const petals = () => document.querySelectorAll("span[style*='border-radius']");

async function page() {
  const view = await renderApp(
    <>
      <CustomCursor />
      <a href="/x">a link</a>
      <button type="button">a button</button>
      <label>
        a label
        <input type="text" aria-label="a text field" />
      </label>
      <textarea aria-label="a text area" />
      <input type="checkbox" aria-label="a box" />
      <input type="submit" value="send" />
      <div data-cursor="native">video controls</div>
      <div data-cursor="pointer">a thing to click</div>
      <div data-cursor="text">a text thing</div>
      <div contentEditable suppressContentEditableWarning data-testid="editable">
        edit me
      </div>
      <div role="tab">a tab</div>
      <div>plain</div>
      <button type="button" onPointerDown={(e) => e.stopPropagation()}>
        keeps the press to itself
      </button>
    </>
  );
  return view;
}
const move = (target: Element | Window, x = 100, y = 50) => act(() => void fireEvent.pointerMove(target, { clientX: x, clientY: y, pointerType: "mouse" }));

beforeEach(() => document.body.replaceChildren());
afterEach(() => {
  html().classList.remove("custom-cursor-active");
  vi.useRealTimers();
});

describe("SHL-13 who gets the pointer", () => {
  it("is not drawn, and the system pointer stays, on a phone or tablet (no fine pointer)", async () => {
    await page();
    move(screen.getByText("plain"));

    expect(cursor()).toBeNull();
    expect(html().classList.contains("custom-cursor-active")).toBe(false);
  });

  it("is drawn, and the system pointer hidden, with a mouse", async () => {
    fine();
    await page();

    expect(html().classList.contains("custom-cursor-active")).toBe(true);
    expect(cursor()).not.toBeNull();
  });

  it("gives the system pointer back when the page goes", async () => {
    fine();
    const view = await page();

    view.unmount();

    expect(html().classList.contains("custom-cursor-active")).toBe(false);
  });
});

describe("SHL-14 where it is and what it looks like", () => {
  it("is invisible until the mouse first moves, then follows it, with the artwork's tip on the real position", async () => {
    fine();
    await page();
    expect(cursor()!.style.opacity).toBe("0");

    move(screen.getByText("plain"), 120, 70);

    expect(cursor()!.style.opacity).toBe("1");
    await vi.waitFor(() => expect(cursor()!.style.transform).toContain("translateX(120px)"));
    expect(cursor()!.style.transform).toContain("translateY(70px)");
    const { width, height, anchor } = CURSOR_VARIANTS.default;
    const shifter = picture()!.parentElement!.parentElement as HTMLElement;
    expect(shifter.style.marginLeft).toBe(`${-(anchor.x * width)}px`);
    expect(shifter.style.marginTop).toBe(`${-(anchor.y * height)}px`);
  });

  it("hears the mouse even when the page handles it itself and stops it from travelling", async () => {
    fine();
    await page();
    const stopper = document.createElement("div");
    stopper.addEventListener("pointermove", (e) => e.stopPropagation());
    document.body.appendChild(stopper);

    move(stopper, 33, 44);

    await vi.waitFor(() => expect(cursor()!.style.transform).toContain("translateX(33px)"));
  });

  it.each([
    ["the arrow over plain ground", () => screen.getByText("plain"), "default"],
    ["the hand over a link", () => screen.getByText("a link"), "pointer"],
    ["the hand over a button", () => screen.getByText("a button"), "pointer"],
    ["the hand over a label", () => screen.getByText("a label"), "pointer"],
    ["the hand over a tab", () => screen.getByText("a tab"), "pointer"],
    ["the hand over a box", () => screen.getByLabelText("a box"), "pointer"],
    ["the hand over a send button", () => screen.getByDisplayValue("send"), "pointer"],
    ["the hand over what asks for it", () => screen.getByText("a thing to click"), "pointer"],
    ["the bar over a text field", () => screen.getByLabelText("a text field"), "text"],
    ["the bar over a text area", () => screen.getByLabelText("a text area"), "text"],
    ["the bar over what can be edited", () => screen.getByTestId("editable"), "text"],
    ["the bar over what asks for it", () => screen.getByText("a text thing"), "text"],
  ] as const)("draws %s", async (_what, target, variant) => {
    fine();
    await page();

    move(target());

    await showing(CURSOR_VARIANTS[variant].src);
  });

  it("changes back to the arrow when the mouse leaves what it was over", async () => {
    fine();
    await page();
    move(screen.getByText("a link"));
    await showing(CURSOR_VARIANTS.pointer.src);

    move(screen.getByText("plain"));

    await showing(CURSOR_VARIANTS.default.src);
  });

  it("draws nothing over what keeps the system pointer (video controls)", async () => {
    fine();
    await page();

    move(screen.getByText("video controls"));

    expect(cursor()).toBeNull();
    move(screen.getByText("plain"));
    expect(cursor()).not.toBeNull();
  });

  it("draws the arrow when the mouse is over something that is not an element (the window)", async () => {
    fine();
    await page();

    move(window);

    await showing(CURSOR_VARIANTS.default.src);
    expect(cursor()!.style.opacity).toBe("1");
  });

  it("shows the pictures drawn for the arrow, the hand and the bar", () => {
    expect(CURSOR_VARIANTS.default.src).toBe("/cursor/default.png");
    expect(CURSOR_VARIANTS.pointer.src).toBe("/cursor/pointer.png");
    expect(CURSOR_VARIANTS.text.src).toBe("/cursor/text.png");
  });

  it("appears at once when the first move is over something that changes the look", async () => {
    fine();
    await page();

    move(screen.getByText("a link"));

    expect(cursor()!.style.opacity).toBe("1");
  });

  it("fades when the mouse leaves the page, and comes back when it returns", async () => {
    fine();
    await page();
    move(screen.getByText("plain"));

    act(() => void fireEvent.mouseLeave(document));
    expect(cursor()!.style.opacity).toBe("0");
    move(screen.getByText("plain"));

    expect(cursor()!.style.opacity).toBe("1");
  });

  it("is hidden again after the mouse left, and the same kind of ground, until it moves", async () => {
    fine();
    await page();
    move(screen.getByText("a link"));
    act(() => void fireEvent.mouseLeave(document));

    move(screen.getByText("a link"));

    expect(cursor()!.style.opacity).toBe("1");
  });
});

describe("SHL-13 letting go", () => {
  it("stops listening to the window and the page when the shell goes", async () => {
    fine();
    const onWindow = vi.spyOn(window, "removeEventListener");
    const onDocument = vi.spyOn(document, "removeEventListener");
    const view = await page();

    view.unmount();

    const removals = (spy: typeof onWindow, type: string) => spy.mock.calls.filter(([name]) => name === type).length;
    expect(removals(onDocument, "mouseleave")).toBe(1);
    for (const type of ["pointermove", "pointerup", "pointercancel", "blur"]) expect(removals(onWindow, type)).toBe(1);
    expect(removals(onWindow, "pointerdown")).toBe(2);
  });
});

describe("SHL-15 the petals", () => {
  it("bloom on a press: six petals, which are gone after half a second", async () => {
    fine();
    await page();
    vi.useFakeTimers();

    act(() => void fireEvent.pointerDown(screen.getByText("plain"), { pointerType: "mouse" }));
    expect(petals()).toHaveLength(6);
    act(() => void vi.advanceTimersByTime(499));
    expect(petals()).toHaveLength(6);
    act(() => void vi.advanceTimersByTime(1));

    expect(petals()).toHaveLength(0);
  });

  it("bloom again on the next press, one burst for each", async () => {
    fine();
    await page();
    vi.useFakeTimers();

    act(() => void fireEvent.pointerDown(screen.getByText("plain")));
    act(() => void vi.advanceTimersByTime(100));
    act(() => void fireEvent.pointerDown(screen.getByText("plain")));

    expect(petals()).toHaveLength(12);
  });

  it("bloom even when the page handles the press itself and stops it", async () => {
    fine();
    await page();

    act(() => void fireEvent.pointerDown(screen.getByText("keeps the press to itself")));

    expect(petals()).toHaveLength(6);
  });

  it("do not bloom without a mouse", async () => {
    await page();

    act(() => void fireEvent.pointerDown(screen.getByText("plain")));

    expect(petals()).toHaveLength(0);
  });

  it("have three colours between them", async () => {
    fine();
    await page();

    act(() => void fireEvent.pointerDown(screen.getByText("plain")));

    const colours = new Set(Array.from(petals()).map((p) => (p as HTMLElement).style.background));
    expect(colours.size).toBe(3);
  });

  it("stop being listened for once the page is gone", async () => {
    fine();
    const view = await page();
    view.unmount();

    act(() => void fireEvent.pointerDown(document.body));

    expect(petals()).toHaveLength(0);
  });
});

describe("SHL-16 pressing", () => {
  it("makes the pointer a little smaller while a button is held, and back after", async () => {
    fine();
    await page();
    move(screen.getByText("plain"));
    const scale = () => (picture()!.parentElement as HTMLElement).style.transform;
    const before = scale();

    act(() => void fireEvent.pointerDown(screen.getByText("plain")));
    await vi.waitFor(() => expect(scale()).not.toBe(before));
    act(() => void fireEvent.pointerUp(screen.getByText("plain")));

    await vi.waitFor(() => expect(scale()).toBe(before));
  });

  it("lets go of the press when the pointer is cancelled or the window loses focus", async () => {
    fine();
    await page();
    move(screen.getByText("plain"));
    const scale = () => (picture()!.parentElement as HTMLElement).style.transform;
    const before = scale();
    act(() => void fireEvent.pointerDown(screen.getByText("plain")));
    await vi.waitFor(() => expect(scale()).not.toBe(before));

    act(() => void fireEvent.pointerCancel(window));
    await vi.waitFor(() => expect(scale()).toBe(before));
    act(() => void fireEvent.pointerDown(screen.getByText("plain")));
    await vi.waitFor(() => expect(scale()).not.toBe(before));
    act(() => void fireEvent.blur(window));

    await vi.waitFor(() => expect(scale()).toBe(before));
  });
});

describe("SHL-16 what is looked for", () => {
  it("lists what makes a hand, what makes a bar, and what keeps the system pointer", () => {
    expect(POINTER_SELECTOR).toContain("button");
    expect(POINTER_SELECTOR).toContain("[data-cursor='pointer']");
    expect(TEXT_SELECTOR).toContain("textarea");
    expect(TEXT_SELECTOR).toContain("[data-cursor='text']");
    expect(NATIVE_SELECTOR).toBe("[data-cursor='native']");
  });
});
