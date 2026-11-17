"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { errorCodeOf, errorText } from "./error-message";

/** Message for a caught error, best first: the translation of the BE `errorCode` (`shared.errors.byCode.<code>`), the server's own text,
 *  the translated `fallback`. Works for real `Error`s and for plain objects thrown by `dispatch(thunk).unwrap()`.
 *  The function is stable between renders (changes with the locale), so it is safe in dependency lists. */
export function useErrorMessage() {
  const t = useTranslations("shared.errors");
  return useCallback(
    (err: unknown, fallback: string): string => {
      const code = errorCodeOf(err);
      if (code !== undefined) {
        const key = `byCode.${code}` as Parameters<typeof t.has>[0];
        if (t.has(key)) return t(key);
      }
      return errorText(err) || fallback;
    },
    [t]
  );
}
