import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReviewFormTarget } from "@/src/app/[locale]/(private)/reviews/_common/types";
import { msg } from "@/tests/_support/messages";
import { F, form, objectUrls, pick, removeButtons, send, star, useObjectUrls, user } from "./form-kit";
import { pendingReview, photo } from "./reviews-kit";

/* The photos of a review: picking, refusing, removing, and sending them with the review (specs/storefront/customer-reviews.md, flows REV-10 to REV-10E). */

const CREATE: ReviewFormTarget = { mode: "create", item: pendingReview({ orderItemId: "oi-9" }) };
const MB = 1024 * 1024;
const input = () => document.body.querySelector<HTMLInputElement>('input[type="file"]')!;
const hint = (count: number) => `${count}/5 ảnh · tối đa 5 MB mỗi ảnh · JPEG, PNG, WebP, GIF hoặc AVIF. Ảnh chỉ được tải lên khi bạn gửi đánh giá.`;

useObjectUrls();

describe("REV-10 picking photos", () => {
  it("shows each picked photo as a thumbnail with a button to take it away, and counts them, without sending anything yet", async () => {
    const { calls } = await form(CREATE);
    expect(screen.getByText(hint(0))).toBeInTheDocument();

    await pick([photo("a"), photo("b")]);

    expect(removeButtons().map((b) => b.getAttribute("aria-label"))).toEqual(["Xóa ảnh 1", "Xóa ảnh 2"]);
    expect(screen.getByText(hint(2))).toBeInTheDocument();
    expect(objectUrls.created).toHaveLength(2);
    expect(calls.uploads).toEqual([]);
  });

  it("offers the formats the BE takes and lets several be picked at once", async () => {
    await form(CREATE);

    expect(input().accept).toBe("image/jpeg,image/png,image/webp,image/gif,image/avif");
    expect(input()).toHaveAttribute("multiple");
  });

  it("takes a photo away, releases its preview and lets the same file be picked again", async () => {
    await form(CREATE);
    const file = photo("a");
    await pick([file]);

    await user.click(removeButtons()[0]);
    expect(removeButtons()).toHaveLength(0);
    await pick([file]);

    expect(removeButtons()).toHaveLength(1);
  });

  it("refuses a file of another kind and says which", async () => {
    await form(CREATE);

    await pick([photo("doc", "application/pdf")]);

    expect(await screen.findByText("doc.png: chỉ hỗ trợ ảnh JPEG, PNG, WebP, GIF hoặc AVIF.")).toBeInTheDocument();
    expect(removeButtons()).toHaveLength(0);
  });

  it("accepts a file without a type when its extension is one of the photo kinds (some browsers leave AVIF blank)", async () => {
    await form(CREATE);

    await pick([new File(["x"], "pic.avif", { type: "" })]);

    expect(removeButtons()).toHaveLength(1);
  });

  it("refuses a file without a type and with another extension", async () => {
    await form(CREATE);

    await pick([new File(["x"], "pic.txt", { type: "" })]);

    expect(await screen.findByText(/pic\.txt: chỉ hỗ trợ/)).toBeInTheDocument();
    expect(removeButtons()).toHaveLength(0);
  });

  it("refuses a photo over 5 MB, and takes one of exactly 5 MB", async () => {
    await form(CREATE);

    await pick([photo("big", "image/png", 5 * MB + 1)]);
    expect(await screen.findByText("big.png lớn hơn 5 MB.")).toBeInTheDocument();
    expect(removeButtons()).toHaveLength(0);
    await pick([photo("edge", "image/png", 5 * MB)]);

    expect(removeButtons()).toHaveLength(1);
  });

  it("takes five at most, says so, and hides the add button when there are five", async () => {
    await form(CREATE);
    expect(screen.getByRole("button", { name: F("images.add") })).toBeInTheDocument();

    await pick(["a", "b", "c", "d", "e", "f"].map((name) => photo(name)));

    expect(await screen.findByText("Bạn chỉ thêm được tối đa 5 ảnh.")).toBeInTheDocument();
    expect(removeButtons()).toHaveLength(5);
    expect(screen.queryByRole("button", { name: F("images.add") })).not.toBeInTheDocument();
  });

  it("makes room for what is left when some photos are already there", async () => {
    await form(CREATE);
    await pick([photo("a"), photo("b"), photo("c")]);

    await pick([photo("d"), photo("e"), photo("f")]);

    expect(removeButtons()).toHaveLength(5);
    expect(await screen.findByText("Bạn chỉ thêm được tối đa 5 ảnh.")).toBeInTheDocument();
  });

  it("ignores the same photo picked twice", async () => {
    await form(CREATE);
    const file = photo("a");

    await pick([file, file]);
    await pick([file]);

    expect(removeButtons()).toHaveLength(1);
  });

  it("forgets the last refusal when the next pick is fine", async () => {
    await form(CREATE);
    await pick([photo("doc", "application/pdf")]);
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await pick([photo("a")]);

    expect(screen.queryByText(/chỉ hỗ trợ/)).not.toBeInTheDocument();
  });

  it("releases every preview when the form goes", async () => {
    const view = await form(CREATE);
    await pick([photo("a"), photo("b")]);

    view.unmount();

    expect(objectUrls.revoked.sort()).toEqual([...objectUrls.created].sort());
  });
});

describe("REV-11 sending the photos with the review", () => {
  it("uploads each photo when the review is sent, then sends the review with the addresses the BE gave, in order", async () => {
    const { calls, onSaved } = await form(CREATE, { upload: (name) => `/media/reviews/${name}.webp` });
    await user.click(star(5));
    await pick([photo("first"), photo("second")]);

    await send();

    await waitFor(() => expect(calls.saved).toHaveLength(1));
    expect(calls.uploads.sort()).toEqual(["first", "second"]);
    expect(calls.saved[0].body).toEqual({ orderItemId: "oi-9", rating: 5, images: ["/media/reviews/first.webp", "/media/reviews/second.webp"] });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("sends nothing at all until the review is sent: a cancelled form spends no upload", async () => {
    const { calls, onClose } = await form(CREATE);
    await pick([photo("a")]);

    await user.click(screen.getByRole("button", { name: F("cancel") }));

    expect(onClose).toHaveBeenCalled();
    expect(calls.uploads).toEqual([]);
  });

  it("shows a spinner on each photo while they upload", async () => {
    await form(CREATE, { upload: (name) => `/media/${name}.jpg`, uploadDelay: 150 });
    await user.click(star(5));
    await pick([photo("a"), photo("b")]);

    await send();

    expect(await screen.findAllByRole("status", { name: F("images.uploading") })).toHaveLength(2);
    expect(screen.getByRole("button", { name: F("submitting") })).toBeDisabled();
    expect(removeButtons().every((button) => button.hasAttribute("disabled"))).toBe(true);
    await waitFor(() => expect(screen.queryByRole("status", { name: F("images.uploading") })).not.toBeInTheDocument());
  });
});

describe("REV-11E a photo does not upload", () => {
  it("marks the photo that failed, says why, and does not send the review", async () => {
    const { calls, onSaved } = await form(CREATE, { upload: (name) => (name === "bad" ? { status: 413 } : `/media/${name}.jpg`) });
    await user.click(star(5));
    await pick([photo("good"), photo("bad")]);

    await send();

    await waitFor(() => expect(calls.uploads.sort()).toEqual(["bad", "good"]));
    expect(await screen.findByRole("img", { name: "Ảnh 2 chưa tải lên được" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Ảnh 1 chưa tải lên được" })).not.toBeInTheDocument();
    expect(screen.getAllByText(msg("shared.errors.byCode.1606"))).toHaveLength(2);
    expect(calls.saved).toEqual([]);
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: F("submitCreate") })).toBeEnabled();
  });

  it("uploads only the failed photo on the next try, then sends the review with all the addresses in order", async () => {
    let attempts = 0;
    const { calls } = await form(CREATE, { upload: (name) => (name === "flaky" && attempts++ === 0 ? { status: 500 } : `/media/${name}.jpg`) });
    await user.click(star(5));
    await pick([photo("good"), photo("flaky")]);
    await send();
    await waitFor(() => expect(calls.saved).toEqual([]));
    await screen.findByRole("img", { name: "Ảnh 2 chưa tải lên được" });

    await send();

    await waitFor(() => expect(calls.saved).toHaveLength(1));
    expect(calls.uploads.filter((name) => name === "good")).toHaveLength(1);
    expect(calls.uploads.filter((name) => name === "flaky")).toHaveLength(2);
    expect(calls.saved[0].body.images).toEqual(["/media/good.jpg", "/media/flaky.jpg"]);
  });

  it("says the photos for the day are used up when the BE says too many uploads (429)", async () => {
    await form(CREATE, { upload: () => ({ status: 429 }) });
    await user.click(star(5));
    await pick([photo("a")]);

    await send();

    expect((await screen.findAllByText(msg("shared.errors.byCode.1607"))).length).toBeGreaterThan(0);
  });

  it("gives the BE's own reason when it has a code for it", async () => {
    await form(CREATE, { upload: () => ({ status: 400, errorCode: 1603 }) });
    await user.click(star(5));
    await pick([photo("a")]);

    await send();

    expect((await screen.findAllByText(msg("shared.errors.byCode.1603"))).length).toBeGreaterThan(0);
  });

  it("says the review was not sent when the failure has no words, and lets the photo be taken away", async () => {
    const { calls } = await form(CREATE, { upload: () => ({ status: 500 }) });
    await user.click(star(5));
    await pick([photo("a")]);
    await send();
    await screen.findByRole("img", { name: "Ảnh 1 chưa tải lên được" });

    await user.click(removeButtons()[0]);
    await send();

    await waitFor(() => expect(calls.saved).toEqual([{ method: "POST", id: null, body: { orderItemId: "oi-9", rating: 5 } }]));
  });
});
