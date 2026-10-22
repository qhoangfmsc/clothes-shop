export const TIME_ZONE = "Asia/Ho_Chi_Minh";

/** Named formats for `format.number(v, "decimal1")` / `format.dateTime(d, "short")`. Money never goes through here: use `useMoney()`. */
export const FORMATS = {
  number: {
    decimal1: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  },
  dateTime: {
    short: { year: "numeric", month: "short", day: "numeric" },
    long: { year: "numeric", month: "long", day: "numeric" },
    dateTime: { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
    monthYear: { year: "numeric", month: "long" },
  },
} as const;
