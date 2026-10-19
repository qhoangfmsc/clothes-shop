import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import type { AppLocale } from "@/src/i18n/routing";
import { LEGAL_DOCS, LEGAL_LAST_UPDATED, type LegalDocKey } from "@/src/lib/legal";
import { getLegalDocument } from "../_common/content";
import type { LegalDocumentContent } from "../_common/types";
import LegalToc from "./LegalToc";

interface LegalPageProps {
  locale: AppLocale;
  /** One document → its own reading page. Several → the /legal overview. */
  docs: LegalDocKey[];
}

function DocumentBody({
  doc,
  showHeading,
}: {
  doc: LegalDocumentContent;
  showHeading: boolean;
}) {
  /* The page title is the document title on a reading page, so sections start one level lower */
  const SectionHeading = showHeading ? "h3" : "h2";

  return (
    <article id={doc.key} className="flex scroll-mt-[7.5rem] flex-col gap-10">
      {showHeading && (
        <header className="flex flex-col gap-3 border-b border-[var(--border-light)] pb-6">
          <h2 className="m-0 font-display text-2xl font-normal leading-none tracking-[-0.04em] text-[var(--text-heading)] sm:text-3xl">
            {doc.title}
          </h2>
          <p className="m-0 font-primary text-base leading-[150%] tracking-[-0.02em] text-[var(--text-secondary)]">
            {doc.intro}
          </p>
        </header>
      )}

      {doc.sections.map((section, index) => (
        <section
          key={section.key}
          id={`${doc.key}-${section.key}`}
          className="flex scroll-mt-[7.5rem] flex-col gap-3"
        >
          <SectionHeading className="m-0 font-display text-lg font-normal leading-[120%] tracking-[-0.04em] text-[var(--text-heading)] sm:text-xl">
            {index + 1}. {section.title}
          </SectionHeading>
          {section.blocks.map((block, blockIndex) =>
            block.type === "paragraph" ? (
              <p
                key={blockIndex}
                className="m-0 font-primary text-base leading-[160%] tracking-[-0.02em] text-[var(--text-secondary)]"
              >
                {block.text}
              </p>
            ) : (
              <ul
                key={blockIndex}
                className="m-0 flex list-disc flex-col gap-2 pl-6 font-primary text-base leading-[160%] tracking-[-0.02em] text-[var(--text-secondary)] marker:text-[var(--accent-primary)]"
              >
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )
          )}
        </section>
      ))}
    </article>
  );
}

export default async function LegalPage({ locale, docs: docKeys }: LegalPageProps) {
  const [t, tTitles, format, docs] = await Promise.all([
    getTranslations({ locale, namespace: "public.legal" }),
    getTranslations({ locale, namespace: "shared.legal" }),
    getFormatter({ locale }),
    Promise.all(docKeys.map((key) => getLegalDocument(locale, key))),
  ]);

  const isOverview = docs.length > 1;
  const single = docs[0];
  const title = isOverview ? t("hub.title") : single.title;
  const subtitle = isOverview ? t("hub.subtitle") : single.intro;
  /* Noon UTC keeps the calendar day the same in every time zone */
  const updated = format.dateTime(new Date(`${LEGAL_LAST_UPDATED}T12:00:00Z`), "long");
  const otherDocs = LEGAL_DOCS.filter((d) => !docKeys.includes(d.key));

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-[7.5rem] pb-20">
      <div className="mx-auto max-w-[65rem] px-4 sm:px-6">
        <header className="mb-10 flex flex-col gap-3 lg:mb-14">
          <p className="m-0 font-primary text-xs font-medium uppercase tracking-[0.12em] text-[var(--accent-primary)]">
            {tTitles("title")}
          </p>
          <h1 className="m-0 font-display text-3xl font-normal leading-none tracking-[-0.04em] text-[var(--text-heading)] sm:text-4xl">
            {title}
          </h1>
          <p className="m-0 max-w-[40rem] font-primary text-base leading-[150%] tracking-[-0.02em] text-[var(--text-secondary)]">
            {subtitle}
          </p>
          <p className="m-0 font-primary text-sm tracking-[-0.02em] text-[var(--text-muted)]">
            {t("common.lastUpdated", { date: updated })}
          </p>
        </header>

        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
          <aside className="lg:w-[16.25rem] lg:shrink-0">
            <LegalToc locale={locale} docs={docs} />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-16">
            {docs.map((doc) => (
              <DocumentBody key={doc.key} doc={doc} showHeading={isOverview} />
            ))}

            {!isOverview && otherDocs.length > 0 && (
              <nav
                aria-label={t("common.otherPolicies")}
                className="flex flex-col gap-3 border-t border-[var(--border-light)] pt-8"
              >
                <p className="m-0 font-primary text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  {t("common.otherPolicies")}
                </p>
                <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
                  {otherDocs.map((d) => (
                    <li key={d.key}>
                      <Link
                        href={d.path}
                        className="inline-flex rounded-full border border-[var(--border-light)] px-4 py-2 font-primary text-sm tracking-[-0.02em] text-[var(--text-secondary)] no-underline transition-colors duration-150 hover:bg-[var(--color-champagne-cream)] hover:text-[var(--text-primary)] motion-reduce:transition-none"
                      >
                        {tTitles(d.key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
