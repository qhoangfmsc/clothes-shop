import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { vi } from "vitest";

/* A stand-in for `@/src/i18n/navigation` (next-intl's locale-aware Link / useRouter / usePathname). The real one
   needs the Next.js app router, which does not exist in unit tests. It is installed for every test in `setup.ts`.
   Set `navigation.pathname` before rendering; read `navigation.router.push` etc. to see where the code navigated. */

const routerMethods = () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() });

export const navigation = {
  pathname: "/",
  router: routerMethods(),
  redirects: [] as string[],
  /** Back to a clean state; `setup.ts` calls it after every test. */
  reset() {
    navigation.pathname = "/";
    navigation.router = routerMethods();
    navigation.redirects = [];
  },
};

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode };

export const navigationModule = {
  Link: ({ href, children, ...rest }: LinkProps) => createElement("a", { href, ...rest }, children),
  usePathname: () => navigation.pathname,
  useRouter: () => navigation.router,
  getPathname: ({ href }: { href: string }) => href,
  /** The real `redirect` throws to stop rendering; so does this, after recording where to. */
  redirect: (href: string) => {
    navigation.redirects.push(href);
    throw new Error(`NEXT_REDIRECT:${href}`);
  },
};
