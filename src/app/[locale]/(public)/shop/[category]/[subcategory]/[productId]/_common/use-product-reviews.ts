"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { ApiError } from "@/src/lib/api";
import { buildListQuery } from "@/src/lib/list-query";
import { mapMediaUrls } from "@/src/lib/media-url";
import type { PublicReview, ReviewSummary } from "@/src/types/review";
import { REVIEW_PAGE_SIZE, type ReviewFilters } from "./reviews";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";

/** Public GET that throws an `ApiError` (so `useErrorMessage` can read the BE code) */
async function fetchPublic<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.message ?? "", res.status, body.errorCode);
  }
  return mapMediaUrls(await res.json()) as T;
}

/** Totals, 1–5 star distribution and fit distribution of a product, straight from the BE */
export function useReviewSummary(productId: string) {
  const { data, error, isLoading, mutate } = useSWR<{ data: ReviewSummary }>(
    `${API_URL}/api/reviews/${encodeURIComponent(productId)}/summary`,
    fetchPublic,
    /* A short dedupe: after a customer posts a review the page must not keep showing the old totals for long */
    { revalidateOnFocus: false, dedupingInterval: 5_000 }
  );
  return { summary: data?.data ?? null, isLoading, isError: !!error, reload: mutate };
}

type ListStatus = "loading" | "loadingMore" | "ready" | "error";

interface ListPage {
  data: PublicReview[];
  total: number;
  totalPages?: number;
}

/**
 * Published reviews of a product, filtered and sorted by the BE, appended page by page.
 * A change of filter (or `reload`) starts again from page 1; answers that arrive late for an old filter are dropped.
 */
export function useReviewList(productId: string, filters: ReviewFilters) {
  const [items, setItems] = useState<PublicReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<ListStatus>("loading");
  const [error, setError] = useState<unknown>(null);
  /** Bumped on every new query; a response only counts while its ticket is still current */
  const ticket = useRef(0);

  const { rating, fit, hasImages, sort } = filters;

  const load = useCallback(
    async (nextPage: number) => {
      const mine = ++ticket.current;
      setStatus(nextPage === 1 ? "loading" : "loadingMore");
      try {
        const qs = buildListQuery(
          { sort, page: nextPage, limit: REVIEW_PAGE_SIZE },
          { rating, fit, hasImages: hasImages ? true : undefined }
        );
        const res = await fetchPublic<ListPage>(`${API_URL}/api/reviews/${encodeURIComponent(productId)}?${qs}`);
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
    [productId, rating, fit, hasImages, sort]
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const loadMore = useCallback(() => load(page + 1), [load, page]);
  const reload = useCallback(() => load(1), [load]);

  return {
    items,
    total,
    status,
    error,
    hasMore: items.length < total,
    loadMore,
    reload,
  };
}
