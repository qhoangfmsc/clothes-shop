import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/src/i18n/routing";
import { LEGAL_CONTACT, type LegalDocKey } from "@/src/lib/legal";
import { getShippingInfo } from "@/src/app/[locale]/(public)/shop/_lib/server-fetchers";
import type { LegalBlock, LegalDocumentContent } from "./types";

/**
 * Reads one legal document from `public.legal.<doc>` in the message files.
 *
 * Sections and their items are discovered from the JSON itself (in file order), so adding a
 * section or a paragraph is a message-only change. Inside a section: `title`, `p1…pN` are
 * paragraphs and `l1…lN` are list items (consecutive items form one bullet list).
 */
export async function getLegalDocument(
  locale: AppLocale,
  doc: LegalDocKey
): Promise<LegalDocumentContent> {
  const [t, tTitles, shipping] = await Promise.all([
    getTranslations({ locale, namespace: "public.legal" }),
    getTranslations({ locale, namespace: "shared.legal" }),
    getShippingInfo(),
  ]);

  /* The return window is configured by the admin (Site Config → Shipping & returns): the texts say
     `{returnWindow}`, never a number written in the message files */
  const returnDays = shipping?.returnPolicy.days;
  const values: Record<string, string> = {
    ...LEGAL_CONTACT,
    returnWindow: returnDays ? tTitles("returnWindow", { days: returnDays }) : tTitles("returnWindowUnknown"),
  };

  /* The item keys only exist at runtime, so the compiler cannot check them; `yarn i18n:check`
     still guarantees every key exists in every language. */
  const text = t as unknown as (key: string, values: Record<string, string>) => string;
  const raw = t.raw as unknown as (key: string) => Record<string, Record<string, string>>;
  const rawSections = raw(`${doc}.sections`);

  const sections = Object.entries(rawSections).map(([sectionKey, items]) => {
    const blocks: LegalBlock[] = [];
    for (const itemKey of Object.keys(items)) {
      if (itemKey === "title") continue;
      const value = text(`${doc}.sections.${sectionKey}.${itemKey}`, values);
      const last = blocks.at(-1);
      if (!itemKey.startsWith("l")) {
        blocks.push({ type: "paragraph", text: value });
      } else if (last?.type === "list") {
        last.items.push(value);
      } else {
        blocks.push({ type: "list", items: [value] });
      }
    }
    return {
      key: sectionKey,
      title: text(`${doc}.sections.${sectionKey}.title`, LEGAL_CONTACT),
      blocks,
    };
  });

  return {
    key: doc,
    title: tTitles(doc),
    intro: text(`${doc}.intro`, LEGAL_CONTACT),
    sections,
  };
}
