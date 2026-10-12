import { useTranslations } from "next-intl";
import type { SortValue } from "@/src/lib/list-query";

/** `key` is a label in `admin.components.crud.sort.<key>` — one shared set of sort labels. */
export interface SortOptionDef<K extends string = string> {
  value: SortValue;
  key: K;
}

/**
 * Turns a module's `{ value, key }` sort constants into DataTable `sortOptions`,
 * with labels from the shared `admin.components.crud.sort` namespace.
 */
export function useSortOptions(defs: readonly SortOptionDef[]) {
  const t = useTranslations("admin.components.crud.sort");
  return defs.map((def) => ({
    value: def.value,
    label: t(def.key as Parameters<typeof t>[0]),
  }));
}
