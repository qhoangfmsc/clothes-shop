import { http, HttpResponse } from "msw";
import ReviewsContent from "@/src/app/[locale]/(admin)/admin/reviews/ReviewsContent";
import { PendingCountsProvider } from "@/src/app/[locale]/_components/PendingCountsProvider";
import type { AuthUser } from "@/src/contexts/auth-context";
import type { AdminReview } from "@/src/types/review";
import { API } from "@/tests/_support/api";
import { countsApi, type CountsAnswer } from "@/tests/_support/admin";
import { productSummary } from "@/tests/_support/fixtures";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* Sample reviews, the fake admin reviews API and the render function shared by the admin reviews tests. */

const STAMP = "2026-03-05T05:00:00.000Z";

export function adminReview(over: Partial<AdminReview> = {}): AdminReview {
  return {
    id: "rv-1",
    productId: "p1",
    orderItemId: "oi-1",
    userId: "u-1",
    product: productSummary({ id: "p1", name: "Silk dress", slug: "silk-dress", image: "/a.jpg" }),
    status: "PUBLISHED",
    author: "Linh Pham",
    avatar: "",
    rating: 4,
    date: "",
    createdAt: STAMP,
    title: "Lovely",
    content: "Fits well",
    verified: true,
    fit: "true_to_size",
    images: [],
    size: "M",
    color: "Red",
    helpfulCount: 3,
    edited: false,
    reply: null,
    moderationNote: null,
    moderatedBy: null,
    moderatedAt: null,
    editedAt: null,
    repliedBy: null,
    ...over,
  };
}

export interface ReviewsApiOptions {
  pages?: { data: AdminReview[]; total: number }[];
  failListFrom?: number;
  deny?: 401 | 403;
  /** `GET /api/admin/reviews/:id`: the review, or a status to fail with; a function answers per id */
  detail?: AdminReview | number | ((id: string) => AdminReview | number);
  /** hide / publish / reply / delete reply: answer with this review, or refuse with a status and body */
  action?: AdminReview | { status: number; body: Record<string, unknown> };
}

export interface ReviewsCalls {
  lists: URLSearchParams[];
  details: string[];
  hides: { id: string; body: Record<string, unknown> }[];
  publishes: string[];
  replies: { id: string; body: Record<string, unknown> }[];
  replyDeletes: string[];
}

export function reviewsApi(options: ReviewsApiOptions = {}): ReviewsCalls {
  const calls: ReviewsCalls = { lists: [], details: [], hides: [], publishes: [], replies: [], replyDeletes: [] };
  const answer = (id: unknown) => {
    const given = options.action ?? adminReview({ id: String(id) });
    if ("status" in given && "body" in given) return HttpResponse.json(given.body, { status: given.status });
    return HttpResponse.json({ data: given });
  };
  const body = async (request: Request) => {
    const text = await request.text();
    return (text ? JSON.parse(text) : {}) as Record<string, unknown>;
  };
  server.use(
    http.get(`${API}/api/admin/reviews`, ({ request }) => {
      const url = new URL(request.url);
      calls.lists.push(url.searchParams);
      if (options.deny) return HttpResponse.json({ message: "denied" }, { status: options.deny });
      if (options.failListFrom && calls.lists.length >= options.failListFrom) return HttpResponse.json({ message: "boom" }, { status: 500 });
      const page = Number(url.searchParams.get("page") ?? 1);
      const found = options.pages?.[page - 1] ?? { data: [], total: 0 };
      return HttpResponse.json({ ...found, page, limit: Number(url.searchParams.get("limit") ?? 25) });
    }),
    http.get(`${API}/api/admin/reviews/:id`, ({ params }) => {
      const id = String(params.id);
      calls.details.push(id);
      const found = typeof options.detail === "function" ? options.detail(id) : options.detail;
      if (typeof found === "number") return HttpResponse.json({ message: "no such review" }, { status: found });
      return HttpResponse.json({ data: found ?? adminReview({ id }) });
    }),
    http.post(`${API}/api/admin/reviews/:id/hide`, async ({ params, request }) => {
      calls.hides.push({ id: String(params.id), body: await body(request) });
      return answer(params.id);
    }),
    http.post(`${API}/api/admin/reviews/:id/publish`, ({ params }) => {
      calls.publishes.push(String(params.id));
      return answer(params.id);
    }),
    http.put(`${API}/api/admin/reviews/:id/reply`, async ({ params, request }) => {
      calls.replies.push({ id: String(params.id), body: await body(request) });
      return answer(params.id);
    }),
    http.delete(`${API}/api/admin/reviews/:id/reply`, ({ params }) => {
      calls.replyDeletes.push(String(params.id));
      return answer(params.id);
    })
  );
  return calls;
}

export interface RenderReviewsOptions extends ReviewsApiOptions {
  as?: IdentityName | AuthUser;
  locale?: "vi" | "en";
  query?: Record<string, string>;
  counts?: CountsAnswer;
}

export async function renderReviews(options: RenderReviewsOptions = {}) {
  const { as = "adminFull", locale, query = {}, counts, ...api } = options;
  navigation.pathname = "/admin/reviews";
  navigation.searchParams = new URLSearchParams(query);
  const calls = reviewsApi(api);
  if (counts) countsApi(counts);
  const view = await renderApp(counts ? <PendingCountsProvider><ReviewsContent /></PendingCountsProvider> : <ReviewsContent />, { as, locale });
  return { calls, ...view };
}
