import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FADE_MS, LEFT_VIDEO, RIGHT_VIDEO } from "@/src/app/[locale]/(public)/landing-page/_common/constants";
import Caption from "@/src/app/[locale]/(public)/landing-page/_components/Caption";
import Footer from "@/src/app/[locale]/(public)/landing-page/_components/Footer";
import OutroSection from "@/src/app/[locale]/(public)/landing-page/_components/OutroSection";
import ProductInfo from "@/src/app/[locale]/(public)/landing-page/_components/ProductInfo";
import VideoContainer from "@/src/app/[locale]/(public)/landing-page/_components/VideoContainer";
import ViewButton from "@/src/app/[locale]/(public)/landing-page/_components/ViewButton";
import { LEGAL_DOCS } from "@/src/lib/legal";
import { media } from "@/tests/_support/media-query";
import { msg } from "@/tests/_support/messages";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* The small pieces of the home page: video, caption, label, ending, button and footer (specs/storefront/landing-page.md, flows LND-10 to LND-15). */

const L = (key: string, locale: "vi" | "en" = "vi") => msg(`public.landing.${key}`, locale);
let play = vi.fn();

beforeEach(() => {
  play = vi.fn(() => Promise.resolve());
  HTMLMediaElement.prototype.play = play as unknown as typeof HTMLMediaElement.prototype.play;
});
afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(HTMLMediaElement.prototype, "play");
});

async function video() {
  const view = await renderApp(<VideoContainer />);
  const [left, right] = Array.from(view.container.querySelectorAll("video"));
  const box = view.container.querySelector<HTMLElement>("#main-canvas")!;
  return { ...view, left, right, box };
}

describe("LND-10 the video behind the page", () => {
  it("stacks the left-turning video and the right-turning one, the left one in front and playing", async () => {
    const { left, right } = await video();

    expect(left.getAttribute("src")).toBe(LEFT_VIDEO);
    expect(right.getAttribute("src")).toBe(RIGHT_VIDEO);
    expect([left.muted, right.muted]).toEqual([true, true]);
    expect([left.style.opacity, right.style.opacity]).toEqual(["1", "0"]);
    expect([left.style.zIndex, right.style.zIndex]).toEqual(["2", "1"]);
    expect([left.style.display, right.style.display]).toEqual(["block", "block"]);
    expect(play).toHaveBeenCalledTimes(1);
    expect(play.mock.contexts[0]).toBe(left);
  });

  it("fades between them over 600 milliseconds", async () => {
    const { left, right } = await video();

    expect(FADE_MS).toBe(600);
    expect(left.style.transition).toContain(`opacity ${FADE_MS}ms`);
    expect(right.style.transition).toContain(`opacity ${FADE_MS}ms`);
  });

  it("does not fade for someone who asked for less motion", async () => {
    media.matching = (query) => query.includes("prefers-reduced-motion");

    const { left, right } = await video();

    expect(left.style.transition).toBe("none");
    expect(right.style.transition).toBe("none");
  });

  it("stays invisible until a video has loaded", async () => {
    const { box, left } = await video();
    expect(box.style.opacity).toBe("0");

    fireEvent.loadedData(left);

    await waitFor(() => expect(box.style.opacity).toBe("1"));
  });

  it("shows itself when the other video has loaded, too", async () => {
    const { box, right } = await video();

    fireEvent.loadedData(right);

    await waitFor(() => expect(box.style.opacity).toBe("1"));
  });

  it("shows itself after two seconds even if no video ever loads", async () => {
    const { box } = await video();
    expect(box.style.opacity).toBe("0");

    await waitFor(() => expect(box.style.opacity).toBe("1"), { timeout: 3000 });
  });

  it("starts the right video when the left one ends, and the left one when the right one ends, for ever", async () => {
    const { left, right } = await video();
    play.mockClear();
    right.currentTime = 5;
    vi.useFakeTimers();

    fireEvent(left, new Event("ended"));
    expect(right.currentTime).toBe(0);
    expect(play).toHaveBeenCalledTimes(1);
    expect(play.mock.contexts[0]).toBe(right);
    expect([right.style.opacity, left.style.opacity]).toEqual(["1", "0"]);
    expect([right.style.zIndex, left.style.zIndex]).toEqual(["1", "2"]);
    act(() => void vi.advanceTimersByTime(FADE_MS));
    expect([right.style.zIndex, left.style.zIndex]).toEqual(["2", "1"]);

    left.currentTime = 7;
    fireEvent(right, new Event("ended"));
    expect(left.currentTime).toBe(0);
    expect(play.mock.contexts[1]).toBe(left);
    expect([left.style.opacity, right.style.opacity]).toEqual(["1", "0"]);
  });

  it("keeps the front one in front until the fade is over", async () => {
    const { left, right } = await video();
    vi.useFakeTimers();

    fireEvent(left, new Event("ended"));
    act(() => void vi.advanceTimersByTime(FADE_MS - 1));

    expect([right.style.zIndex, left.style.zIndex]).toEqual(["1", "2"]);
  });

  it("carries on when the browser refuses to play", async () => {
    const { left, right } = await video();
    play.mockImplementation(() => Promise.reject(new Error("blocked")));

    fireEvent(left, new Event("ended"));

    expect(right.style.opacity).toBe("1");
  });

  it("swaps at once, without waiting, for someone who asked for less motion", async () => {
    media.matching = (query) => query.includes("prefers-reduced-motion");
    const { left, right } = await video();
    vi.useFakeTimers();

    fireEvent(left, new Event("ended"));
    act(() => void vi.advanceTimersByTime(0));

    expect([right.style.zIndex, left.style.zIndex]).toEqual(["2", "1"]);
  });

  it("stops listening for the end of the videos once the page is gone", async () => {
    const { left, right, unmount } = await video();
    play.mockClear();

    unmount();
    fireEvent(left, new Event("ended"));
    fireEvent(right, new Event("ended"));

    expect(play).not.toHaveBeenCalled();
  });

  it("leaves no timer behind when the page goes during a fade", async () => {
    const { left, unmount } = await video();
    vi.useFakeTimers();
    fireEvent(left, new Event("ended"));
    const pending = vi.getTimerCount();

    unmount();

    expect(vi.getTimerCount()).toBeLessThan(pending);
  });
});

describe("LND-11 the words on the page", () => {
  it("shows the caption", async () => {
    await renderApp(<Caption />);

    expect(screen.getByText(L("caption"))).toBeInTheDocument();
  });

  it("shows the label with its first line, the brand in quotes and a circle with a symbol", async () => {
    const { container } = await renderApp(<ProductInfo />);

    const label = container.querySelector("#outro-info")!;
    expect(label).toHaveTextContent(L("productInfo.line1"));
    expect(label).toHaveTextContent("“DOOVAN”");
    expect(container.querySelector("#circle-symbol")).toHaveTextContent("8");
    expect(label.getAttribute("data-outro-offset")).toBe("166");
  });

  it("speaks English in English", async () => {
    await renderApp(<Caption />, { locale: "en" });

    expect(screen.getByText(L("caption", "en"))).toBeInTheDocument();
  });

  it("shows the two lines of the ending and its two lines of text, hidden at first", async () => {
    const { container } = await renderApp(<OutroSection />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(`${L("outro.titleLine1")}${L("outro.titleLine2")}`);
    expect(container.querySelector("p")).toHaveTextContent(`${L("outro.subtitle")}${L("outro.subtitleLine2")}`);
    expect(container.querySelector<HTMLElement>("#outro-overlay")!.style.opacity).toBe("0");
  });
});

describe("LND-12 the button into the shop", () => {
  it("is called what the page says and takes the visitor to the shop", async () => {
    const { container } = await renderApp(<ViewButton />);

    const button = within(container).getByRole("button", { name: L("viewButton") });
    expect(button.id).toBe("outro-buy");
    await userEvent.click(button);

    expect(navigation.router.push).toHaveBeenCalledTimes(1);
    expect(navigation.router.push).toHaveBeenCalledWith("/shop");
  });
});

describe("LND-13 the line at the bottom", () => {
  it("shows the year it is, and the first two legal documents as links", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2031-05-05T05:00:00Z"));

    const { container } = await renderApp(<Footer />);

    expect(container.querySelector("#outro-footer")).toHaveTextContent("DOOVAN ® 2031");
    const nav = screen.getByRole("navigation", { name: msg("shared.legal.title") });
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      [msg("shared.legal.terms"), LEGAL_DOCS[0].path],
      [msg("shared.legal.privacy"), LEGAL_DOCS[1].path],
    ]);
  });

  it("is hidden at first, ignores the pointer except for its links", async () => {
    const { container } = await renderApp(<Footer />);

    const bar = container.querySelector<HTMLElement>("#outro-footer")!;
    expect(bar.style.opacity).toBe("0");
    expect(bar.style.pointerEvents).toBe("none");
    expect(screen.getByRole("navigation").style.pointerEvents).toBe("auto");
  });

  it("speaks English in English", async () => {
    await renderApp(<Footer />, { locale: "en" });

    expect(screen.getByRole("link", { name: msg("shared.legal.terms", "en") })).toBeInTheDocument();
  });
});
