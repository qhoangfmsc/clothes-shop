import { http, HttpResponse } from "msw";
import type { ReactElement } from "react";
import type { Product } from "@/src/types/product";
import type { AuthorReview, PendingReviewItem } from "@/src/types/review";
import { API } from "@/tests/_support/api";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* Fake BE behind the "Reviews" page of a customer (to review, my reviews, saving, photo upload, product lookup) and the render function shared by the customer-reviews tests. */

export { authorReview, pendingReview, product, productSummary } from "@/tests/_support/fixtures";

export interface SaveFailure {
  status: number;
  errorCode?: number;
}

export interface ReviewsBackend {
  /** `GET /api/my-reviews/pending`: the lines, or a status to fail with */
  pending?: PendingReviewItem[] | number;
  /** Hold `GET /api/my-reviews/pending` this many milliseconds */
  pendingDelay?: number;
  /** `GET /api/my-reviews` fails with this status and BE code */
  mineFails?: SaveFailure;
  /** `GET /api/my-reviews`: every review of the customer (filtered by `status`, `productId` and paged by the query), or a status to fail with */
  mine?: AuthorReview[] | number;
  /** A page number of `GET /api/my-reviews` that fails (500) */
  failMinePage?: number;
  /** Hold every `GET /api/my-reviews` this many milliseconds */
  mineDelay?: number;
  /** What saving answers (`POST /api/reviews`, `PATCH /api/reviews/:id`): the saved review, or a failure */
  save?: AuthorReview | SaveFailure;
  /** Hold the save this many milliseconds */
  saveDelay?: number;
  /** Hold every photo upload this many milliseconds */
  uploadDelay?: number;
  /** `POST /api/reviews/images`: the URL for a photo (by its content, which tests set to a name), or a failure; default `/media/uploaded/<content>.jpg` */
  upload?: (content: string) => string | SaveFailure;
  /** `GET /api/products/:id` for the "view product" lookup: the product, or a status */
  products?: Record<string, Product | number>;
}

export interface ReviewsCalls {
  pending: number;
  pendingQueries: URLSearchParams[];
  mine: URLSearchParams[];
  saved: { method: string; id: string | null; body: Record<string, unknown> }[];
  uploads: string[];
  products: string[];
}

const fail = (failure: SaveFailure) => HttpResponse.json(failure.errorCode ? { errorCode: failure.errorCode } : {}, { status: failure.status });

export function reviewsBackend(options: ReviewsBackend = {}): ReviewsCalls {
  const calls: ReviewsCalls = { pending: 0, pendingQueries: [], mine: [], saved: [], uploads: [], products: [] };
  const save = async (method: string, id: string | null, request: Request) => {
    calls.saved.push({ method, id, body: (await request.json()) as Record<string, unknown> });
    if (options.saveDelay) await new Promise((resolve) => setTimeout(resolve, options.saveDelay));
    const answer = options.save;
    if (answer && "status" in answer && typeof answer.status === "number" && !("rating" in answer)) return fail(answer);
    return HttpResponse.json({ data: answer ?? { id: "saved" } }, { status: method === "POST" ? 201 : 200 });
  };
  server.use(
    http.get(`${API}/api/my-reviews/pending`, async ({ request }) => {
      calls.pending += 1;
      calls.pendingQueries.push(new URL(request.url).searchParams);
      if (options.pendingDelay) await new Promise((resolve) => setTimeout(resolve, options.pendingDelay));
      if (typeof options.pending === "number") return HttpResponse.json({}, { status: options.pending });
      const lines = options.pending ?? [];
      return HttpResponse.json({ data: lines, total: lines.length });
    }),
    http.get(`${API}/api/my-reviews`, async ({ request }) => {
      const params = new URL(request.url).searchParams;
      calls.mine.push(params);
      if (options.mineDelay) await new Promise((resolve) => setTimeout(resolve, options.mineDelay));
      const page = Number(params.get("page") ?? 1);
      if (options.mineFails) return fail(options.mineFails);
      if (typeof options.mine === "number" || options.failMinePage === page) return HttpResponse.json({}, { status: typeof options.mine === "number" ? options.mine : 500 });
      const status = params.get("status");
      const productId = params.get("productId");
      const rows = (options.mine ?? []).filter((r) => (!status || r.status === status) && (!productId || r.productId === productId));
      const limit = Number(params.get("limit") ?? 25);
      return HttpResponse.json({ data: rows.slice((page - 1) * limit, page * limit), total: rows.length, page, limit });
    }),
    http.post(`${API}/api/reviews/images`, async ({ request }) => {
      const file = (await request.formData()).get("file") as File;
      const content = await file.text();
      calls.uploads.push(content);
      if (options.uploadDelay) await new Promise((resolve) => setTimeout(resolve, options.uploadDelay));
      const answer = options.upload?.(content) ?? `/media/uploaded/${content}.jpg`;
      return typeof answer === "string" ? HttpResponse.json({ data: { url: answer } }, { status: 201 }) : fail(answer);
    }),
    http.post(`${API}/api/reviews`, ({ request }) => save("POST", null, request)),
    http.patch(`${API}/api/reviews/:id`, ({ params, request }) => save("PATCH", String(params.id), request)),
    http.get(`${API}/api/products/:id`, ({ params }) => {
      calls.products.push(String(params.id));
      const found = options.products?.[String(params.id)];
      if (typeof found === "number" || !found) return HttpResponse.json({}, { status: typeof found === "number" ? found : 404 });
      return HttpResponse.json({ data: found });
    })
  );
  return calls;
}

/** A photo whose content is its name: jsdom drops the name of a file sent in a form, so the fake BE reads it back from the content */
export const photo = (name: string, type = "image/png", size = 0) => {
  const file = new File([name], `${name}.png`, { type });
  if (size) Object.defineProperty(file, "size", { value: size });
  return file;
};

export interface RenderReviewsOptions extends ReviewsBackend {
  as?: IdentityName;
  locale?: "vi" | "en";
  /** The address query, e.g. `tab=mine&productId=p1` */
  search?: string;
  waitForAuth?: boolean;
  calls?: ReviewsCalls;
}

export async function renderReviews(ui: ReactElement, options: RenderReviewsOptions = {}) {
  const { as = "user", locale, search = "", waitForAuth, calls: installed, ...backend } = options;
  navigation.pathname = "/reviews";
  navigation.searchParams = new URLSearchParams(search);
  const calls = installed ?? reviewsBackend(backend);
  const view = await renderApp(ui, { as, locale, waitForAuth });
  return Object.assign(view, { calls });
}
