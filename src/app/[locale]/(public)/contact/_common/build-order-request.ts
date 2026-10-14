import { MEASUREMENT_KEYS } from "./constants";
import type { OrderProduct, OrderRequestMessage, OrderRequestValues } from "./types";

/** Looks up a key under `public.contact` (pass a wrapper around `useTranslations`). */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

interface BuildInput {
  product: OrderProduct | null;
  values: OrderRequestValues;
  /** Formats the `YYYY-MM-DD` of the date input in the visitor's language. */
  formatDate: (isoDate: string) => string;
}

/** `LABEL: value` rows, indented under a section heading. */
const row = (label: string, value: string) => `  ${label}: ${value}`;

function section(title: string, rows: string[]): string | null {
  const filled = rows.filter(Boolean);
  return filled.length ? [title, ...filled].join("\n") : null;
}

/**
 * Plain-text order request for a `mailto:` body or a chat message — a `mailto:` link cannot carry
 * HTML, so the structure comes from uppercase section headings and aligned `label: value` rows.
 * Sections without any data are left out.
 */
export function buildOrderRequest(
  t: Translate,
  { product, values, formatDate }: BuildInput
): OrderRequestMessage {
  const measurements = MEASUREMENT_KEYS.filter((key) => values.measurements[key].trim()).map(
    (key) => `${t(`message.measurements.${key}`)} ${values.measurements[key].trim()}`
  );

  const blocks = [
    section(
      t("message.sections.product"),
      product
        ? [
            row(t("message.labels.product"), product.name),
            product.sku ? row(t("message.labels.reference"), product.sku) : "",
            row(t("message.labels.link"), product.url),
          ]
        : []
    ),
    section(
      t("message.sections.design"),
      values.note.trim() ? values.note.trim().split("\n").map((line) => `  ${line}`) : []
    ),
    section(t("message.sections.order"), [
      measurements.length ? row(t("message.labels.measurements"), measurements.join(" · ")) : "",
      values.weight.trim() ? row(t("message.labels.weight"), values.weight.trim()) : "",
      row(t("message.labels.quantity"), String(values.quantity)),
      values.neededBy ? row(t("message.labels.neededBy"), formatDate(values.neededBy)) : "",
    ]),
    section(t("message.sections.contact"), [
      values.fullName.trim() ? row(t("message.labels.name"), values.fullName.trim()) : "",
      values.phone.trim() ? row(t("message.labels.phone"), values.phone.trim()) : "",
    ]),
  ].filter((block): block is string => block !== null);

  const body = [
    t("message.greeting"),
    t("message.intro"),
    ...blocks,
    [t("message.closing"), values.fullName.trim()].filter(Boolean).join("\n"),
  ].join("\n\n");

  const subject = product
    ? t("message.subject", { product: product.name })
    : t("message.subjectGeneric");

  return { subject, body };
}
