import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import LoginContent from "./LoginContent";
import { buildAlternates, withBrand } from "@/src/i18n/metadata";
import type { AppLocale } from "@/src/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.login.meta" });
  return {
    title: withBrand(t("title")),
    description: t("description"),
    alternates: buildAlternates(locale, "/login"),
    robots: { index: false, follow: false },
  };
}

export default function LoginPage() {
  return <LoginContent />;
}
