import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BannerFade from "@/src/app/[locale]/_components/BannerFade";
import ResponsiveBannerImage from "@/src/app/[locale]/_components/ResponsiveBannerImage";
import type { BannerItem } from "@/src/types/site-config";
import { renderApp } from "@/tests/_support/render";

/* Banner pictures that follow the screen size, and the crossfade between banners (specs/platform/ui-kit.md, flows UI-25 to UI-26E). */

const DESKTOP = "/images/desktop.jpg";
const TABLET = "/images/tablet.jpg";
const MOBILE = "/images/mobile.jpg";
const decoded = (value: string | null) => decodeURIComponent(value ?? "");
const sources = (container: HTMLElement) => Array.from(container.querySelectorAll("source"));

describe("UI-25 one picture per screen size (ResponsiveBannerImage)", () => {
  it("is a plain image when the banner has only the desktop picture", async () => {
    const { container } = await renderApp(<ResponsiveBannerImage banner={{ image: DESKTOP }} alt="Spring" width={100} height={50} />);

    expect(sources(container)).toHaveLength(0);
    expect(decoded(container.querySelector("img")!.getAttribute("src"))).toContain(DESKTOP);
    expect(container.querySelector("img")).toHaveAttribute("alt", "Spring");
  });

  it("adds a phone picture for screens under 640px and a tablet one under 1024px, narrowest first", async () => {
    const banner: BannerItem = { image: DESKTOP, responsiveImages: { mobile: MOBILE, tablet: TABLET } };

    const { container } = await renderApp(<ResponsiveBannerImage alt="" banner={banner} width={100} height={50} sizes="100vw" />);

    const found = sources(container);
    expect(found.map((s) => s.getAttribute("media"))).toEqual(["(max-width: 639px)", "(max-width: 1023px)"]);
    expect(decoded(found[0].getAttribute("srcset"))).toContain(MOBILE);
    expect(decoded(found[1].getAttribute("srcset"))).toContain(TABLET);
    expect(found[0]).toHaveAttribute("sizes", "100vw");
    expect(decoded(container.querySelector("img")!.getAttribute("src"))).toContain(DESKTOP);
  });

  it("gives phones the tablet picture when there is no phone picture, with one source only", async () => {
    const { container } = await renderApp(<ResponsiveBannerImage alt="" banner={{ image: DESKTOP, responsiveImages: { tablet: TABLET } }} width={100} height={50} />);

    const found = sources(container);
    expect(found).toHaveLength(1);
    expect(found[0]).toHaveAttribute("media", "(max-width: 1023px)");
  });

  it("gives tablets the desktop picture when only the phone has its own", async () => {
    const { container } = await renderApp(<ResponsiveBannerImage alt="" banner={{ image: DESKTOP, responsiveImages: { mobile: MOBILE } }} width={100} height={50} />);

    const found = sources(container);
    expect(found.map((s) => s.getAttribute("media"))).toEqual(["(max-width: 639px)"]);
    expect(decoded(found[0].getAttribute("srcset"))).toContain(MOBILE);
  });

  it("has no alternative text by default (the picture is decoration)", async () => {
    const { container } = await renderApp(<ResponsiveBannerImage alt={undefined as unknown as string} banner={{ image: DESKTOP }} width={100} height={50} />);

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("passes the image options on", async () => {
    const { container } = await renderApp(<ResponsiveBannerImage alt="" banner={{ image: DESKTOP }} width={100} height={50} className="hero" loading="lazy" />);

    expect(container.querySelector("img")!.className).toContain("hero");
    expect(container.querySelector("img")).toHaveAttribute("loading", "lazy");
  });
});

describe("UI-26 fading between banners (BannerFade)", () => {
  const BANNERS: BannerItem[] = [{ image: "/images/one.jpg" }, { image: "/images/two.jpg" }];

  it("shows the banner whose number it is given", async () => {
    const { container, rerender } = await renderApp(<BannerFade banners={BANNERS} index={1} sizes="100vw" />);

    expect(decoded(container.querySelector("img")!.getAttribute("src"))).toContain("two.jpg");
    rerender(<BannerFade banners={BANNERS} index={0} sizes="100vw" />);
    await waitFor(() => expect(container.querySelectorAll("img")).toHaveLength(1));
    expect(decoded(container.querySelector("img")!.getAttribute("src"))).toContain("one.jpg");
  });

  it("shows nothing without banners", async () => {
    const { container } = await renderApp(<BannerFade banners={[]} index={0} sizes="100vw" />);

    expect(container.querySelector("img")).toBeNull();
  });

  it("fills the box around it, a little see-through by default, or as opaque as asked", async () => {
    const { container, unmount } = await renderApp(<BannerFade banners={BANNERS} index={0} sizes="100vw" />);
    expect(container.querySelector("img")).toHaveStyle({ opacity: "0.85", objectFit: "cover" });
    expect(container.querySelector(".absolute.inset-0")).not.toBeNull();
    unmount();

    const again = await renderApp(<BannerFade banners={BANNERS} index={0} sizes="100vw" imageOpacity={1} imageClassName="rounded" alt="Spring" />);
    expect(again.container.querySelector("img")).toHaveStyle({ opacity: "1" });
    expect(again.container.querySelector("img")!.className).toContain("rounded");
    expect(screen.getByAltText("Spring")).toBeInTheDocument();
  });

  it("loads the picture at once by default (it is the top of the page), and lazily when told", async () => {
    const first = await renderApp(<BannerFade banners={BANNERS} index={0} sizes="100vw" />);
    expect(first.container.querySelector("img")).not.toHaveAttribute("loading", "lazy");
    first.unmount();

    const lazy = await renderApp(<BannerFade banners={BANNERS} index={0} sizes="100vw" priority={false} />);
    expect(lazy.container.querySelector("img")).toHaveAttribute("loading", "lazy");
  });

  it("does not fade in the only banner there is", async () => {
    const { container } = await renderApp(<BannerFade banners={[BANNERS[0]]} index={0} sizes="100vw" />);

    expect(container.querySelector(".absolute.inset-0")).toHaveStyle({ opacity: "1" });
  });
});
