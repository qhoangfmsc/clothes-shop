import { http, HttpResponse } from "msw";
import type { ReactElement } from "react";
import type { Category } from "@/src/types/category";
import type { Product } from "@/src/types/product";
import type { PendingReviewItem, AuthorReview, PublicReview, ReviewSummary } from "@/src/types/review";
import type { ShippingInfo } from "@/src/types/shipping";
import type { SizeGuide } from "@/src/types/size-guide";
import { API } from "@/tests/_support/api";
import { cartLine, serverCart } from "@/tests/_support/fixtures";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* Fake public API behind a product page (reviews, votes, size guide, shipping, cart, wishlist) and the render function shared by the product-detail tests. */

export { categoryOf, subcategoryOf } from "@/tests/_support/fixtures";
export { authorReview, pendingReview, product, publicReview, reviewSummary, shippingInfo, sizeGuide } from "@/tests/_support/fixtures";

type Page = { data: PublicReview[]; total: number };

export interface VoteAnswer {
  helpfulCount?: number;
  voted?: boolean;
  /** Fail with this status (and BE code) instead */
  status?: number;
  errorCode?: number;
}

export interface DetailApiOptions {
  /** `GET /api/reviews/:id/summary`: the totals, or a status to fail with */
  summary?: ReviewSummary | number;
  /** Hold the totals this many milliseconds */
  summaryDelay?: number;
  /** Every review the BE has for the product, in order; `GET /api/reviews/:id` pages through them (`page`, `limit`) */
  reviews?: PublicReview[];
  /** What the list answers, by its whole query (a number fails with that status) */
  answer?: (params: URLSearchParams) => Page | number | { status: number; errorCode: number };
  /** Hold the answer to a list request this many milliseconds (to make answers arrive out of order) */
  listDelay?: (params: URLSearchParams) => number;
  /** Hold the answer to a vote this many milliseconds */
  voteDelay?: number;
  /** What saving a review (`POST /api/reviews`, `PATCH /api/reviews/:id`) answers: the saved review, or a failure */
  save?: AuthorReview | { status: number; errorCode?: number };
  /** Ids the signed-in visitor already marked helpful */
  voted?: string[] | number;
  /** The visitor's own reviews of this product (`/api/my-reviews`) */
  own?: AuthorReview[] | number;
  /** The lines the visitor can still review (`/api/my-reviews/pending`) */
  pending?: PendingReviewItem[] | number;
  /** What a helpful vote answers */
  vote?: (reviewId: string, method: string) => VoteAnswer;
  sizeGuide?: SizeGuide | number;
  /** Hold the size table this many milliseconds */
  sizeGuideDelay?: number;
  shipping?: ShippingInfo | number;
  /** The cart and wishlist calls fail with this status */
  cartFails?: number;
  wishlistFails?: number;
}

export interface DetailCalls {
  summary: number;
  summaryFor: string[];
  reviews: URLSearchParams[];
  votes: { id: string; method: string }[];
  votedLookups: string[];
  own: URLSearchParams[];
  pending: number;
  sizeGuides: string[];
  shipping: number;
  cart: unknown[];
  saved: { method: string; id: string | null; body: unknown }[];
  wishlistAdds: string[];
  wishlistRemoves: string[];
}

/* No message in the body, so the screen shows its own words (or the text of the BE code) */
const fail = (status: number, errorCode?: number) => HttpResponse.json(errorCode ? { errorCode } : {}, { status });

export function detailApi(options: DetailApiOptions = {}): DetailCalls {
  const calls: DetailCalls = { summary: 0, summaryFor: [], reviews: [], votes: [], votedLookups: [], own: [], pending: 0, sizeGuides: [], shipping: 0, cart: [], saved: [], wishlistAdds: [], wishlistRemoves: [] };
  const all = options.reviews ?? [];
  server.use(
    http.get(`${API}/api/reviews/:productId/summary`, async ({ params }) => {
      calls.summary += 1;
      calls.summaryFor.push(String(params.productId));
      if (options.summaryDelay) await new Promise((resolve) => setTimeout(resolve, options.summaryDelay));
      if (typeof options.summary === "number") return fail(options.summary);
      return HttpResponse.json({ data: options.summary ?? { productId: "p1", ratingCount: 0, ratingAverage: null, withImages: 0, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }, fit: { small: 0, true_to_size: 0, large: 0, total: 0 } } });
    }),
    http.get(`${API}/api/reviews/:productId`, async ({ request }) => {
      const params = new URL(request.url).searchParams;
      calls.reviews.push(params);
      const wait = options.listDelay?.(params) ?? 0;
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      const answer = options.answer?.(params);
      if (typeof answer === "number") return fail(answer);
      if (answer && "errorCode" in answer) return fail(answer.status, answer.errorCode);
      if (answer) return HttpResponse.json(answer);
      const page = Number(params.get("page") ?? 1);
      const limit = Number(params.get("limit") ?? 25);
      return HttpResponse.json({ data: all.slice((page - 1) * limit, page * limit), total: all.length, page, limit });
    }),
    http.post(`${API}/api/reviews/:id/helpful`, ({ params }) => vote(String(params.id), "POST")),
    http.delete(`${API}/api/reviews/:id/helpful`, ({ params }) => vote(String(params.id), "DELETE")),
    http.post(`${API}/api/reviews`, async ({ request }) => saveReview("POST", null, await request.json())),
    http.patch(`${API}/api/reviews/:id`, async ({ params, request }) => saveReview("PATCH", String(params.id), await request.json())),
    http.get(`${API}/api/my-reviews/votes`, ({ request }) => {
      calls.votedLookups.push(new URL(request.url).searchParams.get("productId") ?? "");
      return typeof options.voted === "number" ? fail(options.voted) : HttpResponse.json({ data: options.voted ?? [] });
    }),
    http.get(`${API}/api/my-reviews/pending`, () => {
      calls.pending += 1;
      return typeof options.pending === "number" ? fail(options.pending) : HttpResponse.json({ data: options.pending ?? [], total: (options.pending ?? []).length });
    }),
    http.get(`${API}/api/my-reviews`, ({ request }) => {
      calls.own.push(new URL(request.url).searchParams);
      return typeof options.own === "number" ? fail(options.own) : HttpResponse.json({ data: options.own ?? [], total: (options.own ?? []).length });
    }),
    http.get(`${API}/api/size-guides/:category`, async ({ params }) => {
      calls.sizeGuides.push(String(params.category));
      if (options.sizeGuideDelay) await new Promise((resolve) => setTimeout(resolve, options.sizeGuideDelay));
      return typeof options.sizeGuide === "number" ? fail(options.sizeGuide) : options.sizeGuide ? HttpResponse.json({ data: options.sizeGuide }) : fail(404);
    }),
    http.get(`${API}/api/shipping`, () => {
      calls.shipping += 1;
      return typeof options.shipping === "number" ? fail(options.shipping) : options.shipping ? HttpResponse.json({ data: options.shipping }) : fail(500);
    }),
    http.post(`${API}/api/cart/items`, async ({ request }) => {
      calls.cart.push(await request.json());
      return options.cartFails ? HttpResponse.json({}, { status: options.cartFails }) : HttpResponse.json(serverCart([cartLine({ serverItemId: "srv-new" })]));
    }),
    http.post(`${API}/api/wishlist/:id`, ({ params }) => {
      calls.wishlistAdds.push(String(params.id));
      return options.wishlistFails ? fail(options.wishlistFails) : HttpResponse.json({ data: null });
    }),
    http.delete(`${API}/api/wishlist/:id`, ({ params }) => {
      calls.wishlistRemoves.push(String(params.id));
      return options.wishlistFails ? fail(options.wishlistFails) : HttpResponse.json({ data: null });
    })
  );

  function saveReview(method: string, id: string | null, body: unknown) {
    calls.saved.push({ method, id, body });
    const answer = options.save;
    if (answer && typeof answer.status === "number") return fail(answer.status, (answer as { errorCode?: number }).errorCode);
    return HttpResponse.json({ data: answer ?? { id: "saved" } }, { status: method === "POST" ? 201 : 200 });
  }

  async function vote(id: string, method: string) {
    calls.votes.push({ id, method });
    if (options.voteDelay) await new Promise((resolve) => setTimeout(resolve, options.voteDelay));
    const answer = options.vote?.(id, method) ?? { helpfulCount: method === "POST" ? 1 : 0, voted: method === "POST" };
    if (answer.status) return fail(answer.status, answer.errorCode);
    return HttpResponse.json({ data: { reviewId: id, helpfulCount: answer.helpfulCount ?? 0, voted: answer.voted ?? method === "POST" } });
  }
  return calls;
}

/** `n` reviews with distinct ids, authors and texts */
export function reviews(n: number, from = 1, over: Partial<PublicReview> = {}): PublicReview[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `r${from + i}`,
    author: `Author ${from + i}`,
    avatar: "",
    rating: 5,
    date: "",
    createdAt: "2026-03-05T05:00:00.000Z",
    title: "",
    content: `Review text ${from + i}`,
    verified: true,
    fit: null,
    images: [],
    size: "",
    color: "",
    helpfulCount: 0,
    edited: false,
    reply: null,
    ...over,
  }));
}

export interface RenderDetailOptions extends DetailApiOptions {
  as?: IdentityName;
  locale?: "vi" | "en";
  store?: Parameters<typeof renderApp>[1] extends infer O ? (O extends { store?: infer S } ? S : never) : never;
  /** The calls of an API that is already installed: then none is installed again */
  calls?: DetailCalls;
}

/** Renders a piece of the product page inside the app's providers, with the fake API behind it */
export async function renderDetail(ui: ReactElement, options: RenderDetailOptions = {}) {
  const { as = "guest", locale, store, calls: installed, ...api } = options;
  navigation.pathname = "/shop/tops/shirts/p1";
  const calls = installed ?? detailApi(api);
  const view = await renderApp(ui, { as, locale, store });
  return Object.assign(view, { calls });
}

export interface PageApiOptions {
  /** `GET /api/products/:id`: the product with its related ones; `undefined` is a product the BE does not know (404) */
  product?: Product;
  related?: Product[];
  /** The BE refuses a `relatedLimit` (400) and answers only when it is left out */
  rejectRelatedLimit?: boolean;
  /** The categories the BE knows; `?slug=` answers from this list (404 for an unknown slug) */
  categories?: Category[];
  /** `GET /api/products` (what `generateStaticParams` lists) */
  all?: Product[];
}

export interface PageCalls {
  products: URLSearchParams[];
  categories: string[];
}

/** The API a server-rendered product page asks (it reads before anything is shown) */
export function pageApi(options: PageApiOptions = {}): PageCalls {
  const calls: PageCalls = { products: [], categories: [] };
  server.use(
    http.get(`${API}/api/products/:id`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      calls.products.push(params);
      if (!options.product || (options.rejectRelatedLimit && params.has("relatedLimit"))) return HttpResponse.json({ message: "no" }, { status: options.product ? 400 : 404 });
      return HttpResponse.json({ data: options.product, related: options.related ?? [] });
    }),
    http.get(`${API}/api/products`, () => HttpResponse.json({ data: options.all ?? [], total: (options.all ?? []).length })),
    http.get(`${API}/api/categories`, ({ request }) => {
      const slug = new URL(request.url).searchParams.get("slug") ?? "";
      calls.categories.push(slug);
      const found = (options.categories ?? []).find((c) => c.slug === slug);
      return found ? HttpResponse.json({ data: found }) : HttpResponse.json({ message: "no" }, { status: 404 });
    })
  );
  return calls;
}
