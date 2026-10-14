import { ApiError } from "@/src/lib/api";

/** BE codes the review photo upload is mapped to when it answers without one (see `shared.errors.byCode`) */
const CODE_FILE_TOO_LARGE = 1606;
const CODE_UPLOAD_LIMIT = 1607;

type ApiFetch = <T>(path: string, options?: { method?: string; body?: unknown; raw?: boolean }) => Promise<T>;

/**
 * Uploads one review photo and returns the URL the BE gives back (the only form it accepts in `images`).
 * The BE blocks a file over 5 MB with a bare `413 File too large` and the daily limit with `429`:
 * both are given a code here so the UI shows a translated message.
 */
export async function uploadReviewImage(apiFetch: ApiFetch, file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  try {
    const res = await apiFetch<{ data: { url: string } }>("/api/reviews/images", { method: "POST", body: form, raw: true });
    return res.data.url;
  } catch (err) {
    if (err instanceof ApiError && err.errorCode === undefined) {
      if (err.status === 413) throw new ApiError("", 413, CODE_FILE_TOO_LARGE);
      if (err.status === 429) throw new ApiError("", 429, CODE_UPLOAD_LIMIT);
    }
    throw err;
  }
}
