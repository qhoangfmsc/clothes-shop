import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { vi } from "vitest";

/* Stand-ins for `@/src/i18n/navigation` and the `next/navigation` hooks, which need the Next.js app router. Installed for every test
   in `setup.ts`. Set `navigation.pathname`, `.searchParams` and `.params` before rendering; read `navigation.router.push` etc. afterwards. */

const routerMethods = () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() });

export const navigation = {
  pathname: "/",
  searchParams: new URLSearchParams(),
  params: {} as Record<string, string | string[]>,
  router: routerMethods(),
  redirects: [] as string[],
  /** Back to a clean state; `setup.ts` calls it after every test. */
  reset() {
    navigation.pathname = "/";
    navigation.searchParams = new URLSearchParams();
    navigation.params = {};
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

export const nextNavigationModule = {
  useSearchParams: () => navigation.searchParams,
  useParams: () => navigation.params,
  usePathname: () => navigation.pathname,
  useRouter: () => navigation.router,
  /** Like Next, stops rendering by throwing. */
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: navigationModule.redirect,
};
