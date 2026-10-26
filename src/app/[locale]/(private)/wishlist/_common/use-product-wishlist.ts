"use client";

import { useCallback } from "react";
import { useAuthAction } from "@/src/hooks/use-auth-action";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import type { Product } from "@/src/types/product";
import { selectIsWishlisted, syncAddToWishlist, syncRemoveFromWishlist, toggleWishlistItem } from "./moduleSlice";

/** The heart of one product: whether it is saved, and what pressing it does. A signed-out visitor is asked to sign in first; a signed-in one
 *  saves (or takes off) the product here at once and tells the BE. `notify` says what happened, since the words differ from page to page. */
export function useProductWishlist(product: Product, notify: (added: boolean) => void) {
  const dispatch = useAppDispatch();
  const isWishlisted = useAppSelector(selectIsWishlisted(product.id));
  const { requireAuth } = useAuthAction();

  const toggle = useCallback(() => {
    requireAuth(() => {
      dispatch(
        toggleWishlistItem({
          productId: product.id,
          name: product.name,
          priceVnd: product.priceVnd,
          priceUsd: product.priceUsd,
          image: product.images[0],
          category: product.category?.slug ?? "",
          subcategory: product.subcategory?.slug ?? "",
          badge: product.badge,
        })
      );
      /* `isWishlisted` is still the value from before the dispatch */
      const added = !isWishlisted;
      dispatch(added ? syncAddToWishlist(product.id) : syncRemoveFromWishlist(product.id));
      notify(added);
    }, "saveToWishlist");
  }, [requireAuth, dispatch, isWishlisted, product, notify]);

  return { isWishlisted, toggle };
}
