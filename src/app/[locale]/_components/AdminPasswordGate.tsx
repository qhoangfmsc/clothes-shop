"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "@/src/i18n/navigation";
import { useSystemPasswordPrompt } from "./SystemPasswordPrompt";
import { isSystemUnlocked } from "@/src/lib/system-password-session";

/** Gates the whole admin area behind the shared system password prompt. A correct entry stays valid 15 minutes
 *  (system-password-session.ts) and is re-checked on every admin route change. */
export function AdminPasswordGate({ children }: { children: ReactNode }) {
  const requestPassword = useSystemPasswordPrompt();
  const router = useRouter();
  const pathname = usePathname();
  const [verified, setVerified] = useState(false);
  const checkingRef = useRef(false);

  useEffect(() => {
    if (checkingRef.current) return;

    if (isSystemUnlocked()) {
      setVerified(true);
      return;
    }

    setVerified(false);
    checkingRef.current = true;
    requestPassword().then((ok) => {
      checkingRef.current = false;
      if (ok) {
        setVerified(true);
      } else {
        router.replace("/");
      }
    });
    // Re-run on every admin route change, so a TTL that expired while the
    // user was away gets caught the next time they navigate within /admin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!verified) return null;
  return <>{children}</>;
}
