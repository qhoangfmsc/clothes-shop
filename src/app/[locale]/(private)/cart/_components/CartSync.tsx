"use client";

import { useEffect } from "react";
import { useAuth } from "@/src/contexts/auth-context";
import { useAppDispatch } from "@/src/store/hooks";
import { clearWishlist, fetchWishlist } from "../../wishlist/_common/moduleSlice";
import { clearCart, fetchCart } from "../_common/moduleSlice";

/** Keeps the local cart and wishlist in step with the account: sign-in loads that user's, sign-out empties the local copies
 *  so the next visitor never sees someone else's bag or hearts. Mounted once, renders nothing. */
export default function CartSync() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const dispatch = useAppDispatch();
  const userId = user?.id;

  useEffect(() => {
    if (isLoading) return; // session not resolved yet — "signed out" would be a false reading
    if (isAuthenticated) {
      dispatch(fetchCart());
      dispatch(fetchWishlist());
    } else {
      dispatch(clearCart());
      dispatch(clearWishlist());
    }
  }, [isLoading, isAuthenticated, userId, dispatch]);

  return null;
}
