import { setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/src/i18n/routing";
import { SITE_URL } from "@/src/lib/site-url";
import LandingPage from "./landing-page/page";

/* Tells Google the site's name and logo (brand name is never translated). */
const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DOOVAN",
    url: SITE_URL,
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DOOVAN",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
  },
];

export default async function Home({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPage />
    </>
  );
}
