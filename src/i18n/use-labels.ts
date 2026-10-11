"use client";

import { useTranslations } from "next-intl";

/** Looks up `<namespace>.<value>` and falls back to the raw value when the API sends something
 *  we have no translation for (e.g. a status added on the backend later). */
function useLabelLookup(namespace: "common.orderStatus" | "common.addressField" | "common.role") {
  const t = useTranslations(namespace);
  return (value: string): string => (t.has(value as never) ? t(value as never) : value);
}

export const useOrderStatusLabel = () => useLabelLookup("common.orderStatus");
export const useAddressFieldLabel = () => useLabelLookup("common.addressField");
export const useRoleLabel = () => useLabelLookup("common.role");
