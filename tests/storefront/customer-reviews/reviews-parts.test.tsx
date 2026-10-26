import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { daysUntil, isAcceptedReviewImage } from "@/src/app/[locale]/(private)/reviews/_common/constants";
import type { ImageSlot } from "@/src/app/[locale]/(private)/reviews/_common/types";
import { uploadReviewImage } from "@/src/app/[locale]/(private)/reviews/_common/upload";
import { useDeadlineLabel } from "@/src/app/[locale]/(private)/reviews/_common/use-deadline-label";
import ReviewImageUploader from "@/src/app/[locale]/(private)/reviews/_components/ReviewImageUploader";
import StarPicker from "@/src/app/[locale]/(private)/reviews/_components/StarPicker";
import { ApiError } from "@/src/lib/api";
import { msg } from "@/tests/_support/messages";
import { renderApp } from "@/tests/_support/render";

/* The small parts of the review screens: the star choice, the photo area, the file rules, the upload mapping and the deadline words (specs/storefront/customer-reviews.md, flows REV-13 to REV-16E). */

const slot = (id: string, over: Partial<ImageSlot> = {}): ImageSlot => ({ id, url: `/media/${id}.jpg`, preview: `blob:${id}`, status: "done", ...over });
const file = (name: string, type: string) => new File(["x"], name, { type });

describe("REV-13 the star choice", () => {
  it("offers five stars as one group of choices, none chosen at first and no words under it", async () => {
    await renderApp(<StarPicker value={0} onChange={() => {}} />);

    const stars = screen.getAllByRole("radio");
    expect(stars.map((s) => s.getAttribute("aria-label"))).toEqual(["1 sao", "2 sao", "3 sao", "4 sao", "5 sao"]);
    expect(stars.some((s) => (s as HTMLInputElement).checked)).toBe(false);
    expect(screen.getByRole("radiogroup", { name: msg("shared.reviews.form.rating.label") })).toHaveAttribute("aria-invalid", "false");
  });

  it("chooses a star and tells the page", async () => {
    const onChange = vi.fn();
    await renderApp(<StarPicker value={0} onChange={onChange} />);

    await userEvent.click(screen.getByRole("radio", { name: "4 sao" }));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("shows the chosen one and says what it means", async () => {
    await renderApp(<StarPicker value={2} onChange={() => {}} />);

    expect(screen.getByRole("radio", { name: "2 sao" })).toBeChecked();
    expect(screen.getByText(msg("shared.reviews.form.rating.hint.2"))).toBeInTheDocument();
  });

  it("fills the stars up to the one the mouse is over, and goes back when it leaves", async () => {
    const { container } = await renderApp(<StarPicker value={1} onChange={() => {}} />);
    const filled = () => Array.from(container.querySelectorAll("svg")).map((svg) => svg.getAttribute("fill"));
    expect(filled()).toEqual(["currentColor", "none", "none", "none", "none"]);

    await userEvent.hover(screen.getByRole("radio", { name: "4 sao" }).closest("label")!);
    expect(filled()).toEqual(["currentColor", "currentColor", "currentColor", "currentColor", "none"]);
    await userEvent.unhover(screen.getByRole("radiogroup"));

    expect(filled()).toEqual(["currentColor", "none", "none", "none", "none"]);
  });

  it("marks the group as invalid when asked to", async () => {
    await renderApp(<StarPicker value={0} onChange={() => {}} invalid />);

    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("REV-14 the photo area", () => {
  const area = (slots: ImageSlot[], over: Partial<React.ComponentProps<typeof ReviewImageUploader>> = {}) =>
    renderApp(<ReviewImageUploader slots={slots} notice={null} onPick={() => {}} onRemove={() => {}} {...over} />);

  it("counts the photos against five, and has an add button while there is room", async () => {
    await area([slot("a"), slot("b")]);

    expect(screen.getByText(/^2\/5 ảnh/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: msg("shared.reviews.form.images.add") })).toBeEnabled();
  });

  it("still offers to add at four photos", async () => {
    await area(["a", "b", "c", "d"].map((id) => slot(id)));

    expect(screen.getByRole("button", { name: msg("shared.reviews.form.images.add") })).toBeInTheDocument();
  });

  it("hides the add button at five photos", async () => {
    await area(["a", "b", "c", "d", "e"].map((id) => slot(id)));

    expect(screen.queryByRole("button", { name: msg("shared.reviews.form.images.add") })).not.toBeInTheDocument();
  });

  it("passes the picked files on and clears the field so the same file can be picked again", async () => {
    const onPick = vi.fn();
    const { container } = await area([], { onPick });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;

    await userEvent.upload(input, [file("a.png", "image/png"), file("b.png", "image/png")]);

    expect(onPick).toHaveBeenCalledWith([expect.objectContaining({ name: "a.png" }), expect.objectContaining({ name: "b.png" })]);
    expect(input.value).toBe("");
  });

  it("opens the file chooser from the add button", async () => {
    const { container } = await area([]);
    const click = vi.spyOn(container.querySelector<HTMLInputElement>('input[type="file"]')!, "click");

    await userEvent.click(screen.getByRole("button", { name: msg("shared.reviews.form.images.add") }));

    expect(click).toHaveBeenCalledTimes(1);
  });

  it("takes a photo away by its number", async () => {
    const onRemove = vi.fn();
    await area([slot("a"), slot("b")], { onRemove });

    await userEvent.click(screen.getByRole("button", { name: "Xóa ảnh 2" }));

    expect(onRemove).toHaveBeenCalledWith("b");
  });

  it("switches off the buttons while the review is being sent", async () => {
    await area([slot("a")], { disabled: true });

    expect(screen.getByRole("button", { name: "Xóa ảnh 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: msg("shared.reviews.form.images.add") })).toBeDisabled();
  });

  it("marks a photo that is uploading and one that failed", async () => {
    await area([slot("a", { status: "uploading" }), slot("b", { status: "error" }), slot("c", { status: "local" })]);

    expect(screen.getAllByRole("status", { name: msg("shared.reviews.form.images.uploading") })).toHaveLength(1);
    expect(screen.getAllByRole("img", { name: "Ảnh 2 chưa tải lên được" })).toHaveLength(1);
  });

  it("shows why the last files were refused, and the words for a failed upload by its code", async () => {
    await area([slot("a", { status: "error", errorCode: 1606 })], { notice: "a.pdf: chỉ hỗ trợ ảnh" });

    const alerts = screen.getAllByRole("alert");
    expect(alerts.map((a) => a.textContent)).toEqual(["a.pdf: chỉ hỗ trợ ảnh", msg("shared.errors.byCode.1606")]);
  });

  it("falls back to the general words for a failed upload without a code", async () => {
    await area([slot("a", { status: "error" })]);

    expect(screen.getByRole("alert")).toHaveTextContent(msg("shared.reviews.form.images.failed"));
  });

  it("shows no alert when all is well", async () => {
    await area([slot("a")]);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("REV-15 which files are photos", () => {
  it.each([["image/jpeg"], ["image/png"], ["image/webp"], ["image/gif"], ["image/avif"]])("takes %s", (type) => {
    expect(isAcceptedReviewImage(file("p", type))).toBe(true);
  });

  it.each([["application/pdf"], ["image/svg+xml"], ["text/plain"], ["image/bmp"]])("refuses %s, whatever the name", (type) => {
    expect(isAcceptedReviewImage(file("p.png", type))).toBe(false);
  });

  it.each([["pic.jpg"], ["pic.JPEG"], ["pic.png"], ["pic.webp"], ["pic.gif"], ["pic.avif"], ["a.b.AVIF"]])("takes a file without a type named %s", (name) => {
    expect(isAcceptedReviewImage(file(name, ""))).toBe(true);
  });

  it.each([["pic.txt"], ["pic"], ["pic.svg"], ["pic.png.exe"]])("refuses a file without a type named %s", (name) => {
    expect(isAcceptedReviewImage(file(name, ""))).toBe(false);
  });
});

describe("REV-15 days left", () => {
  const now = Date.UTC(2026, 5, 1, 12);
  const DAY_MS = 24 * 60 * 60 * 1000;

  it("counts whole days, rounding up", () => {
    expect(daysUntil(new Date(now + 5 * DAY_MS).toISOString(), now)).toBe(5);
    expect(daysUntil(new Date(now + 5 * DAY_MS + 1).toISOString(), now)).toBe(6);
    expect(daysUntil(new Date(now + 1).toISOString(), now)).toBe(1);
  });

  it("is zero once the time has come or gone", () => {
    expect(daysUntil(new Date(now).toISOString(), now)).toBe(0);
    expect(daysUntil(new Date(now - DAY_MS).toISOString(), now)).toBe(0);
  });

  it("uses the clock when not told the time", () => {
    expect(daysUntil(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 - 60_000).toISOString())).toBe(2);
  });
});

function Deadline({ at }: { at: string }) {
  const label = useDeadlineLabel();
  return <span>{label(at)}</span>;
}

describe("REV-15 the words for the time left", () => {
  const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000 - 60_000).toISOString();

  it("says how many days are left", async () => {
    await renderApp(<Deadline at={inDays(5)} />);

    expect(screen.getByText("Còn 5 ngày để đánh giá")).toBeInTheDocument();
  });

  it("says a part of a day is a day", async () => {
    await renderApp(<Deadline at={new Date(Date.now() + 3_600_000).toISOString()} />);

    expect(screen.getByText("Còn 1 ngày để đánh giá")).toBeInTheDocument();
  });

  it("says that today is the last day once the time has come", async () => {
    await renderApp(<Deadline at={new Date(Date.now() - 1000).toISOString()} />);

    expect(screen.getByText(msg("shared.reviews.deadline.lastDay"))).toBeInTheDocument();
  });

  it("speaks English in English", async () => {
    await renderApp(<Deadline at={inDays(5)} />, { locale: "en" });

    expect(screen.getByText("5 days left to review")).toBeInTheDocument();
  });
});

describe("REV-16 uploading one photo", () => {
  const fetcher = (impl: (path: string, options?: unknown) => unknown) => vi.fn(async (path: string, options?: unknown) => impl(path, options)) as unknown as Parameters<typeof uploadReviewImage>[0];

  it("sends the file in a form to the photo address and returns the address the BE gives", async () => {
    const api = fetcher(() => ({ data: { url: "/media/reviews/x.jpg" } }));

    const url = await uploadReviewImage(api, file("x.png", "image/png"));

    expect(url).toBe("/media/reviews/x.jpg");
    const [path, options] = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(path).toBe("/api/reviews/images");
    expect(options).toMatchObject({ method: "POST", raw: true });
    expect((options.body as FormData).get("file")).toBeInstanceOf(File);
  });

  it("gives a bare 413 the code for a file that is too large", async () => {
    const api = fetcher(() => {
      throw new ApiError("", 413);
    });

    await expect(uploadReviewImage(api, file("x.png", "image/png"))).rejects.toMatchObject({ status: 413, errorCode: 1606 });
  });

  it("gives a bare 429 the code for the daily limit", async () => {
    const api = fetcher(() => {
      throw new ApiError("", 429);
    });

    await expect(uploadReviewImage(api, file("x.png", "image/png"))).rejects.toMatchObject({ status: 429, errorCode: 1607 });
  });

  it("leaves a failure that already has a code as it is", async () => {
    const api = fetcher(() => {
      throw new ApiError("", 413, 1603);
    });

    await expect(uploadReviewImage(api, file("x.png", "image/png"))).rejects.toMatchObject({ errorCode: 1603 });
  });

  it("leaves other failures as they are", async () => {
    const boom = new ApiError("", 500);
    const api = fetcher(() => {
      throw boom;
    });
    const other = fetcher(() => {
      throw new Error("offline");
    });

    await expect(uploadReviewImage(api, file("x.png", "image/png"))).rejects.toBe(boom);
    await expect(uploadReviewImage(other, file("x.png", "image/png"))).rejects.toThrow("offline");
  });
});
