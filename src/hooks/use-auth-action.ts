"use client";

import { useCallback, useContext } from "react";
import { useAuth } from "@/src/contexts/auth-context";

/**
 * Context for triggering the login prompt modal.
 * Set by LoginPromptProvider in the component tree.
 */
interface LoginPromptContextValue {
  openLoginPrompt: (actionDescription?: string) => void;
}

const LoginPromptContextKey = "loginPrompt";

/**
 * Hook providing auth-gated action helpers.
 *
 * Usage:
 *   const { requireAuth } = useAuthAction();
 *   const handleClick = () => {
 *     requireAuth(() => {
 *       // do the authenticated action
 *     }, "save to wishlist");
 *   };
 */
export function useAuthAction() {
  const { isAuthenticated } = useAuth();

  const requireAuth = useCallback(
    (action: () => void, _actionDescription?: string) => {
      if (isAuthenticated) {
        action();
      } else {
        /* Dispatch custom event — LoginPromptModal listens for this */
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("login-prompt:open", {
              detail: { actionDescription: _actionDescription },
            })
          );
        }
      }
    },
    [isAuthenticated]
  );

  return { requireAuth };
}
