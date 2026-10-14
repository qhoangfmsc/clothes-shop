"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { ApiError } from "@/src/lib/api";
import { buildListQuery } from "@/src/lib/list-query";
import { mapMediaUrls } from "@/src/lib/media-url";
import type { PublicReview, ReviewSummary } from "@/src/types/review";
import { REVIEW_PAGE_SIZE, type ReviewFilters } from "./reviews";
import { LIST_MAX_LIMIT } from "@/src/lib/list-query";

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
}

/**
 * Published reviews of a product, filtered and sorted by the BE, `REVIEW_PAGE_SIZE` at a time.
 * - The first request is page 1; every "Show more" fetches only the next page and appends it (nothing already on screen is asked for again).
 * - `loaded` is everything fetched, `visible` how many of it are shown. "Show fewer" only lowers `visible`, so the pages stay in
 *   memory and opening the list again is instant and makes no request until it runs past what was fetched.
 * - A change of filter or sort starts over; `reload` asks again for as many reviews as are loaded, in one request.
 * Nothing is requested while `enabled` is false (the section is collapsed); it loads page 1 when it turns true.
 * An answer that arrives after the query changed is dropped.
 */
export function useReviewList(productId: string, filters: ReviewFilters, enabled = true) {
  const [loaded, setLoaded] = useState<PublicReview[]>([]);
  const [total, setTotal] = useState(0);
  const [visible, setVisible] = useState(REVIEW_PAGE_SIZE);
  const [status, setStatus] = useState<ListStatus>("loading");
  const [error, setError] = useState<unknown>(null);
  /** Bumped when the query changes or the list is reloaded; a response only counts while its generation is current */
  const generation = useRef(0);
  /** Mirrors `loaded.length` for callbacks that must not change on every append */
  const loadedCount = useRef(0);
  loadedCount.current = loaded.length;

  const { rating, fit, hasImages, sort } = filters;

  const request = useCallback(
    (params: { page?: number; limit: number }) => {
      const qs = buildListQuery({ sort, ...params }, { rating, fit, hasImages: hasImages ? true : undefined });
      return fetchPublic<ListPage>(`${API_URL}/api/reviews/${encodeURIComponent(productId)}?${qs}`);
    },
    [productId, rating, fit, hasImages, sort]
  );

  /* New filter or sort (or product): start over with the newest few */
  useEffect(() => {
    if (!enabled) return;
    const mine = ++generation.current;
    setStatus("loading");
    setVisible(REVIEW_PAGE_SIZE);
    request({ limit: REVIEW_PAGE_SIZE })
      .then((res) => {
        if (mine !== generation.current) return;
        setLoaded(res.data);
        setTotal(res.total);
        setError(null);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (mine !== generation.current) return;
        setLoaded([]);
        setError(err);
        setStatus("error");
      });
  }, [request, enabled]);

  const loadMore = useCallback(async () => {
    const have = loadedCount.current;
    /* Already fetched earlier (the list was folded): just show more of it */
    if (visible + REVIEW_PAGE_SIZE <= have || have >= total) {
      setVisible((v) => Math.min(v + REVIEW_PAGE_SIZE, Math.max(have, REVIEW_PAGE_SIZE)));
      return;
    }
    const mine = generation.current;
    setStatus("loadingMore");
    try {
      const res = await request({ page: Math.floor(have / REVIEW_PAGE_SIZE) + 1, limit: REVIEW_PAGE_SIZE });
      if (mine !== generation.current) return;
      setLoaded((prev) => [...prev, ...res.data]);
      setTotal(res.total);
      setVisible((v) => v + REVIEW_PAGE_SIZE);
      setError(null);
      setStatus("ready");
    } catch (err) {
      if (mine !== generation.current) return;
      setError(err);
      setStatus("error");
    }
  }, [request, visible, total]);

  const collapse = useCallback(() => setVisible(REVIEW_PAGE_SIZE), []);

  /** Ask again for everything loaded so far (after a vote on a hidden review or a saved review) */
  const reload = useCallback(async () => {
    const mine = ++generation.current;
    try {
      const res = await request({ limit: Math.min(Math.max(loadedCount.current, REVIEW_PAGE_SIZE), LIST_MAX_LIMIT) });
      if (mine !== generation.current) return;
      setLoaded(res.data);
      setTotal(res.total);
      setError(null);
      setStatus("ready");
    } catch (err) {
      if (mine !== generation.current) return;
      setError(err);
      setStatus("error");
    }
  }, [request]);

  return {
    /** What is on screen */
    items: loaded.slice(0, visible),
    total,
    status,
    error,
    hasMore: visible < total,
    /** More than the first few are showing */
    expanded: visible > REVIEW_PAGE_SIZE && loaded.length > REVIEW_PAGE_SIZE,
    loadMore,
    collapse,
    reload,
  };
}
