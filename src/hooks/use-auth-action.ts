/* ═══════════════════════════════════════════════════════════
   AUTH ACTION HOOK — Gate actions behind authentication
   
   Usage:
     const { requireAuth } = useAuthAction();
     
     const handleAddToCart = () => {
       requireAuth(() => {
         cartStore.addItem(item);
       }, "add items to your bag");
     };
   
   If user is authenticated → runs callback immediately.
   If not → opens LoginPromptModal, runs callback after login success.
   ═══════════════════════════════════════════════════════════ */

import { useCallback } from "react";
import { useAuth } from "@/src/contexts/auth-context";
import { useLoginPrompt } from "@/src/app/_components/LoginPromptModal";

export function useAuthAction() {
  const { isAuthenticated } = useAuth();
  const { openLoginPrompt } = useLoginPrompt();

  /**
   * Wrap any action that requires authentication.
   * @param callback - The function to run if authenticated
   * @param featureLabel - Human-readable label for the login prompt (e.g. "save to wishlist")
   */
  const requireAuth = useCallback(
    (callback: () => void, featureLabel?: string) => {
      if (isAuthenticated) {
        callback();
        return;
      }
      openLoginPrompt(callback, featureLabel);
    },
    [isAuthenticated, openLoginPrompt]
  );

  return { requireAuth, isAuthenticated };
}
