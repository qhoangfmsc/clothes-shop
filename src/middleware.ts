import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const hasLocalePrefix = (pathname: string) =>
  routing.locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  /* Un-prefixed URL (old link, typed address) always lands on the default language
     (`/vi`). Never guessed from the browser's language or a cookie. */
  if (!hasLocalePrefix(pathname)) {
    const target = new URL(
      `/${routing.defaultLocale}${pathname === "/" ? "" : pathname}${search}`,
      request.url
    );
    return NextResponse.redirect(target);
  }

  return intlMiddleware(request);
}

export const config = {
  /* Skip API routes, the media proxy, Next internals and files with an extension */
  matcher: ["/((?!api|media|_next|_vercel|.*\\..*).*)"],
};
