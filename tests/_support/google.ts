import { vi } from "vitest";

/* A stand-in for `@react-oauth/google`. Google's popup cannot run in a test, so `useGoogleLogin` here returns a
   function that records the click; the test then plays the popup's outcome with `google.succeed(code)` or
   `google.fail()`. Installed for every test in `setup.ts`. */

type LoginOptions = { onSuccess?: (response: { code: string }) => void | Promise<void>; onError?: () => void; hint?: string; flow?: string };

export const google = {
  /** Options the component passed to the latest `useGoogleLogin(...)` call. */
  options: null as LoginOptions | null,
  /** How many times the component opened the (fake) popup. */
  opened: 0,
  reset() {
    google.options = null;
    google.opened = 0;
  },
  /** The popup returned an authorization code. */
  succeed: (code: string) => google.options?.onSuccess?.({ code }),
  /** The popup was closed or failed. */
  fail: () => google.options?.onError?.(),
};

export const googleModule = {
  GoogleOAuthProvider: ({ children }: { children: unknown }) => children,
  useGoogleLogin: (options: LoginOptions) => {
    google.options = options;
    return vi.fn(() => {
      google.opened += 1;
    });
  },
};
