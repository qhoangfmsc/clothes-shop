"use client";

import { useEffect } from "react";
import { useAuth } from "@/src/contexts/auth-context";
import { useAppDispatch } from "@/src/store/hooks";
import { clearCart, fetchCart } from "../_common/moduleSlice";

/** Keeps the local cart in step with the server cart (`GET /api/cart`): sign-in loads that user's cart, sign-out empties
 *  the local copy so the next visitor never sees someone else's bag. Mounted once, renders nothing. */
export default function CartSync() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const dispatch = useAppDispatch();
  const userId = user?.id;

  useEffect(() => {
    if (isLoading) return; // session not resolved yet — "signed out" would be a false reading
    if (isAuthenticated) dispatch(fetchCart());
    else dispatch(clearCart());
  }, [isLoading, isAuthenticated, userId, dispatch]);

  return null;
}
