import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { loadMessages } from "./messages";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
    /* One fixed zone so server and client render the same date text (no hydration mismatch) */
    timeZone: "Asia/Ho_Chi_Minh",
    /* Named formats: use `format.number(v, "price")` / `format.dateTime(d, "short")` — never toFixed / toLocaleString */
    formats: {
      number: {
        /* Prices are stored in USD; only the notation follows the language */
        price: {
          style: "currency",
          currency: "USD",
          currencyDisplay: "narrowSymbol",
          maximumFractionDigits: 2,
        },
        priceFixed: {
          style: "currency",
          currency: "USD",
          currencyDisplay: "narrowSymbol",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
        /* Bank transfers (VietQR) are settled in VND: whole dong, no decimals */
        vnd: {
          style: "currency",
          currency: "VND",
          currencyDisplay: "narrowSymbol",
          maximumFractionDigits: 0,
        },
        decimal1: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
      },
      dateTime: {
        short: { year: "numeric", month: "short", day: "numeric" },
        long: { year: "numeric", month: "long", day: "numeric" },
        dateTime: {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
        monthYear: { year: "numeric", month: "long" },
      },
    },
  };
});
