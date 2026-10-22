import { describe, expect, it } from "vitest";
import { FORMATS, TIME_ZONE } from "@/src/i18n/formats";
import { LOCALE_LABELS, routing } from "@/src/i18n/routing";

/* Languages and the named formats (specs/platform/i18n.md, flow I18-1). */

describe("I18-1 routing", () => {
  it("has Vietnamese first and as the default, with the locale always in the URL", () => {
    expect(routing.locales).toEqual(["vi", "en"]);
    expect(routing.defaultLocale).toBe("vi");
    expect(routing.localePrefix).toBe("always");
  });

  it("does not guess the language from the browser", () => {
    expect(routing.localeDetection).toBe(false);
  });

  it("labels every language in its own words, with a short code and an Open Graph locale", () => {
    expect(Object.keys(LOCALE_LABELS).sort()).toEqual([...routing.locales].sort());
    expect(LOCALE_LABELS.vi).toEqual({ name: "Tiếng Việt", short: "VI", ogLocale: "vi_VN" });
    expect(LOCALE_LABELS.en).toEqual({ name: "English", short: "EN", ogLocale: "en_US" });
  });
});

describe("I18-1 formats", () => {
  it("uses one fixed time zone so server and browser print the same date", () => {
    expect(TIME_ZONE).toBe("Asia/Ho_Chi_Minh");
  });

  it("has the named number format for one decimal, and no money format", () => {
    expect(FORMATS.number).toEqual({ decimal1: { minimumFractionDigits: 1, maximumFractionDigits: 1 } });
  });

  it("has the named date formats", () => {
    expect(Object.keys(FORMATS.dateTime).sort()).toEqual(["dateTime", "long", "monthYear", "short"]);
    expect(FORMATS.dateTime.short).toEqual({ year: "numeric", month: "short", day: "numeric" });
    expect(FORMATS.dateTime.dateTime).toMatchObject({ hour: "2-digit", minute: "2-digit" });
  });
});
