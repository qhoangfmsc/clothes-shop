"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import type { ReturnEligibility } from "./types";

/** Whether an order can be returned, and how many of each line still can. `enabled = false` makes no request. */
export function useReturnEligibility(orderId: string | undefined, enabled: boolean) {
  const { apiFetch } = useApiAuth();
  const [eligibility, setEligibility] = useState<ReturnEligibility | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await apiFetch<{ data: ReturnEligibility }>(
        `/api/returns/eligibility/${encodeURIComponent(orderId)}`
      );
      setEligibility(res.data ?? null);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, orderId]);

  useEffect(() => {
    if (!enabled || !orderId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    reload();
  }, [enabled, orderId, reload]);

  return { eligibility, isLoading, error, reload };
}
