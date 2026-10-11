"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { usePathname, useRouter } from "@/src/i18n/navigation";
import { LOCALE_LABELS, routing, type AppLocale } from "@/src/i18n/routing";

interface LanguageSwitcherProps {
  /** "drawer" = pill chips for the dark burger menu, "footer" = a list that matches the footer's link columns */
  variant: "drawer" | "footer";
  /** Called after a language is picked (e.g. to close the drawer) */
  onChange?: () => void;
}

const DRAWER_BASE =
  "py-1.5 px-3.5 rounded-full border text-xs tracking-[0.08em] uppercase font-primary font-medium cursor-pointer transition-all duration-150 motion-reduce:transition-none";
const DRAWER_ACTIVE =
  "border-[var(--color-champagne-gold)] bg-[var(--color-champagne-gold)] text-[var(--color-noir)]";
const DRAWER_IDLE =
  "border-[var(--color-ash)] bg-transparent text-[var(--text-on-dark)] hover:border-[var(--text-on-dark)]";

/* Same type as the footer link columns (see SiteFooter FOOTER_LINK) */
const FOOTER_ITEM =
  "inline-flex items-center gap-2 border-0 bg-transparent p-0 font-primary text-sm leading-none tracking-[-0.02em] cursor-pointer transition-colors duration-[var(--duration-fast)] motion-reduce:transition-none";
const FOOTER_ACTIVE = "text-[var(--text-on-dark)]";
const FOOTER_IDLE = "text-[var(--ft-muted)] hover:text-[var(--text-on-dark)]";

/** Swaps the `/<locale>` prefix of the current URL, keeping path and query string. */
export default function LanguageSwitcher({ variant, onChange }: LanguageSwitcherProps) {
  const t = useTranslations("common.language");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: AppLocale) => {
    if (next === locale) return;
    startTransition(() => {
      router.replace(`${pathname}${window.location.search}`, { locale: next, scroll: false });
    });
    onChange?.();
  };

  if (variant === "footer") {
    return (
      <ul
        aria-label={t("label")}
        className={`m-0 flex list-none flex-col gap-3.5 p-0 pt-2 ${isPending ? "opacity-60" : ""}`}
      >
        {routing.locales.map((code) => {
          const isActive = code === locale;
          return (
            <li key={code}>
              <button
                type="button"
                lang={code}
                aria-current={isActive ? "true" : undefined}
                onClick={() => switchTo(code)}
                className={`${FOOTER_ITEM} ${isActive ? FOOTER_ACTIVE : FOOTER_IDLE}`}
              >
                {LOCALE_LABELS[code].name}
                {isActive && (
                  <Check size={13} className="text-[var(--accent-primary)]" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={`flex flex-wrap items-center gap-2 ${isPending ? "opacity-60" : ""}`}
    >
      {routing.locales.map((code) => {
        const isActive = code === locale;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-current={isActive ? "true" : undefined}
            title={LOCALE_LABELS[code].name}
            onClick={() => switchTo(code)}
            className={`${DRAWER_BASE} ${isActive ? DRAWER_ACTIVE : DRAWER_IDLE}`}
          >
            {LOCALE_LABELS[code].short}
          </button>
        );
      })}
    </div>
  );
}
