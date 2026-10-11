import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates, buildSocialMetadata, withBrand } from "@/src/i18n/metadata";
import type { AppLocale } from "@/src/i18n/routing";
import { LEGAL_DOCS, type LegalDocKey } from "@/src/lib/legal";

/** Metadata for one reading page (`/terms`, `/privacy`, `/shipping-returns`). */
export async function buildLegalMetadata(
  locale: AppLocale,
  doc: LegalDocKey
): Promise<Metadata> {
  const [t, tTitles] = await Promise.all([
    getTranslations({ locale, namespace: "public.legal" }),
    getTranslations({ locale, namespace: "shared.legal" }),
  ]);
  const path = LEGAL_DOCS.find((d) => d.key === doc)?.path ?? "";
  const title = withBrand(tTitles(doc));
  const description = t(`${doc}.meta.description`);

  return {
    title,
    description,
    alternates: buildAlternates(locale, path),
    ...buildSocialMetadata({ locale, path, title, description }),
  };
}
