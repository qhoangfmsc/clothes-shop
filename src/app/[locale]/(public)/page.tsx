import { setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/src/i18n/routing";
import JsonLd from "@/src/app/[locale]/_components/JsonLd";
import { siteJsonLd } from "@/src/lib/structured-data";
import LandingPage from "./landing-page/page";

export default async function Home({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <JsonLd data={siteJsonLd()} />
      <LandingPage />
    </>
  );
}
