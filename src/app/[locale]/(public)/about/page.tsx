import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import InvitationHero from "./_components/InvitationHero";
import BrandStory from "./_components/BrandStory";
import ServicesSection from "./_components/ServicesSection";
import { buildAlternates, buildSocialMetadata, withBrand } from "@/src/i18n/metadata";
import type { AppLocale } from "@/src/i18n/routing";

type AboutPageProps = { params: Promise<{ locale: AppLocale }> };

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "public.about.meta" });
  const title = withBrand(t("title"));
  return {
    title,
    description: t("description"),
    alternates: buildAlternates(locale, "/about"),
    ...buildSocialMetadata({ locale, path: "/about", title, description: t("description") }),
  };
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      {/* Section 1: Hero — mood wallpaper + text */}
      <InvitationHero />

      {/* Section 2: Brand Story — clean editorial text */}
      <BrandStory />

      {/* Section 3: Services — dark invitation cards + CTA */}
      <ServicesSection />
    </main>
  );
}
