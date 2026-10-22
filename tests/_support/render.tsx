import { render, waitFor, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { SWRConfig } from "swr";
import { useEffect, type ReactElement, type ReactNode } from "react";
import { expect } from "vitest";
import { AuthProvider, useAuth, type AuthUser } from "@/src/contexts/auth-context";
import { ConfirmProvider } from "@/src/app/[locale]/_components/ConfirmDialog";
import { LoginPromptProvider } from "@/src/app/[locale]/_components/LoginPromptModal";
import { SystemPasswordPromptProvider } from "@/src/app/[locale]/_components/SystemPasswordPrompt";
import { ToastProvider } from "@/src/app/[locale]/_components/Toast";
import { attachPersistence, makeStore, type AppStore, type RootState } from "@/src/store";
import { StoreProvider } from "@/src/store/StoreProvider";
import { FORMATS, TIME_ZONE } from "@/src/i18n/formats";
import { MESSAGES } from "./messages";
import { signInAs, type IdentityName } from "./identities";

/* Renders a component the way the app does: real translations, the real AuthProvider answered by MSW, and the
   same provider order as app/[locale]/layout.tsx, a Redux store of its own with the same localStorage saving, and a fresh SWR cache.
   Navigation (including the `next/navigation` hooks) and Google are stand-ins installed in setup.ts. */

interface RenderAppOptions {
  /** Who is signed in. Default `guest`. */
  as?: IdentityName | AuthUser | null;
  locale?: "vi" | "en";
  /** Wait until the session is known before showing the component (default). `false` shows the loading state. */
  waitForAuth?: boolean;
  /** Starting state of the Redux store (only the slices given); every render gets a new store. */
  store?: Partial<RootState>;
}

/** Shows `children` once the session is known and flags `<body data-auth-ready>` so the test can wait for it. */
function AuthReady({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();
  useEffect(() => {
    if (isLoading) return;
    document.body.dataset.authReady = "1";
    return () => {
      delete document.body.dataset.authReady;
    };
  }, [isLoading]);
  return isLoading ? null : <>{children}</>;
}

export async function renderApp(ui: ReactElement, options: RenderAppOptions = {}): Promise<RenderResult & { user: AuthUser | null; store: AppStore }> {
  const { as = "guest", locale = "vi", waitForAuth = true } = options;
  const user = signInAs(as);
  const store = makeStore(options.store);
  attachPersistence(store);

  const tree = (children: ReactElement) => (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone={TIME_ZONE} formats={FORMATS}>
      <SWRConfig value={{ provider: () => new Map() }}>
        <StoreProvider store={store}>
          <AuthProvider>
            <ToastProvider position="bottom-center">
              <ConfirmProvider>
                <SystemPasswordPromptProvider>
                  <LoginPromptProvider>{waitForAuth ? <AuthReady>{children}</AuthReady> : children}</LoginPromptProvider>
                </SystemPasswordPromptProvider>
              </ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </StoreProvider>
      </SWRConfig>
    </NextIntlClientProvider>
  );

  const result = render(tree(ui));
  if (waitForAuth) await waitFor(() => expect(document.body.dataset.authReady).toBe("1"));
  /* `rerender` keeps the providers around the new element */
  const rerenderRoot = result.rerender;
  return Object.assign(result, { user, store, rerender: (next: ReactElement) => rerenderRoot(tree(next)) });
}
