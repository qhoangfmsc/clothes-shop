/* Money — the only place that formats an amount.
   The BE stores VND (whole dong) and sends every amount as a pair `<name>Vnd` / `<name>Usd`; the USD half is
   already converted and rounded by the BE. The FE never converts, adds, multiplies or rounds money: it picks
   the half that matches the UI language and formats it. */

export type Currency = "VND" | "USD";

/** One amount as the BE sends it: both currencies side by side */
export interface Money {
  vnd: number;
  usd: number;
}

/** Fields of a response that carry the pair `<key>Vnd` / `<key>Usd` */
export type MoneyFields<K extends string> = Record<`${K}Vnd`, number> & Record<`${K}Usd`, number>;
export type NullableMoneyFields<K extends string> = Record<`${K}Vnd`, number | null> & Record<`${K}Usd`, number | null>;

/* VND is written `350.000 VNĐ`: the number follows vi-VN grouping, the unit is the shop's own label */
const VND_NUMBER = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const USD_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});


/** Vietnamese shows VND, every other language shows USD */
export function currencyForLocale(locale: string): Currency {
  return locale.toLowerCase().startsWith("vi") ? "VND" : "USD";
}

const VND_UNIT = "VNĐ";

export const formatVnd = (vnd: number): string => `${VND_NUMBER.format(vnd)} ${VND_UNIT}`;
export const formatUsd = (usd: number): string => USD_FORMAT.format(usd);

/** The half of `money` that belongs to the UI language, formatted: `350.000 VNĐ` (vi) / `$13.46` (other) */
export function formatMoney(money: Money, locale: string): string {
  return currencyForLocale(locale) === "VND" ? formatVnd(money.vnd) : formatUsd(money.usd);
}

/** The numeric half for the UI language (analytics `value`), paired with `currencyForLocale` */
export function moneyValue(money: Money, locale: string): number {
  return currencyForLocale(locale) === "VND" ? money.vnd : money.usd;
}

/** `{ priceVnd, priceUsd }` → `{ vnd, usd }` */
export function moneyOf<K extends string>(source: MoneyFields<K>, key: K): Money {
  const fields = source as Record<string, number>;
  return { vnd: fields[`${key}Vnd`], usd: fields[`${key}Usd`] };
}

/** Like `moneyOf` for a pair that is `null` together (`originalPrice`, `freeShippingThreshold`) */
export function moneyOrNull<K extends string>(source: NullableMoneyFields<K>, key: K): Money | null {
  const fields = source as Record<string, number | null>;
  const vnd = fields[`${key}Vnd`];
  const usd = fields[`${key}Usd`];
  return vnd == null || usd == null ? null : { vnd, usd };
}

/** Whole-dong input as shown in an admin field: plain digits or digits grouped with dots (`350.000`).
 *  Returns `null` for anything else (`350000.5`, letters, empty) so a decimal is never read as a bigger number. */
export function parseVndInput(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d+$/.test(text) && !/^\d{1,3}(\.\d{3})+$/.test(text)) return null;
  const value = Number(text.replace(/\./g, ""));
  return Number.isSafeInteger(value) ? value : null;
}

/** Digits of `value` grouped with dots while an admin types (`350000` → `350.000`); the field stays a string */
export function maskVndInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
