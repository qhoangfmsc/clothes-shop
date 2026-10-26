import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";
import ReviewFormModal from "@/src/app/[locale]/(private)/reviews/_components/ReviewFormModal";
import type { ReviewFormTarget } from "@/src/app/[locale]/(private)/reviews/_common/types";
import { msg } from "@/tests/_support/messages";
import { authorReview, renderReviews, type RenderReviewsOptions } from "./reviews-kit";

/* Opens the review form over the fake BE, and finds its parts. Call `useObjectUrls()` in the test file: jsdom has no `URL.createObjectURL`. */

export const F = (key: string, locale: "vi" | "en" = "vi") => msg(`shared.reviews.form.${key}`, locale);
/** Not filtering by `accept`, so that a test can pick a file of a kind the browser would not offer */
export const user = userEvent.setup({ applyAccept: false });
export const SAVED = authorReview({ id: "saved-1" });

export const objectUrls = { created: [] as string[], revoked: [] as string[] };

export function useObjectUrls() {
  beforeEach(() => {
    objectUrls.created.length = 0;
    objectUrls.revoked.length = 0;
    URL.createObjectURL = vi.fn(() => {
      const url = `blob:fake-${objectUrls.created.length}`;
      objectUrls.created.push(url);
      return url;
    });
    URL.revokeObjectURL = vi.fn((url: string) => void objectUrls.revoked.push(url));
  });
  afterEach(() => {
    Reflect.deleteProperty(URL, "createObjectURL");
    Reflect.deleteProperty(URL, "revokeObjectURL");
  });
}

export async function form(target: ReviewFormTarget, options: RenderReviewsOptions = {}) {
  const fns = { onClose: vi.fn(), onSaved: vi.fn(), onAlreadyReviewed: vi.fn(), onStale: vi.fn() };
  const view = await renderReviews(<ReviewFormModal target={target} {...fns} />, { save: SAVED, ...options });
  await screen.findByRole("dialog");
  return { ...view, ...fns };
}
export const star = (n: number) => screen.getByRole("radio", { name: `${n} sao` });
export const send = () => user.click(screen.getByRole("button", { name: new RegExp(`^(${F("submitCreate")}|${F("submitEdit")})$`) }));
export const titleField = () => screen.getByPlaceholderText(F("title.placeholder"));
export const contentField = () => screen.getByPlaceholderText(F("content.placeholder"));
export const pick = (files: File[]) => user.upload(document.body.querySelector<HTMLInputElement>('input[type="file"]')!, files);
export const fit = (name: string) => screen.getByRole("button", { name });
export const removeButtons = () => screen.queryAllByRole("button", { name: /^Xóa ảnh/ });
