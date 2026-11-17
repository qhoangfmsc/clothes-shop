import { describe, expect, it } from "vitest";
import {
  currencyForLocale,
  formatMoney,
  formatUsd,
  formatVnd,
  maskVndInput,
  moneyOf,
  moneyOrNull,
  moneyValue,
  parseVndInput,
} from "@/src/lib/money";

/* The pure core of money: formatting, picking a half of the pair, and the admin's whole-dong input
   (specs/platform/currency.md, flows MON-1 … MON-6). */

const price = { vnd: 350_000, usd: 13.46 };

describe("MON-1 VND, the Vietnamese UI", () => {
  it.each([
    [0, "0 VNĐ"],
    [350_000, "350.000 VNĐ"],
    [1_234_567, "1.234.567 VNĐ"],
    [1_000_000_000, "1.000.000.000 VNĐ"],
    [999, "999 VNĐ"],
  ])("formats %d as %s", (amount, text) => {
    expect(formatVnd(amount)).toBe(text);
  });

  it("shows no fractional dong", () => {
    expect(formatVnd(350_000.4)).toBe("350.000 VNĐ");
  });

  it("formatMoney picks the VND half and ignores the USD half", () => {
    expect(formatMoney(price, "vi")).toBe("350.000 VNĐ");
    expect(formatMoney({ vnd: 350_000, usd: 999 }, "vi")).toBe("350.000 VNĐ");
  });
});

describe("MON-2 USD, every other UI language", () => {
  it.each([
    [0, "$0.00"],
    [13.46, "$13.46"],
    [13.4, "$13.40"],
    [1234.5, "$1,234.50"],
    [1_000_000, "$1,000,000.00"],
  ])("formats %d as %s", (amount, text) => {
    expect(formatUsd(amount)).toBe(text);
  });

  it("formatMoney picks the USD half and ignores the VND half", () => {
    expect(formatMoney(price, "en")).toBe("$13.46");
    expect(formatMoney({ vnd: 999, usd: 13.46 }, "en")).toBe("$13.46");
  });

  it("does not convert: the two halves are used as the BE sent them", () => {
    expect(formatMoney({ vnd: 1, usd: 1 }, "en")).toBe("$1.00");
    expect(formatMoney({ vnd: 1, usd: 1 }, "vi")).toBe("1 VNĐ");
  });
});

describe("MON-3 which currency a language uses", () => {
  it.each(["vi", "vi-VN", "VI", "Vi-vn"])("%s shows VND", (locale) => {
    expect(currencyForLocale(locale)).toBe("VND");
  });

  it.each(["en", "en-US", "fr", "ja", "", "xvi"])("%j shows USD", (locale) => {
    expect(currencyForLocale(locale)).toBe("USD");
  });

  it("moneyValue is the number of the chosen half, for analytics", () => {
    expect(moneyValue(price, "vi")).toBe(350_000);
    expect(moneyValue(price, "en")).toBe(13.46);
  });
});

describe("MON-4 reading the pair from a response", () => {
  const order = { totalVnd: 700_000, totalUsd: 26.92, shippingVnd: 0, shippingUsd: 0 };

  it("moneyOf reads <key>Vnd and <key>Usd", () => {
    expect(moneyOf(order, "total")).toEqual({ vnd: 700_000, usd: 26.92 });
  });

  it("treats zero as a real amount", () => {
    expect(moneyOf(order, "shipping")).toEqual({ vnd: 0, usd: 0 });
    expect(moneyOrNull({ feeVnd: 0, feeUsd: 0 }, "fee")).toEqual({ vnd: 0, usd: 0 });
    expect(formatMoney(moneyOf(order, "shipping"), "vi")).toBe("0 VNĐ");
  });

  it("moneyOrNull returns the pair when both halves exist", () => {
    expect(moneyOrNull({ originalPriceVnd: 500_000, originalPriceUsd: 19.2 }, "originalPrice")).toEqual({ vnd: 500_000, usd: 19.2 });
  });
});

describe("MON-4E a missing or null pair", () => {
  it.each([
    [{ originalPriceVnd: null, originalPriceUsd: null }],
    [{ originalPriceVnd: 500_000, originalPriceUsd: null }],
    [{ originalPriceVnd: null, originalPriceUsd: 19.2 }],
  ])("moneyOrNull gives null for %j", (source) => {
    expect(moneyOrNull(source, "originalPrice")).toBeNull();
  });

  it("does not guard a field the BE forgot: the screen would show NaN (known, see the spec)", () => {
    const broken = { totalVnd: 1 } as unknown as { totalVnd: number; totalUsd: number };

    expect(formatMoney(moneyOf(broken, "total"), "vi")).toBe("1 VNĐ");
    expect(formatMoney(moneyOf(broken, "total"), "en")).toBe("$NaN");
    expect(formatMoney(moneyOf({} as { totalVnd: number; totalUsd: number }, "total"), "vi")).toBe("NaN VNĐ");
  });

  it("the compiler refuses a response that lacks one half of the pair", () => {
    // @ts-expect-error totalUsd is missing
    moneyOf({ totalVnd: 1 }, "total");
    // @ts-expect-error the key does not match the fields
    moneyOf({ totalVnd: 1, totalUsd: 1 }, "price");
    // @ts-expect-error a nullable pair is not a plain pair
    moneyOf({ priceVnd: null, priceUsd: null }, "price");
  });
});

describe("MON-5 reading a whole-dong amount typed by an admin", () => {
  it.each([
    ["350000", 350_000],
    ["350.000", 350_000],
    ["1.234.567", 1_234_567],
    ["1.000.000.000", 1_000_000_000],
    ["0", 0],
    ["7", 7],
    ["  350.000  ", 350_000],
    ["007", 7],
  ])("%j is %d", (text, value) => {
    expect(parseVndInput(text)).toBe(value);
  });
});

describe("MON-5E text that is not a whole-dong amount", () => {
  it.each([
    ["350000.5", "a decimal"],
    ["350000,5", "a decimal comma"],
    ["350.00", "a two-digit group"],
    ["1.2345", "a four-digit group"],
    ["12.345.6", "a short last group"],
    ["1,000", "a thousands comma"],
    ["", "empty"],
    ["   ", "blank"],
    ["abc", "letters"],
    ["350k", "a suffix"],
    ["-350000", "a negative"],
    ["+350000", "a sign"],
    ["35 000", "a space inside"],
  ])("%j is refused (%s)", (text) => {
    expect(parseVndInput(text)).toBeNull();
  });

  it("refuses a number too large to hold exactly, instead of rounding it", () => {
    expect(parseVndInput("9007199254740993")).toBeNull();
    expect(parseVndInput("9007199254740991")).toBe(9_007_199_254_740_991);
  });
});

describe("MON-6 the box while an admin types", () => {
  it.each([
    ["350000", "350.000"],
    ["1234567", "1.234.567"],
    ["12", "12"],
    ["", ""],
    ["abc", ""],
    ["12a3", "123"],
    ["3 5 0", "350"],
    ["0012", "12"],
    ["0", "0"],
    ["000", "0"],
    ["350.00", "35.000"],
  ])("%j shows as %j", (raw, shown) => {
    expect(maskVndInput(raw)).toBe(shown);
  });

  it("round-trips with parseVndInput", () => {
    for (const n of [1, 999, 1000, 350_000, 1_234_567, 1_000_000_000]) {
      expect(parseVndInput(maskVndInput(String(n)))).toBe(n);
    }
  });
});
