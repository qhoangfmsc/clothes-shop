import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildAlternates, buildSocialMetadata, withBrand } from "@/src/i18n/metadata";
import type { AppLocale } from "@/src/i18n/routing";
import { LEGAL_DOCS, LEGAL_HUB_PATH } from "@/src/lib/legal";
import LegalPage from "./_components/LegalPage";

type PageProps = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public.legal.hub.meta" });
  const title = withBrand(t("title"));
  return {
    title,
    description: t("description"),
    alternates: buildAlternates(locale, LEGAL_HUB_PATH),
    ...buildSocialMetadata({ locale, path: LEGAL_HUB_PATH, title, description: t("description") }),
    /* Repeats the three reading pages, so only those are indexed */
    robots: { index: false, follow: true },
  };
}

export default async function LegalOverviewPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage locale={locale} docs={LEGAL_DOCS.map((d) => d.key)} />;
}
