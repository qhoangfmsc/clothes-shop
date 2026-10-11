import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/src/i18n/routing";
import { buildLegalMetadata } from "../legal/_common/metadata";
import LegalPage from "../legal/_components/LegalPage";

type PageProps = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return buildLegalMetadata(locale, "shippingReturns");
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage locale={locale} docs={["shippingReturns"]} />;
}
