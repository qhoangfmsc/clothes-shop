import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/src/i18n/routing";
import { withBrand } from "@/src/i18n/metadata";
import SiteHeader from "@/src/app/[locale]/_components/SiteHeader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "private.checkout.meta" });
  return { title: withBrand(t("title")), description: t("description") };
}

export default function CheckoutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
