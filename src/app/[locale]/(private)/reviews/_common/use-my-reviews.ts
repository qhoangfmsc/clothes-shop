"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/src/contexts/auth-context";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import { buildListQuery } from "@/src/lib/list-query";
import type { AuthorReview } from "@/src/types/review";
import { MY_REVIEWS_PAGE_SIZE, type MyReviewStatusFilter } from "./constants";
import type { MyReviewsResult } from "./types";

type Status = "loading" | "loadingMore" | "ready" | "error";

/**
 * The customer's own reviews (`GET /api/my-reviews`, newest first), hidden ones included, appended page by page.
 * Photo URLs are fetched with `raw` so an edit sends back exactly what the BE gave (display goes through `toMediaUrl`).
 */
export function useMyReviews(statusFilter: MyReviewStatusFilter, productId: string | undefined) {
  const { isAuthenticated } = useAuth();
  const { apiFetch } = useApiAuth();
  const [items, setItems] = useState<AuthorReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<unknown>(null);
  const ticket = useRef(0);

  const load = useCallback(
    async (nextPage: number) => {
      const mine = ++ticket.current;
      setStatus(nextPage === 1 ? "loading" : "loadingMore");
      try {
        const qs = buildListQuery(
          { sort: "-createdAt", page: nextPage, limit: MY_REVIEWS_PAGE_SIZE },
          { status: statusFilter === "all" ? undefined : statusFilter, productId }
        );
        const res = await apiFetch<MyReviewsResult>(`/api/my-reviews?${qs}`, { raw: true });
        if (mine !== ticket.current) return;
        setItems((prev) => (nextPage === 1 ? res.data : [...prev, ...res.data]));
        setTotal(res.total);
        setPage(nextPage);
        setError(null);
        setStatus("ready");
      } catch (err) {
        if (mine !== ticket.current) return;
        setError(err);
        setStatus("error");
      }
    },
    [apiFetch, statusFilter, productId]
  );

  useEffect(() => {
    if (isAuthenticated) void load(1);
  }, [isAuthenticated, load]);

  const loadMore = useCallback(() => load(page + 1), [load, page]);
  const reload = useCallback(() => load(1), [load]);
  /** Put the BE's answer for one review into the list without asking for everything again */
  const replace = useCallback((review: AuthorReview) => {
    setItems((prev) => prev.map((item) => (item.id === review.id ? review : item)));
  }, []);

  return { items, total, status, error, hasMore: items.length < total, loadMore, reload, replace };
}
