import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ImageViewer from "@/src/app/[locale]/(public)/shop/[category]/[subcategory]/[productId]/_components/ImageViewer";
import ProductDetailClient from "@/src/app/[locale]/(public)/shop/[category]/[subcategory]/[productId]/_components/ProductDetailClient";
import ShippingAccordion from "@/src/app/[locale]/(public)/shop/[category]/[subcategory]/[productId]/_components/ShippingAccordion";
import SizeGuideModal from "@/src/app/[locale]/(public)/shop/[category]/[subcategory]/[productId]/_components/SizeGuideModal";
import ZoomableImage from "@/src/app/[locale]/(public)/shop/[category]/[subcategory]/[productId]/_components/ZoomableImage";
import type { Product } from "@/src/types/product";
import { scrolls } from "@/tests/_support/browser-apis";
import { carouselLayout } from "@/tests/_support/carousel-layout";
import { msg } from "@/tests/_support/messages";
import { product, renderDetail, shippingInfo, sizeGuide, type RenderDetailOptions } from "./detail-kit";

/* The pictures, the size table and the shipping note of a product page (specs/storefront/product-detail.md, flows PD-13 to PD-18E). */

const D = (key: string, locale: "vi" | "en" = "vi") => msg(`public.product.detail.${key}`, locale);
const G = (key: string) => msg(`public.product.sizeGuideModal.${key}`);
const S = (key: string, locale: "vi" | "en" = "vi") => msg(`public.product.shipping.${key}`, locale);
const PICTURES = ["/a.jpg", "/b.jpg", "/c.jpg"];

let restoreLayout = () => {};
afterEach(() => {
  restoreLayout();
  restoreLayout = () => {};
  document.body.style.overflow = "";
  window.innerWidth = 1024;
  Reflect.deleteProperty(window, "requestIdleCallback");
  Reflect.deleteProperty(window, "cancelIdleCallback");
});

async function page(item: Product = product({ images: PICTURES }), options: RenderDetailOptions = {}) {
  restoreLayout = carouselLayout({ trackWidth: 300, slideWidth: 300, gap: 0 });
  return renderDetail(<ProductDetailClient product={item} categoryTitle="Tops" subcategoryLabel="Shirts" relatedProducts={[]} />, options);
}
const thumb = (n: number) => screen.getByRole("button", { name: D("viewImage").replace("{index}", String(n)) });
const isCurrent = (button: HTMLElement) => button.className.includes("border-[var(--accent-primary)]");
/* The gallery repeats its slides to loop, and the viewer shows the same pictures: this is the first one on the page itself */
const photo = (n: number) => screen.getAllByAltText(D("imageAlt").replace("{name}", "Dress").replace("{index}", String(n))).find((img) => !img.closest(".yarl__root"))!;
const counter = () => document.querySelector(".yarl__counter")?.textContent;
const viewerOpen = () => document.querySelector(".yarl__root") !== null;
const gone = () => waitFor(() => expect(document.querySelector(".yarl__root")).toBeNull(), { timeout: 3000 });

describe("PD-13 the gallery", () => {
  it("shows each picture under the product's name and its number, with a thumbnail for each, the first one current", async () => {
    await page();

    for (const n of [1, 2, 3]) expect(photo(n)).toBeInTheDocument();
    expect(isCurrent(thumb(1))).toBe(true);
    expect(isCurrent(thumb(2))).toBe(false);
    expect(screen.getByRole("region", { name: D("carouselAria") })).toBeInTheDocument();
  });

  it("makes a thumbnail current and moves the gallery to its picture when it is tapped", async () => {
    await page();
    const before = scrolls.length;

    await userEvent.click(thumb(3));

    expect(isCurrent(thumb(3))).toBe(true);
    expect(isCurrent(thumb(1))).toBe(false);
    expect(scrolls.length).toBeGreaterThan(before);
  });

  it("moves the gallery forward with the right arrow, back with the left one, and ignores other keys", async () => {
    await page();
    const before = scrolls.length;

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(scrolls.length).toBeGreaterThan(before);
    const forward = scrolls.at(-1)!.left;
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    const back = scrolls.at(-1)!.left;
    const afterPrev = scrolls.length;
    fireEvent.keyDown(window, { key: "Enter" });

    expect(back).toBeLessThan(forward);
    expect(scrolls.length).toBe(afterPrev);
  });

  it("follows the gallery with the thumbnails when it moves by itself", async () => {
    await page();

    fireEvent.keyDown(window, { key: "ArrowRight" });

    await waitFor(() => expect(isCurrent(thumb(2))).toBe(true));
    expect(isCurrent(thumb(1))).toBe(false);
  });

  it("stops listening for the arrow keys once the page is gone", async () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const view = await page();

    view.unmount();

    expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function));
  });

  it("opens the full-screen viewer on the picture that was tapped, and not before", async () => {
    await page();
    expect(viewerOpen()).toBe(false);

    await userEvent.click(photo(2));

    await waitFor(() => expect(counter()).toBe("2 / 3"));
  });

  it("brings the gallery to the last picture seen when the viewer is closed", async () => {
    await page();
    await userEvent.click(photo(1));
    await waitFor(() => expect(counter()).toBe("1 / 3"));

    fireEvent.keyDown(document.querySelector(".yarl__container")!, { key: "ArrowRight" });
    await waitFor(() => expect(counter()).toBe("2 / 3"));
    fireEvent.keyDown(document.querySelector(".yarl__container")!, { key: "ArrowRight" });
    await waitFor(() => expect(counter()).toBe("3 / 3"));
    await userEvent.click(screen.getByRole("button", { name: D("viewer.close") }));

    await gone();
    expect(isCurrent(thumb(3))).toBe(true);
  });

  it("reopens the viewer on another picture", async () => {
    await page();
    await userEvent.click(photo(1));
    await waitFor(() => expect(counter()).toBe("1 / 3"));
    await userEvent.click(screen.getByRole("button", { name: D("viewer.close") }));
    await gone();

    await userEvent.click(photo(3));

    await waitFor(() => expect(counter()).toBe("3 / 3"));
  });

  it("loads the viewer ahead of time while the browser is idle, and gives up on that when the page goes", async () => {
    const request = vi.fn(() => 7);
    const cancel = vi.fn();
    Object.assign(window, { requestIdleCallback: request, cancelIdleCallback: cancel });

    const view = await page();
    expect(request).toHaveBeenCalledTimes(1);
    view.unmount();

    expect(cancel).toHaveBeenCalledWith(7);
  });
});

describe("PD-14 the full-screen viewer", () => {
  const viewer = (props: Partial<React.ComponentProps<typeof ImageViewer>> = {}, locale: "vi" | "en" = "vi") =>
    renderDetail(<ImageViewer images={PICTURES} productName="Dress" index={1} open onView={() => {}} onClose={() => {}} {...props} />, { locale });

  it("shows the picture asked for, with the product's name and picture number, and counts them", async () => {
    await viewer();

    expect(counter()).toBe("2 / 3");
    expect(screen.getByRole("dialog", { name: D("viewer.lightbox") })).toBeInTheDocument();
    expect(document.querySelector(".yarl__slide:not([inert]) img")).toHaveAttribute("alt", "Dress — Ảnh 2");
  });

  it("tells which picture it is on when the visitor moves, and once at the start", async () => {
    const onView = vi.fn();
    await viewer({ onView });
    expect(onView).toHaveBeenCalledWith(1);

    fireEvent.keyDown(document.querySelector(".yarl__container")!, { key: "ArrowRight" });

    await waitFor(() => expect(onView).toHaveBeenLastCalledWith(2));
  });

  it("closes from the close button and from Escape", async () => {
    const onClose = vi.fn();
    await viewer({ onClose });

    await userEvent.click(screen.getByRole("button", { name: D("viewer.close") }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    fireEvent.keyDown(document.querySelector(".yarl__container")!, { key: "Escape" });

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
  });

  it("has buttons to go back and forth when there is more than one picture", async () => {
    await viewer();

    expect(screen.getByRole("button", { name: D("viewer.previous") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: D("viewer.next") })).toBeInTheDocument();
  });

  it("keeps the buttons for two pictures", async () => {
    await viewer({ images: ["/a.jpg", "/b.jpg"], index: 0 });

    expect(screen.getByRole("button", { name: D("viewer.next") })).toBeInTheDocument();
  });

  it("has no buttons to go back and forth for a single picture", async () => {
    await viewer({ images: ["/a.jpg"], index: 0 });

    expect(screen.queryByRole("button", { name: D("viewer.previous") })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: D("viewer.next") })).not.toBeInTheDocument();
  });

  it("has a zoom bar that reads 100% with the picture fitted, where zooming out and back to fit are off", async () => {
    await viewer();

    expect(screen.getByRole("button", { name: D("viewer.resetZoom") })).toHaveTextContent("100%");
    expect(screen.getByRole("button", { name: D("viewer.resetZoom") })).toBeDisabled();
    expect(screen.getByRole("button", { name: D("viewer.zoomOut") })).toBeDisabled();
    expect(screen.getByRole("button", { name: D("viewer.zoomIn") })).toBeInTheDocument();
  });

  it("speaks English in English", async () => {
    await viewer({}, "en");

    expect(screen.getByRole("dialog", { name: D("viewer.lightbox", "en") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: D("viewer.close", "en") })).toBeInTheDocument();
  });

  it("shows nothing while it is closed", async () => {
    await viewer({ open: false });

    expect(viewerOpen()).toBe(false);
  });
});

describe("PD-15 zooming a picture under the mouse", () => {
  const FRAME = { left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  async function zoomable(onOpen = vi.fn()) {
    const view = await renderDetail(
      <div className="relative">
        <ZoomableImage src="/a.jpg" alt="Silk dress" onOpen={onOpen} />
      </div>
    );
    const frame = screen.getByAltText("Silk dress").parentElement as HTMLElement;
    frame.getBoundingClientRect = () => FRAME;
    return { ...view, frame, image: screen.getByAltText("Silk dress"), onOpen };
  }
  const transform = (image: HTMLElement) => image.style.transform;

  afterEach(() => {
    vi.useRealTimers();
  });

  it("zooms to twice the size once the mouse has rested on it for a moment, around the mouse", async () => {
    const { frame, image } = await zoomable();

    fireEvent.pointerEnter(frame, { clientX: 50, clientY: 25, pointerType: "mouse" });
    expect(transform(image)).toBe("scale(1)");

    await waitFor(() => expect(transform(image)).toBe("scale(2)"));
    expect(frame.style.getPropertyValue("--zoom-origin")).toBe("25% 25%");
  });

  it("follows the mouse while zoomed", async () => {
    const { frame, image } = await zoomable();
    fireEvent.pointerEnter(frame, { clientX: 50, clientY: 25, pointerType: "mouse" });
    await waitFor(() => expect(transform(image)).toBe("scale(2)"));

    fireEvent.pointerMove(frame, { clientX: 150, clientY: 75, pointerType: "mouse" });

    expect(frame.style.getPropertyValue("--zoom-origin")).toBe("75% 75%");
    expect(transform(image)).toBe("scale(2)");
  });

  it("does not zoom when the mouse only sweeps across", async () => {
    const { frame, image } = await zoomable();
    vi.useFakeTimers();

    fireEvent.pointerEnter(frame, { clientX: 50, clientY: 25, pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.pointerLeave(frame, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(500));

    expect(transform(image)).toBe("scale(1)");
  });

  it("zooms after exactly the moment of rest, no sooner", async () => {
    const { frame, image } = await zoomable();
    vi.useFakeTimers();

    fireEvent.pointerEnter(frame, { clientX: 50, clientY: 25, pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(149));
    expect(transform(image)).toBe("scale(1)");
    act(() => vi.advanceTimersByTime(1));

    expect(transform(image)).toBe("scale(2)");
  });

  it("fades the magnifier hint while zoomed and brings it back after", async () => {
    const { frame, image } = await zoomable();
    const hint = () => frame.querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(hint().className).toContain("opacity-100");

    fireEvent.pointerEnter(frame, { clientX: 50, clientY: 25, pointerType: "mouse" });
    await waitFor(() => expect(transform(image)).toBe("scale(2)"));
    expect(hint().className).toContain("opacity-0");
    fireEvent.pointerLeave(frame, { pointerType: "mouse" });

    expect(hint().className).toContain("opacity-100");
  });

  it("goes back to normal when the mouse leaves", async () => {
    const { frame, image } = await zoomable();
    fireEvent.pointerEnter(frame, { clientX: 50, clientY: 25, pointerType: "mouse" });
    await waitFor(() => expect(transform(image)).toBe("scale(2)"));

    fireEvent.pointerLeave(frame, { pointerType: "mouse" });

    expect(transform(image)).toBe("scale(1)");
  });

  it("asks the browser for a sharper picture once it has been zoomed", async () => {
    const { frame, image } = await zoomable();
    const before = image.getAttribute("sizes");

    fireEvent.pointerEnter(frame, { clientX: 50, clientY: 25, pointerType: "mouse" });
    await waitFor(() => expect(transform(image)).toBe("scale(2)"));
    fireEvent.pointerLeave(frame, { pointerType: "mouse" });

    expect(image.getAttribute("sizes")).toBe("(max-width: 1024px) 250vw, 140vw");
    expect(before).toBe("(max-width: 1024px) 100vw, 55vw");
  });

  it("never zooms for a finger, so that swiping the gallery stays a swipe", async () => {
    const { frame, image } = await zoomable();
    vi.useFakeTimers();

    fireEvent.pointerEnter(frame, { clientX: 50, clientY: 25, pointerType: "touch" });
    fireEvent.pointerMove(frame, { clientX: 60, clientY: 25, pointerType: "touch" });
    act(() => vi.advanceTimersByTime(500));

    expect(transform(image)).toBe("scale(1)");
    expect(frame.style.getPropertyValue("--zoom-origin")).toBe("");
  });

  it("drops the zoom while the mouse is pressed to drag the gallery, and zooms again after it is let go and moved", async () => {
    const { frame, image } = await zoomable();
    fireEvent.pointerEnter(frame, { clientX: 50, clientY: 25, pointerType: "mouse" });
    await waitFor(() => expect(transform(image)).toBe("scale(2)"));

    fireEvent.pointerDown(frame, { clientX: 50, clientY: 25, pointerType: "mouse" });
    expect(transform(image)).toBe("scale(1)");
    fireEvent.pointerMove(frame, { clientX: 70, clientY: 25, pointerType: "mouse" });
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(transform(image)).toBe("scale(1)");

    fireEvent.pointerUp(window, { pointerType: "mouse" });
    fireEvent.pointerMove(frame, { clientX: 80, clientY: 25, pointerType: "mouse" });
    await waitFor(() => expect(transform(image)).toBe("scale(2)"));
  });

  it("ignores a touch that lands on it, and keeps the zoom of the mouse that is not pressed", async () => {
    const { frame, image } = await zoomable();
    fireEvent.pointerEnter(frame, { clientX: 50, clientY: 25, pointerType: "mouse" });
    await waitFor(() => expect(transform(image)).toBe("scale(2)"));

    fireEvent.pointerDown(frame, { clientX: 50, clientY: 25, pointerType: "touch" });

    expect(transform(image)).toBe("scale(2)");
  });

  it("lets go of the press when the pointer is cancelled", async () => {
    const { frame, image } = await zoomable();
    fireEvent.pointerDown(frame, { clientX: 50, clientY: 25, pointerType: "mouse" });

    fireEvent.pointerCancel(window, { pointerType: "mouse" });
    fireEvent.pointerMove(frame, { clientX: 80, clientY: 25, pointerType: "mouse" });

    await waitFor(() => expect(transform(image)).toBe("scale(2)"));
  });

  it("asks to be opened full-screen on any click or tap", async () => {
    const { frame, onOpen } = await zoomable();

    await userEvent.click(frame);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("leaves nothing waiting when it goes before the moment of rest is over", async () => {
    const { frame, unmount } = await zoomable();
    vi.useFakeTimers();
    fireEvent.pointerEnter(frame, { clientX: 50, clientY: 25, pointerType: "mouse" });
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("PD-16 the size table", () => {
  const open = () => userEvent.click(screen.getByRole("button", { name: D("sizeGuide") }));
  const dialog = () => screen.findByRole("dialog", { name: G("title") });

  it("asks for the table of the product's category only when it is opened, and shows it", async () => {
    const { calls } = await page(product({ images: PICTURES }), { sizeGuide: sizeGuide() });
    expect(calls.sizeGuides).toEqual([]);

    await open();

    const modal = await dialog();
    expect(calls.sizeGuides).toEqual(["tops"]);
    expect(await within(modal).findByRole("heading", { name: "Tops size guide" })).toBeInTheDocument();
    expect(within(modal).getByText("How our tops fit")).toBeInTheDocument();
    expect(within(modal).getByText("Số đo tính bằng cm")).toBeInTheDocument();
    expect(within(modal).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Size", "Bust", "Waist"]);
    expect(within(modal).getAllByRole("row").slice(1).map((r) => r.textContent)).toEqual(["S8666", "M90—"]);
    expect(within(modal).getByText(G("fitTips"))).toBeInTheDocument();
    expect(within(modal).getByText("Measure over thin clothes")).toBeInTheDocument();
  });

  it("says the unit in English on the English site", async () => {
    await page(product({ images: PICTURES }), { sizeGuide: sizeGuide({ unit: "inches" }), locale: "en" });

    await userEvent.click(screen.getByRole("button", { name: D("sizeGuide", "en") }));

    expect(await screen.findByText("Measurements in inches")).toBeInTheDocument();
  });

  it("says it is loading while the table is on its way", async () => {
    await page(product({ images: PICTURES }), { sizeGuide: sizeGuide(), sizeGuideDelay: 200 });

    await open();

    expect(await screen.findByText(G("loading"))).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Tops size guide" })).toBeInTheDocument();
  });

  it("says there is no table for a category that has none", async () => {
    await page(product({ images: PICTURES }), { sizeGuide: 404 });

    await open();

    expect(await screen.findByText(G("unavailable"))).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: G("title") })).toBeInTheDocument();
  });

  it("maps the column names to the table's fields, and shows a dash for what a row does not have", async () => {
    await page(product({ images: PICTURES }), {
      sizeGuide: sizeGuide({
        columns: ["Ring Size", "Circumference", "Height", "Depth", "Width", "Length", "Hips", "Style", "Mystery"],
        rows: [{ size: "7", circumference: "54", height: "2", depth: "3", width: "4", length: "5", hips: "90" }],
        tips: [],
      }),
    });

    await open();

    const modal = await dialog();
    await within(modal).findByRole("heading", { name: "Tops size guide" });
    const cells = within(within(modal).getAllByRole("row")[1]).getAllByRole("cell").map((c) => c.textContent);
    expect(cells).toEqual(["7", "54", "2", "3", "4", "5", "90", "7", "—"]);
  });

  it("shows no tips box when there are none", async () => {
    await page(product({ images: PICTURES }), { sizeGuide: sizeGuide({ tips: [] }) });

    await open();

    await screen.findByRole("heading", { name: "Tops size guide" });
    expect(screen.queryByText(G("fitTips"))).not.toBeInTheDocument();
  });

  it("closes from the close button, from Escape and from a click beside the table", async () => {
    await page(product({ images: PICTURES }), { sizeGuide: sizeGuide() });

    await open();
    await userEvent.click(await within(await dialog()).findByRole("button", { name: G("close") }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await open();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await open();
    await userEvent.click((await dialog()).parentElement as HTMLElement);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes on Escape and on no other key", async () => {
    const onClose = vi.fn();
    await renderDetail(<SizeGuideModal category="tops" isOpen onClose={onClose} />, { sizeGuide: sizeGuide() });
    await screen.findByRole("heading", { name: "Tops size guide" });

    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes from a click beside the table, not from a click on it", async () => {
    const onClose = vi.fn();
    await renderDetail(<SizeGuideModal category="tops" isOpen onClose={onClose} />, { sizeGuide: sizeGuide() });
    const modal = await screen.findByRole("dialog", { name: G("title") });

    await userEvent.click(modal);
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(modal.parentElement as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("holds the page still behind it while it is open, and lets it scroll again afterwards", async () => {
    await page(product({ images: PICTURES }), { sizeGuide: sizeGuide() });
    expect(document.body.style.overflow).toBe("");

    await open();
    await dialog();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(document.body.style.overflow).toBe(""));
  });

  it("sits at the bottom of the screen like a sheet on a phone, and in the middle on a larger screen", async () => {
    window.innerWidth = 500;
    await page(product({ images: PICTURES }), { sizeGuide: sizeGuide() });
    await open();
    expect((await dialog()).style.position).toBe("fixed");

    act(() => {
      window.innerWidth = 1024;
      window.dispatchEvent(new Event("resize"));
    });

    await waitFor(() => expect(screen.getByRole("dialog").style.position).not.toBe("fixed"));
  });

  it("stops listening for Escape once it is gone", async () => {
    const onClose = vi.fn();
    const view = await renderDetail(<SizeGuideModal category="tops" isOpen onClose={onClose} />, { sizeGuide: sizeGuide() });
    await screen.findByRole("heading", { name: "Tops size guide" });

    view.unmount();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("is not on the page while closed", async () => {
    await renderDetail(<SizeGuideModal category="tops" isOpen={false} onClose={() => {}} />, { sizeGuide: sizeGuide() });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("PD-17 shipping and returns", () => {
  const toggle = () => screen.findByRole("button", { name: S("title") });
  const shipping = (over = {}) => ({ shipping: shippingInfo({ returnPolicy: { days: 7, description: "Return within 7 days", conditions: [] }, ...over }) });

  it("is folded at first, with only its title", async () => {
    await renderDetail(<ShippingAccordion />, shipping());

    expect(await toggle()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Giao nhanh")).not.toBeInTheDocument();
  });

  it("opens to show each method with its name, time and price, 'free' for a price of zero, and the return policy", async () => {
    await renderDetail(<ShippingAccordion />, shipping());

    await userEvent.click(await toggle());

    expect(screen.getByRole("button", { name: S("title") })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Giao tiêu chuẩn")).toBeInTheDocument();
    expect(screen.getByText("3-5 ngày")).toBeInTheDocument();
    expect(screen.getByText("30.000 VNĐ")).toBeInTheDocument();
    expect(screen.getByText("60.000 VNĐ")).toBeInTheDocument();
    expect(screen.getByText("Nhận tại cửa hàng").closest("div")!.parentElement).toHaveTextContent(S("free"));
    expect(screen.getByText(S("returns"))).toBeInTheDocument();
    expect(screen.getByText("Return within 7 days")).toBeInTheDocument();
  });

  it("says from what order total the shipping is free", async () => {
    await renderDetail(<ShippingAccordion />, shipping());

    await userEvent.click(await toggle());

    expect(screen.getByText(/Miễn phí vận chuyển cho đơn hàng từ 1\.000\.000.*VNĐ trở lên/)).toBeInTheDocument();
  });

  it("says nothing about free shipping when it is switched off", async () => {
    await renderDetail(<ShippingAccordion />, shipping({ freeShippingThresholdVnd: null, freeShippingThresholdUsd: null }));

    await userEvent.click(await toggle());

    expect(screen.queryByText(/Miễn phí vận chuyển cho đơn hàng/)).not.toBeInTheDocument();
    expect(screen.getByText("Giao tiêu chuẩn")).toBeInTheDocument();
  });

  it("shows prices in dollars in English", async () => {
    await renderDetail(<ShippingAccordion />, { ...shipping(), locale: "en" });

    await userEvent.click(await screen.findByRole("button", { name: S("title", "en") }));

    expect(screen.getByText("$1.15")).toBeInTheDocument();
    expect(screen.getByText(/Free shipping on orders of \$38\.46 or more/)).toBeInTheDocument();
  });

  it("folds again on the second tap", async () => {
    await renderDetail(<ShippingAccordion />, shipping());
    await userEvent.click(await toggle());

    await userEvent.click(screen.getByRole("button", { name: S("title") }));

    expect(screen.queryByText("Giao nhanh")).not.toBeInTheDocument();
  });

  it("shows a method with a picture of its own kind, and a lorry for one it does not know", async () => {
    const base = shippingInfo().methods[0];
    await renderDetail(<ShippingAccordion />, shipping({ methods: [{ ...base, id: "standard", name: "Odd", icon: "bicycle" as never }] }));

    await userEvent.click(await toggle());

    expect(screen.getByText("Odd")).toBeInTheDocument();
    expect(document.querySelector(".lucide-truck")).not.toBeNull();
  });

  it("is not on the page when the shipping details cannot be read", async () => {
    await renderDetail(<ShippingAccordion />, { shipping: 500 });

    await waitFor(() => expect(screen.queryByRole("button", { name: S("title") })).not.toBeInTheDocument());
  });
});
