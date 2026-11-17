import { describe, expect, it, vi } from "vitest";
import { FORMATS, TIME_ZONE } from "@/src/i18n/formats";
import request from "@/src/i18n/request";

/* next-intl/server refuses to load outside a server runtime; its getRequestConfig only returns the function it is given */
vi.mock("next-intl/server", () => ({ getRequestConfig: (config: unknown) => config }));
vi.mock("@/src/i18n/messages", () => ({ loadMessages: async (locale: string) => ({ loadedFor: locale }) }));

/* What the server gives next-intl for a request (flows I18-3 and I18-3E). */

const forLocale = (locale: string | undefined) => request({ requestLocale: Promise.resolve(locale) } as never);

describe("I18-3 request configuration", () => {
  it.each(["vi", "en"])("keeps the locale %s and loads its messages", async (locale) => {
    const config = await forLocale(locale);

    expect(config.locale).toBe(locale);
    expect(config.messages).toEqual({ loadedFor: locale });
  });

  it("fixes the time zone and passes the named formats", async () => {
    const config = await forLocale("en");

    expect(config.timeZone).toBe(TIME_ZONE);
    expect(config.formats).toEqual(FORMATS);
  });
});

describe("I18-3E a locale that is not supported", () => {
  it.each(["fr", "VI", "vi-VN", "", "../etc"])("%j falls back to Vietnamese", async (locale) => {
    const config = await forLocale(locale);

    expect(config.locale).toBe("vi");
    expect(config.messages).toEqual({ loadedFor: "vi" });
  });

  it("falls back to Vietnamese when the request has no locale", async () => {
    expect((await forLocale(undefined)).locale).toBe("vi");
  });
});
