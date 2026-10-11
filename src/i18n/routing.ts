import { defineRouting } from "next-intl/routing";

/** Single source of truth for supported languages.
 *  Adding a language = add its code here + a `src/messages/<code>/` folder
 *  (copy `en`), + one entry in LOCALE_LABELS. Nothing else in the code changes. */
export const routing = defineRouting({
  locales: ["vi", "en"],
  defaultLocale: "vi",
  /* Always `/vi/...`, `/en/...`, `/fr/...` — same model as international brand sites */
  localePrefix: "always",
  /* Accept-Language is ignored: an un-prefixed URL always goes to `/vi` (see middleware.ts). */
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];

/** Native name of every language — always shown in its own language, never translated. */
export const LOCALE_LABELS: Record<AppLocale, { name: string; short: string }> = {
  vi: { name: "Tiếng Việt", short: "VI" },
  en: { name: "English", short: "EN" },
};
