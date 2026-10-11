import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import ScopedMessages from "@/src/i18n/ScopedMessages";
import type { AppLocale } from "@/src/i18n/routing";

/* Cart, checkout, account… belong to one user: keep them out of search results. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PrivateLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: AppLocale }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ScopedMessages scope="private">{children}</ScopedMessages>;
}
