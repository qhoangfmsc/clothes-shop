import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { LEGAL_DOCS } from "@/src/lib/legal";
import LanguageSwitcher from "./LanguageSwitcher";
import SocialIcons from "./SocialIcons";

/* Link groups — labels come from shared/header so the wording matches the header exactly */
const EXPLORE_LINKS = [
  { key: "shop", href: "/shop" },
  { key: "newIn", href: "/new-in" },
  { key: "collections", href: "/collections" },
  { key: "about", href: "/about" },
] as const;

const ACCOUNT_LINKS = [
  { key: "myAccount", href: "/account" },
  { key: "wishlist", href: "/wishlist" },
  { key: "orders", href: "/orders" },
] as const;

/* One look for every column: the same heading row, the same list rhythm, the same link style */
const HEADING_ROW = "flex h-10 items-center";
const HEADING =
  "m-0 font-primary text-xs font-medium uppercase tracking-[0.12em] text-[var(--accent-primary)]";
const LIST = "m-0 flex list-none flex-col gap-3.5 p-0 pt-2";
const FOOTER_LINK =
  "font-primary text-sm leading-none tracking-[-0.02em] text-[var(--ft-muted)] no-underline transition-colors duration-[var(--duration-fast)] hover:text-[var(--text-on-dark)] motion-reduce:transition-none";

export default function SiteFooter() {
  const t = useTranslations("shared.footer");
  const tNav = useTranslations("shared.header.nav");
  const tAccount = useTranslations("shared.header.account");
  const tLegal = useTranslations("shared.legal");

  return (
    <footer className="relative overflow-hidden border-t border-[var(--ft-line)] bg-[var(--bg-dark)] text-[var(--text-on-dark)] [--ft-line:color-mix(in_srgb,var(--text-on-dark)_14%,transparent)] [--ft-muted:color-mix(in_srgb,var(--text-on-dark)_60%,transparent)]">
      <div className="mx-auto max-w-[1280px] px-4 pt-14 pb-6 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-x-10">
          {/* Brand */}
          <div className="col-span-2 flex flex-col sm:col-span-3 lg:col-span-1">
            <div className={HEADING_ROW}>
              <Link
                href="/"
                aria-label={t("homeAria")}
                className="font-display text-[36px] leading-none tracking-[-0.04em] text-[var(--text-on-dark)] no-underline"
              >
                DOOVAN
              </Link>
            </div>
            <p className="m-0 mt-2 max-w-[300px] font-primary text-sm leading-[150%] tracking-[-0.02em] text-[var(--ft-muted)]">
              {t("tagline")}
            </p>
            <SocialIcons
              className="mt-5 gap-2"
              iconSize={16}
              linkClassName="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--ft-line)] text-[var(--text-on-dark)] transition-colors duration-[var(--duration-fast)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] motion-reduce:transition-none"
            />
          </div>

          {/* Explore */}
          <nav aria-label={t("explore.title")} className="flex flex-col">
            <div className={HEADING_ROW}>
              <h2 className={HEADING}>{t("explore.title")}</h2>
            </div>
            <ul className={LIST}>
              {EXPLORE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={FOOTER_LINK}>
                    {tNav(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Account */}
          <nav aria-label={t("account.title")} className="flex flex-col">
            <div className={HEADING_ROW}>
              <h2 className={HEADING}>{t("account.title")}</h2>
            </div>
            <ul className={LIST}>
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={FOOTER_LINK}>
                    {tAccount(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Language */}
          <div className="flex flex-col">
            <div className={HEADING_ROW}>
              <h2 className={HEADING}>{t("language.title")}</h2>
            </div>
            <LanguageSwitcher variant="footer" />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[var(--ft-line)] pt-5 sm:flex-row">
          <span className="font-primary text-xs tracking-[0.02em] text-[var(--ft-muted)]">
            {t("copyright", { year: new Date().getFullYear() })}
          </span>
          <nav
            aria-label={tLegal("title")}
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
          >
            {LEGAL_DOCS.map((doc) => (
              <Link
                key={doc.key}
                href={doc.path}
                className={`${FOOTER_LINK} !text-xs !tracking-[0.02em]`}
              >
                {tLegal(doc.key)}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
