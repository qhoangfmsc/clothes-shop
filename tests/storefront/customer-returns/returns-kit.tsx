import { http, HttpResponse, type JsonBodyType } from "msw";
import type { Order } from "@/src/app/[locale]/(private)/orders/_common/types";
import type { ReturnEligibility, ReturnRequest } from "@/src/app/[locale]/(private)/returns/_common/types";
import { API } from "@/tests/_support/api";
import { shippingInfo } from "@/tests/_support/fixtures";
import { server } from "@/tests/_support/msw-server";

/* The fake BE shared by the customer-return tests: it answers what the pages ask and records the questions. */

export interface ReturnsBackend {
  /** Pages of `GET /api/returns`, in order */
  pages?: { data: ReturnRequest[]; total: number }[];
  /** Shorthand for a single page holding these requests */
  returns?: ReturnRequest[];
  failPage?: number;
  /** `GET /api/returns/:id`: the request, `null` for none, or a status to fail with */
  one?: ReturnRequest | null | number;
  /** `PATCH …/cancel`: the updated request, or a status and body to refuse with */
  cancel?: ReturnRequest | { status: number; body: JsonBodyType };
  /** `POST /api/returns`: an answer body, or a status and body to refuse with */
  create?: { data: JsonBodyType } | { status: number; body: JsonBodyType };
  eligibility?: ReturnEligibility | "error";
  /** `GET /api/orders/:id` */
  order?: Order | number;
  shipping?: "error";
}

export interface ReturnsCalls {
  lists: URLSearchParams[];
  ones: string[];
  cancels: string[];
  creates: Record<string, unknown>[];
  eligibility: string[];
  orders: string[];
}

export function returnsBackend(options: ReturnsBackend = {}): ReturnsCalls {
  const calls: ReturnsCalls = { lists: [], ones: [], cancels: [], creates: [], eligibility: [], orders: [] };
  server.use(
    http.get(`${API}/api/returns`, ({ request }) => {
      const url = new URL(request.url);
      calls.lists.push(url.searchParams);
      const page = Number(url.searchParams.get("page") ?? 1);
      if (options.failPage === page) return HttpResponse.json({ message: "boom" }, { status: 500 });
      const single = options.returns ? { data: options.returns, total: options.returns.length } : { data: [], total: 0 };
      return HttpResponse.json(options.pages?.[page - 1] ?? single);
    }),
    http.get(`${API}/api/returns/eligibility/:id`, ({ params }) => {
      calls.eligibility.push(String(params.id));
      return options.eligibility === "error" || !options.eligibility ? HttpResponse.json({ message: "no such order" }, { status: 404 }) : HttpResponse.json({ data: options.eligibility });
    }),
    http.get(`${API}/api/returns/:id`, ({ params }) => {
      calls.ones.push(String(params.id));
      if (typeof options.one === "number") return HttpResponse.json({ message: "boom" }, { status: options.one });
      return HttpResponse.json({ data: options.one ?? null });
    }),
    http.patch(`${API}/api/returns/:id/cancel`, ({ params }) => {
      calls.cancels.push(String(params.id));
      const answer = options.cancel;
      if (answer && "status" in answer && typeof answer.status === "number" && "body" in answer) return HttpResponse.json(answer.body, { status: answer.status });
      return HttpResponse.json({ data: answer });
    }),
    http.post(`${API}/api/returns`, async ({ request }) => {
      calls.creates.push((await request.json()) as Record<string, unknown>);
      const answer = options.create ?? { data: { data: { id: "r-new" } } };
      return "status" in answer ? HttpResponse.json(answer.body, { status: answer.status }) : HttpResponse.json(answer.data);
    }),
    http.get(`${API}/api/orders/:id`, ({ params }) => {
      calls.orders.push(String(params.id));
      if (typeof options.order === "number") return HttpResponse.json({ message: "boom" }, { status: options.order });
      return HttpResponse.json({ data: options.order ?? null });
    }),
    http.get(`${API}/api/shipping`, () => (options.shipping === "error" ? HttpResponse.json({ message: "boom" }, { status: 500 }) : HttpResponse.json({ data: shippingInfo({ returnPolicy: { days: 7, description: "Returns within 7 days.", conditions: ["Unworn", "Tags attached"] } }) })))
  );
  return calls;
}
