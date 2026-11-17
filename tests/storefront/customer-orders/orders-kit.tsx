import { http, HttpResponse } from "msw";
import type { Order } from "@/src/app/[locale]/(private)/orders/_common/types";
import type { ReturnEligibility, ReturnRequest } from "@/src/app/[locale]/(private)/returns/_common/types";
import type { PendingReviewItem } from "@/src/types/review";
import { API } from "@/tests/_support/api";
import { shippingInfo } from "@/tests/_support/fixtures";
import { server } from "@/tests/_support/msw-server";

/* The fake BE shared by the customer-order page tests: it answers what the pages ask and records the questions. */

export interface OrdersBackend {
  /** Pages of `GET /api/orders`, in order; `total` is the BE's count over all pages */
  pages?: { data: Order[]; total: number }[];
  /** A page number whose request fails (500) */
  failPage?: number;
  /** `GET /api/orders/:id` answers this (or fails with the status when a number) */
  order?: Order | null | number;
  /** `PATCH /api/orders/:id/cancel` answers this order, or fails with a status and body */
  cancel?: Order | { status: number; body: Record<string, unknown> };
  shipping?: "error";
  pending?: PendingReviewItem[] | "error";
  eligibility?: ReturnEligibility | "error";
  returns?: ReturnRequest[];
}

export interface OrdersCalls {
  lists: URLSearchParams[];
  details: string[];
  cancels: string[];
  pending: number;
  eligibility: string[];
  returnLists: URLSearchParams[];
}

export function ordersBackend(options: OrdersBackend = {}): OrdersCalls {
  const calls: OrdersCalls = { lists: [], details: [], cancels: [], pending: 0, eligibility: [], returnLists: [] };
  server.use(
    http.get(`${API}/api/orders`, ({ request }) => {
      const url = new URL(request.url);
      calls.lists.push(url.searchParams);
      const page = Number(url.searchParams.get("page") ?? 1);
      if (options.failPage === page) return HttpResponse.json({ message: "boom" }, { status: 500 });
      const answer = options.pages?.[page - 1] ?? { data: [], total: 0 };
      return HttpResponse.json(answer);
    }),
    http.get(`${API}/api/orders/:id`, ({ params }) => {
      calls.details.push(String(params.id));
      if (typeof options.order === "number") return HttpResponse.json({ message: "boom" }, { status: options.order });
      return HttpResponse.json({ data: options.order ?? null });
    }),
    http.patch(`${API}/api/orders/:id/cancel`, ({ params }) => {
      calls.cancels.push(String(params.id));
      const answer = options.cancel;
      if (answer && "status" in answer && typeof answer.status === "number" && "body" in answer) return HttpResponse.json(answer.body, { status: answer.status });
      return HttpResponse.json({ data: answer });
    }),
    http.get(`${API}/api/shipping`, () => (options.shipping === "error" ? HttpResponse.json({ message: "boom" }, { status: 500 }) : HttpResponse.json({ data: shippingInfo() }))),
    http.get(`${API}/api/my-reviews/pending`, () => {
      calls.pending += 1;
      if (options.pending === "error") return HttpResponse.json({ message: "no permission" }, { status: 403 });
      const items = options.pending ?? [];
      return HttpResponse.json({ data: items, total: items.length });
    }),
    http.get(`${API}/api/returns/eligibility/:id`, ({ params }) => {
      calls.eligibility.push(String(params.id));
      return options.eligibility === "error" || !options.eligibility ? HttpResponse.json({ message: "no" }, { status: 404 }) : HttpResponse.json({ data: options.eligibility });
    }),
    http.get(`${API}/api/returns`, ({ request }) => {
      calls.returnLists.push(new URL(request.url).searchParams);
      const items = options.returns ?? [];
      return HttpResponse.json({ data: items, total: items.length });
    })
  );
  return calls;
}
