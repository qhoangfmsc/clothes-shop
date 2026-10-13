import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/src/i18n/routing";
import JsonLd from "@/src/app/[locale]/_components/JsonLd";
import { siteJsonLd } from "@/src/lib/structured-data";
import LandingPage from "./landing-page/page";

export default async function Home({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tSite = await getTranslations({ locale, namespace: "shared.site" });
  const tLanding = await getTranslations({ locale, namespace: "public.landing" });

  return (
    <>
      <JsonLd data={siteJsonLd(locale, tSite("meta.description"), tSite("identity"))} />
      {/* The scroll-story below has no text heading of its own; this one names the page for crawlers and screen readers */}
      <h1 className="sr-only">{tLanding("heading")}</h1>
      <LandingPage />
    </>
  );
}
