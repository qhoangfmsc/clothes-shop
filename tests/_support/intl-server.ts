import { createTranslator } from "next-intl";
import { FORMATS, TIME_ZONE } from "@/src/i18n/formats";
import { MESSAGES } from "./messages";

/* Stand-in for `next-intl/server`, which refuses to load outside a Next.js server request. It answers with the real translations of the
   language the page set with `setRequestLocale` (default `vi`). Installed for every test in `setup.ts`; a test that needs to spy on it
   mocks the module itself. */

type Locale = "vi" | "en";
const state = { locale: "vi" as Locale };

export const intlServer = {
  /** Back to the default language; `setup.ts` calls it after every test. */
  reset() {
    state.locale = "vi";
  },
};

type Request = string | { locale?: string; namespace?: string } | undefined;

export const intlServerModule = {
  setRequestLocale: (locale: string) => {
    state.locale = locale as Locale;
  },
  getLocale: async () => state.locale,
  getMessages: async () => MESSAGES[state.locale],
  getTranslations: async (request?: Request) => {
    const namespace = typeof request === "string" ? request : request?.namespace;
    const locale = ((typeof request === "object" && request?.locale) || state.locale) as Locale;
    return createTranslator({ locale, messages: MESSAGES[locale], namespace: namespace as never, formats: FORMATS, timeZone: TIME_ZONE });
  },
  getRequestConfig: (config: unknown) => config,
};
