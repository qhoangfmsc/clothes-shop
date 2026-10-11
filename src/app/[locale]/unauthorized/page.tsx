import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import UnauthorizedContent from "./UnauthorizedContent";
import type { AppLocale } from "@/src/i18n/routing";
import { withBrand } from "@/src/i18n/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shared.errors.unauthorized.meta" });
  return { title: withBrand(t("title")), robots: { index: false, follow: false } };
}

export default function UnauthorizedPage() {
  return <UnauthorizedContent />;
}
