"use client";

import { useCallback } from "react";
import { useAuth } from "@/src/contexts/auth-context";
import type { LoginPromptAction } from "@/src/app/[locale]/_components/LoginPromptModal";

/** Auth-gated action helper. When the visitor is signed out, `LoginPromptProvider` opens the sign-in modal (event `login-prompt:open`)
 *  and runs `action` after sign-in. */
export function useAuthAction() {
  const { isAuthenticated } = useAuth();

  const requireAuth = useCallback(
    (action: () => void, loginAction: LoginPromptAction = "continue") => {
      if (isAuthenticated) {
        action();
      } else if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("login-prompt:open", {
            detail: { onSuccess: action, action: loginAction },
          })
        );
      }
    },
    [isAuthenticated]
  );

  return { requireAuth };
}
