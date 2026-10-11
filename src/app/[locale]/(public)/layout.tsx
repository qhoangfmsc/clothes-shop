import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import ScopedMessages from "@/src/i18n/ScopedMessages";
import { routing } from "@/src/i18n/routing";
import SiteFooter from "../_components/SiteFooter";
import SiteHeader from "../_components/SiteHeader";

export default async function PublicLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <ScopedMessages scope="public">
      <SiteHeader />
      {children}
      <SiteFooter />
    </ScopedMessages>
  );
}
