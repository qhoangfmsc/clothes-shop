import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/src/i18n/routing";
import type { LegalDocumentContent } from "../_common/types";

const TOC_LINK =
  "font-primary text-sm leading-[140%] tracking-[-0.02em] text-[var(--text-secondary)] no-underline transition-colors duration-150 hover:text-[var(--accent-primary)] motion-reduce:transition-none";

interface LegalTocProps {
  locale: AppLocale;
  docs: LegalDocumentContent[];
}

/** Anchor list of the sections on the page. With several documents (the /legal overview) it is
 *  grouped by document, and on phones only the document titles show to keep it short. */
export default async function LegalToc({ locale, docs }: LegalTocProps) {
  const t = await getTranslations({ locale, namespace: "public.legal.common" });
  const grouped = docs.length > 1;

  return (
    <nav
      aria-label={t("contents")}
      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 lg:sticky lg:top-[120px]"
    >
      <p className="m-0 mb-3 font-primary text-xs font-medium uppercase tracking-[0.12em] text-[var(--accent-primary)]">
        {t("contents")}
      </p>
      <ol className="m-0 flex list-none flex-col gap-4 p-0">
        {docs.map((doc) => (
          <li key={doc.key} className="flex flex-col gap-2">
            {grouped && (
              <a
                href={`#${doc.key}`}
                className={`${TOC_LINK} !font-medium !text-[var(--text-heading)]`}
              >
                {doc.title}
              </a>
            )}
            <ol
              className={`m-0 flex list-none flex-col gap-2 p-0 ${grouped ? "hidden lg:flex lg:pl-3" : ""}`}
            >
              {doc.sections.map((section, index) => (
                <li key={section.key}>
                  <a href={`#${doc.key}-${section.key}`} className={TOC_LINK}>
                    {index + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </nav>
  );
}
