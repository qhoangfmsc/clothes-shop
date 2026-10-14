"use client";

import { useCallback, useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";
import { useAuth } from "@/src/contexts/auth-context";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import { buildListQuery } from "@/src/lib/list-query";
import type { PendingReviewItem } from "@/src/types/review";
import { PENDING_PAGE_LIMIT } from "./constants";
import type { PendingReviewsResult } from "./types";

export const PENDING_REVIEWS_KEY = "reviews:pending";

/**
 * Order lines the signed-in customer can still review (`GET /api/my-reviews/pending`) — the only truth about
 * what is reviewable; it is never worked out from the order status. A failed request (for example a missing
 * permission) leaves the list empty, so features that depend on it simply stay hidden.
 */
export function usePendingReviews() {
  const { isAuthenticated } = useAuth();
  const { apiFetch } = useApiAuth();
  const { data, error, isLoading, mutate } = useSWR<PendingReviewsResult>(
    isAuthenticated ? PENDING_REVIEWS_KEY : null,
    () => apiFetch<PendingReviewsResult>(`/api/my-reviews/pending?${buildListQuery({ limit: PENDING_PAGE_LIMIT })}`),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const items = useMemo(() => data?.data ?? [], [data]);
  const byOrderItemId = useMemo(
    () => new Map<string, PendingReviewItem>(items.map((item) => [item.orderItemId, item])),
    [items]
  );

  return { items, total: data?.total ?? 0, byOrderItemId, error, isLoading, reload: mutate };
}

/** After a review was written or changed: refresh the "to review" list and any cached product summary */
export function useRefreshReviewData() {
  const { mutate } = useSWRConfig();
  return useCallback(async () => {
    await Promise.all([
      mutate(PENDING_REVIEWS_KEY),
      mutate((key) => typeof key === "string" && key.includes("/api/reviews/")),
    ]);
  }, [mutate]);
}
