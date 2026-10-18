"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import {
  currencyForLocale,
  formatMoney,
  formatVnd,
  moneyOf,
  moneyOrNull,
  moneyValue,
  type Currency,
  type Money,
  type MoneyFields,
  type NullableMoneyFields,
} from "@/src/lib/money";

/**
 * Money formatting bound to the UI language (VND for `vi`, USD otherwise). Every amount on screen goes through
 * here: pass the `Money` pair, or a response object plus the field name (`fmt(order, "total")` reads
 * `totalVnd` / `totalUsd`). Nothing is converted or computed — the BE sends both halves and the UI language picks one.
 */
export function useMoney() {
  const locale = useLocale();

  return useMemo(() => {
    const currency: Currency = currencyForLocale(locale);
    return {
      locale,
      currency,
      /** `350.000 VNĐ` / `$13.46` */
      format: (money: Money) => formatMoney(money, locale),
      /** Format the pair `<key>Vnd` / `<key>Usd` of a response object */
      fmt: <K extends string>(source: MoneyFields<K>, key: K) => formatMoney(moneyOf(source, key), locale),
      /** Same for a pair that can be `null` (`originalPrice`, `freeShippingThreshold`) → `null` */
      fmtOrNull: <K extends string>(source: NullableMoneyFields<K>, key: K) => {
        const money = moneyOrNull(source, key);
        return money ? formatMoney(money, locale) : null;
      },
      /** Number in the UI currency, for analytics events (pair it with `currency`) */
      value: (money: Money) => moneyValue(money, locale),
      /** Always VND: only for a figure the BE gives in VND alone (the admin revenue sum) */
      vnd: formatVnd,
    };
  }, [locale]);
}
