"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/src/lib/api";
import { useApiAuth } from "@/src/hooks/use-api-auth";
import { useAppDispatch } from "@/src/store/hooks";
import { cartItemKey, fetchCart } from "@/src/app/[locale]/(private)/cart/_common/moduleSlice";
import type { CartItem } from "@/src/app/[locale]/(private)/cart/_common/types";
import type { ShippingMethodId } from "@/src/types/shipping";
import { resolveCartItemIds, type OrderQuote } from "./checkout";

/** The BE's price of the ticked lines for one shipping method (`POST /api/orders/quote`, nothing is created); asked again
 *  when the method or lines change, so the fee and total always come from the BE. */
export function useOrderQuote(items: CartItem[], shippingMethod: ShippingMethodId, enabled: boolean) {
  const { apiFetch } = useApiAuth();
  const dispatch = useAppDispatch();
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  /* `items` is a new array on every store update: key the request on what the quote depends on */
  const linesKey = items.map((item) => `${cartItemKey(item)}:${item.quantity}`).join("|");
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });

  useEffect(() => {
    if (!enabled || !linesKey) return;
    let stale = false;
    setIsLoading(true);
    setError(null);

    const request = (cartItemIds: string[]) =>
      apiFetch<{ data: OrderQuote }>("/api/orders/quote", {
        method: "POST",
        body: { cartItemIds, shippingMethod },
      });

    (async () => {
      try {
        const lines = itemsRef.current;
        const localIds = lines.flatMap((line) => (line.serverItemId ? [line.serverItemId] : []));
        let res: { data: OrderQuote } | null = null;

        /* Ids kept locally can be stale (line ordered or removed elsewhere): a 400 means read the
           server cart and ask again with its ids */
        if (localIds.length === lines.length) {
          try {
            res = await request(localIds);
          } catch (err) {
            if (!(err instanceof ApiError && err.status === 400)) throw err;
          }
        }
        if (!res) {
          const serverCart = await dispatch(fetchCart()).unwrap();
          const freshIds = resolveCartItemIds(serverCart, lines);
          if (!freshIds) throw new Error("");
          res = await request(freshIds);
        }

        if (stale) return;
        setQuote(res.data);
      } catch (err) {
        if (stale) return;
        setQuote(null);
        setError(err);
      } finally {
        if (!stale) setIsLoading(false);
      }
    })();

    return () => {
      stale = true;
    };
  }, [enabled, linesKey, shippingMethod, attempt, apiFetch, dispatch]);

  /* An answer for another method is not the price of this one */
  return { quote: quote?.shippingMethod === shippingMethod ? quote : null, error, isLoading, retry };
}
