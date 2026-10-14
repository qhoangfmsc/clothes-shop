"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import useSWR from "swr";
import { ApiError } from "@/src/lib/api";
import { authApi } from "@/src/lib/auth-api";
import { onAdminMutation } from "@/src/lib/admin-events";

/** How often the counts are asked again while the tab is visible */
const PENDING_COUNTS_REFRESH_MS = 60_000;
/** Writes that land close together trigger one request, not one each */
const REFRESH_DEBOUNCE_MS = 300;

const PENDING_COUNTS_URL = "/api/admin/pending-counts";

export const PENDING_COUNT_KEYS = ["orders", "payments", "refunds", "returns"] as const;
export type PendingCountKey = (typeof PENDING_COUNT_KEYS)[number];

/** A key that is absent means "this account may not see that area" (not zero) */
export type PendingCounts = Partial<Record<PendingCountKey, number>>;

interface PendingCountsContextValue {
  counts: PendingCounts;
  /** Ask the BE again (merges calls made close together) */
  refresh: () => void;
}

const PendingCountsContext = createContext<PendingCountsContextValue>({ counts: {}, refresh: () => {} });

/** Keeps only the known keys with a real number: anything else is treated as absent */
function readCounts(raw: unknown): PendingCounts {
  const counts: PendingCounts = {};
  if (typeof raw !== "object" || raw === null) return counts;
  for (const key of PENDING_COUNT_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) counts[key] = value;
  }
  return counts;
}

async function fetchPendingCounts(): Promise<PendingCounts> {
  try {
    const res = await authApi.get<{ data: unknown }>(PENDING_COUNTS_URL);
    return readCounts(res.data);
  } catch (err) {
    /* 403: this account has no viewing right in any of the areas: no badge anywhere, and no error to show */
    if (err instanceof ApiError && err.status === 403) return {};
    /* Network / 5xx: SWR keeps the last numbers, so they do not jump to zero (and no toast) */
    throw err;
  }
}

/**
 * Numbers of things waiting for an admin (menu badges, page notices, tab counts), from one request:
 * on entering the admin area, every minute while the tab is visible, when the tab comes back to the
 * foreground, and right after any successful admin write.
 */
export function PendingCountsProvider({ children }: { children: ReactNode }) {
  const { data, mutate } = useSWR<PendingCounts>(PENDING_COUNTS_URL, fetchPendingCounts, {
    refreshInterval: PENDING_COUNTS_REFRESH_MS,
    refreshWhenHidden: false,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5_000,
    keepPreviousData: true,
    shouldRetryOnError: false,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const refresh = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void mutate();
    }, REFRESH_DEBOUNCE_MS);
  }, [mutate]);

  useEffect(() => {
    const unsubscribe = onAdminMutation(refresh);
    return () => {
      unsubscribe();
      clearTimeout(timerRef.current);
    };
  }, [refresh]);

  const value = useMemo<PendingCountsContextValue>(() => ({ counts: data ?? {}, refresh }), [data, refresh]);
  return <PendingCountsContext.Provider value={value}>{children}</PendingCountsContext.Provider>;
}

export function usePendingCounts(): PendingCountsContextValue {
  return useContext(PendingCountsContext);
}
