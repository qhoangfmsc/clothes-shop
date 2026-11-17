import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ProductRating from "@/src/app/[locale]/_components/ProductRating";
import ReviewAvatar from "@/src/app/[locale]/_components/ReviewAvatar";
import ReviewContent from "@/src/app/[locale]/_components/ReviewContent";
import ReviewImageGrid from "@/src/app/[locale]/_components/ReviewImageGrid";
import StarRating from "@/src/app/[locale]/_components/StarRating";
import type { PublicReview } from "@/src/types/review";
import { dateText, msg, msgf } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";

/* The pieces that show reviews, the same for shoppers and admins (specs/platform/ui-kit.md, flows UI-27 to UI-32E). */

const R = (key: string, vars?: Record<string, string | number>, locale: "vi" | "en" = "vi") => (vars ? msgf(`shared.reviews.${key}`, vars, locale) : msg(`shared.reviews.${key}`, locale));
const STORAGE = "https://abc.supabase.co/storage/v1/object/public/media/reviews/p.jpg";

function review(over: Partial<PublicReview> = {}): PublicReview {
  return {
    id: "rv-1",
    author: "Lan",
    avatar: "",
    rating: 4,
    date: "5 Mar 2026",
    createdAt: "2026-03-05T05:00:00.000Z",
    title: "",
    content: "",
    verified: true,
    fit: null,
    images: [],
    size: "",
    color: "",
    helpfulCount: 0,
    edited: false,
    reply: null,
    ...over,
  };
}

describe("UI-27 stars (StarRating)", () => {
  it("says the rating once, as one picture", async () => {
    await renderApp(<StarRating rating={4} />);

    expect(screen.getByRole("img", { name: R("starsAria", { rating: 4 }) })).toBeInTheDocument();
  });

  it.each([
    [0, 0],
    [1, 1],
    [3.4, 3],
    [3.5, 4],
    [4.6, 5],
    [5, 5],
  ])("fills %s as %s whole stars", async (rating, filled) => {
    const { container } = await renderApp(<StarRating rating={rating} />);

    const stars = Array.from(container.querySelectorAll("svg"));
    expect(stars).toHaveLength(5);
    expect(stars.filter((s) => s.getAttribute("fill") === "currentColor")).toHaveLength(filled);
  });

  it("takes a size and extra classes, and hides the stars themselves from screen readers", async () => {
    const { container } = await renderApp(<StarRating rating={2} size={20} className="mine" />);

    expect(screen.getByRole("img").className).toContain("mine");
    expect(container.querySelector("svg")).toHaveAttribute("width", "20");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("speaks English in English", async () => {
    await renderApp(<StarRating rating={4} />, { locale: "en" });

    expect(screen.getByRole("img", { name: R("starsAria", { rating: 4 }, "en") })).toBeInTheDocument();
  });
});

describe("UI-28 the rating of a product (ProductRating)", () => {
  it("shows one star and the average with the count on a card", async () => {
    const { container } = await renderApp(<ProductRating average={4.5} count={12} />);

    expect(screen.getByRole("img", { name: "Đánh giá 4,5 trên 5 sao từ 12 đánh giá" })).toBeInTheDocument();
    expect(container.textContent).toBe("4,5 (12)");
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("shows five stars and the words on the product page", async () => {
    const { container } = await renderApp(<ProductRating average={4.5} count={12} variant="full" />);

    expect(container.textContent).toBe("4,5 · 12 đánh giá");
    expect(container.querySelectorAll("svg")).toHaveLength(5);
  });

  it.each([
    ["no average", null, 5],
    ["no average at all", undefined, 5],
    ["no reviews", 4.5, 0],
    ["no count", 4.5, null],
    ["a negative count", 4.5, -1],
  ])("shows nothing for %s", async (_label, average, count) => {
    const { container } = await renderApp(<ProductRating average={average} count={count} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows an average of 0 when there are reviews", async () => {
    const { container } = await renderApp(<ProductRating average={0} count={2} />);

    expect(container.textContent).toBe("0,0 (2)");
  });

  it("writes numbers the English way in English, and takes extra classes", async () => {
    const { container } = await renderApp(<ProductRating average={4.5} count={12} className="mine" variant="full" />, { locale: "en" });

    expect(container.textContent).toBe("4.5 · 12 reviews");
    expect(screen.getAllByRole("img")[0].className).toContain("mine");
    expect(screen.getAllByRole("img")[0]).toHaveAccessibleName("Rated 4.5 out of 5 from 12 reviews");
  });
});

describe("UI-29 who wrote it (ReviewAvatar)", () => {
  it("shows the picture when the author has one, through the media path for stored files", async () => {
    const { container } = await renderApp(<ReviewAvatar avatar={STORAGE} author="Lan" />);

    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("src", "/media/reviews/p.jpg");
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  it.each(["https://lh3.googleusercontent.com/a.png", "//cdn.test/a.png", "/media/a.png"])("treats %s as a picture", async (avatar) => {
    const { container } = await renderApp(<ReviewAvatar avatar={avatar} author="Lan" />);

    expect(container.querySelector("img")).not.toBeNull();
  });

  it("shows the capital first letter of the name when there is no picture", async () => {
    const { container } = await renderApp(<ReviewAvatar avatar="" author="  lan anh" />);

    expect(container.textContent).toBe("L");
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows nothing for a nameless author without picture, and is the size it is told to be", async () => {
    const { container } = await renderApp(<ReviewAvatar avatar="not a url" author="" size={64} />);

    const circle = container.firstElementChild as HTMLElement;
    expect(circle.textContent).toBe("");
    expect(circle).toHaveStyle({ width: "64px", height: "64px" });
    expect(circle).toHaveAttribute("aria-hidden", "true");
  });
});

describe("UI-30 what a review says (ReviewContent)", () => {
  it("shows the stars and the date it was written", async () => {
    await renderApp(<ReviewContent review={review({ rating: 5 })} />);

    expect(screen.getByRole("img", { name: R("starsAria", { rating: 5 }) })).toBeInTheDocument();
    expect(screen.getByText(dateText("2026-03-05T05:00:00.000Z", "short"))).toBeInTheDocument();
  });

  it("shows the title and the text, keeping the line breaks, and nothing for an empty one", async () => {
    const view = await renderApp(<ReviewContent review={review({ title: "Lovely", content: "Soft fabric\nFits well" })} />);
    expect(screen.getByRole("heading", { name: "Lovely" })).toBeInTheDocument();
    expect(screen.getByText(/Soft fabric/).className).toContain("whitespace-pre-line");
    view.unmount();

    await renderApp(<ReviewContent review={review()} />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByText(/./, { selector: "p" })).not.toBeInTheDocument();
  });

  it("says it was edited only when it was", async () => {
    const view = await renderApp(<ReviewContent review={review({ edited: true })} />);
    expect(screen.getByText(R("edited"))).toBeInTheDocument();
    view.unmount();

    await renderApp(<ReviewContent review={review({ edited: false })} />);
    expect(screen.queryByText(R("edited"))).not.toBeInTheDocument();
  });

  it("says what was bought and how it fits, each only when known", async () => {
    const view = await renderApp(<ReviewContent review={review({ size: "M", color: "Red", fit: "true_to_size" })} />);
    expect(screen.getByText(R("purchased", { variant: "M · Red" }))).toBeInTheDocument();
    expect(screen.getByText(R("fit.line", { fit: R("fit.true_to_size") }))).toBeInTheDocument();
    view.unmount();

    const sizeOnly = await renderApp(<ReviewContent review={review({ size: "L" })} />);
    expect(screen.getByText(R("purchased", { variant: "L" }))).toBeInTheDocument();
    expect(screen.queryByText(/Form dáng/)).not.toBeInTheDocument();
    sizeOnly.unmount();

    await renderApp(<ReviewContent review={review({ fit: "small" })} />);
    expect(screen.queryByText(/Đã mua/)).not.toBeInTheDocument();
    expect(screen.getByText(R("fit.line", { fit: R("fit.small") }))).toBeInTheDocument();
  });

  it("shows neither line when there is nothing to say", async () => {
    await renderApp(<ReviewContent review={review()} />);

    expect(screen.queryByText(/Đã mua/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Form dáng/)).not.toBeInTheDocument();
  });

  it("shows the photos, and the shop's reply with its own date, when there are any", async () => {
    await renderApp(
      <ReviewContent review={review({ images: [STORAGE], reply: { content: "Thank you!\nSee you", repliedAt: "2026-03-07T05:00:00.000Z" } })} />
    );

    expect(screen.getByRole("button", { name: R("images.open", { index: 1, count: 1 }) })).toBeInTheDocument();
    expect(screen.getByText(R("storeReply"))).toBeInTheDocument();
    expect(screen.getByText(/Thank you!/).className).toContain("whitespace-pre-line");
    expect(screen.getByText(dateText("2026-03-07T05:00:00.000Z", "short"))).toBeInTheDocument();
  });

  it("has no reply box without a reply, and takes extra classes", async () => {
    const { container } = await renderApp(<ReviewContent review={review()} className="mine" />);

    expect(screen.queryByText(R("storeReply"))).not.toBeInTheDocument();
    expect((container.firstElementChild as HTMLElement).className).toContain("mine");
  });

  it("speaks English in English", async () => {
    await renderApp(<ReviewContent review={review({ edited: true, fit: "large" })} />, { locale: "en" });

    expect(screen.getByText(R("edited", undefined, "en"))).toBeInTheDocument();
    expect(screen.getByText(R("fit.line", { fit: R("fit.large", undefined, "en") }, "en"))).toBeInTheDocument();
  });
});

describe("UI-31 the photos of a review (ReviewImageGrid)", () => {
  it("shows nothing without photos", async () => {
    const { container } = await renderApp(<ReviewImageGrid images={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows a small picture for each photo, stored ones through the media path, each opened by its own button", async () => {
    const { container } = await renderApp(<ReviewImageGrid images={[STORAGE, "https://cdn.test/b.jpg"]} className="mine" />);

    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual([R("images.open", { index: 1, count: 2 }), R("images.open", { index: 2, count: 2 })]);
    expect(Array.from(container.querySelectorAll("img")).map((i) => i.getAttribute("src"))).toEqual(["/media/reviews/p.jpg", "https://cdn.test/b.jpg"]);
    expect(container.querySelector("ul")!.className).toContain("mine");
  });

  it("opens the full-screen viewer at the photo that was clicked, and closes it", async () => {
    await renderApp(<ReviewImageGrid images={["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"]} />);

    await userEvent.click(screen.getByRole("button", { name: R("images.open", { index: 2, count: 2 }) }));

    const viewer = await screen.findByRole("dialog");
    await waitFor(() => expect(within(viewer).getAllByRole("img").length).toBeGreaterThan(0));
    expect(within(viewer).getByText("2 / 2")).toBeInTheDocument();
    await userEvent.click(within(viewer).getByRole("button", { name: R("viewer.close") }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("moves between photos in the viewer, with the viewer's own words", async () => {
    await renderApp(<ReviewImageGrid images={["https://cdn.test/a.jpg", "https://cdn.test/b.jpg", "https://cdn.test/c.jpg"]} />);
    await userEvent.click(screen.getByRole("button", { name: R("images.open", { index: 1, count: 3 }) }));
    const viewer = await screen.findByRole("dialog");
    expect(await within(viewer).findByText("1 / 3")).toBeInTheDocument();

    await userEvent.click(within(viewer).getByRole("button", { name: R("viewer.next") }));

    expect(await within(viewer).findByText("2 / 3")).toBeInTheDocument();
    await userEvent.click(within(viewer).getByRole("button", { name: R("viewer.previous") }));
    expect(await within(viewer).findByText("1 / 3")).toBeInTheDocument();
    expect(within(viewer).getByRole("button", { name: R("viewer.zoomIn") })).toBeInTheDocument();
  });

  it("offers no previous or next for a single photo", async () => {
    await renderApp(<ReviewImageGrid images={["https://cdn.test/a.jpg"]} />);
    await userEvent.click(screen.getByRole("button", { name: R("images.open", { index: 1, count: 1 }) }));
    const viewer = await screen.findByRole("dialog");

    expect(within(viewer).queryByRole("button", { name: R("viewer.next") })).not.toBeInTheDocument();
    expect(within(viewer).queryByRole("button", { name: R("viewer.previous") })).not.toBeInTheDocument();
    fireEvent.keyDown(viewer, { key: "Escape" });
  });

  it("describes each photo in the viewer for screen readers", async () => {
    await renderApp(<ReviewImageGrid images={["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"]} />);
    await userEvent.click(screen.getByRole("button", { name: R("images.open", { index: 1, count: 2 }) }));
    const viewer = await screen.findByRole("dialog");

    await waitFor(() => expect(within(viewer).getByAltText(R("images.alt", { index: 1, count: 2 }))).toBeInTheDocument());
  });
});
