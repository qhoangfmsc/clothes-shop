// The endpoint is a same-origin route handler, not the BE, so the URL is absolute: `authApi` still adds the bearer token and handles 401 → refresh.

import useSWR from "swr";
import { authApi } from "@/src/lib/auth-api";
import type { AnalyticsRange, AnalyticsResponse, AnalyticsView } from "@/src/types/analytics";

export function useAdminAnalytics(range: AnalyticsRange, view: AnalyticsView) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<AnalyticsResponse>(
    ["admin-analytics", range, view],
    () =>
      authApi.get<AnalyticsResponse>(
        `${window.location.origin}/api/analytics?range=${range}&view=${view}`
      ),
    {
      revalidateOnFocus: false,
      /* The server caches Vercel's answer for 5 minutes; asking more often gains nothing */
      dedupingInterval: 60_000,
      keepPreviousData: true,
    }
  );

  return { data, error, isLoading, isValidating, refresh: () => mutate() };
}
