import { setRequestLocale } from "next-intl/server";
import ScopedMessages from "@/src/i18n/ScopedMessages";
import type { AppLocale } from "@/src/i18n/routing";
import SiteFooter from "../_components/SiteFooter";
import SiteHeader from "../_components/SiteHeader";

export default async function PublicLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: AppLocale }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ScopedMessages scope="public">
      <SiteHeader />
      {children}
      <SiteFooter />
    </ScopedMessages>
  );
}
