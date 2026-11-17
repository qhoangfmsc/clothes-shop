import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MoneyText from "@/src/app/[locale]/_components/MoneyText";
import { useMoney } from "@/src/hooks/use-money";
import { renderApp } from "@/tests/_support/render";

/* useMoney binds the money functions to the UI language; MoneyText shows one amount
   (specs/platform/currency.md, flows MON-7, MON-7E and MON-8). */

const order = { totalVnd: 700_000, totalUsd: 26.92 };
const price = { vnd: 350_000, usd: 13.46 };

let money: ReturnType<typeof useMoney>;
function Probe() {
  money = useMoney();
  return null;
}

describe("MON-7 useMoney follows the UI language", () => {
  it("in Vietnamese: VND everywhere", async () => {
    await renderApp(<Probe />, { locale: "vi" });

    expect(money.locale).toBe("vi");
    expect(money.currency).toBe("VND");
    expect(money.format(price)).toBe("350.000 VNĐ");
    expect(money.fmt(order, "total")).toBe("700.000 VNĐ");
    expect(money.value(price)).toBe(350_000);
  });

  it("in English: USD everywhere", async () => {
    await renderApp(<Probe />, { locale: "en" });

    expect(money.locale).toBe("en");
    expect(money.currency).toBe("USD");
    expect(money.format(price)).toBe("$13.46");
    expect(money.fmt(order, "total")).toBe("$26.92");
    expect(money.value(price)).toBe(13.46);
  });

  it("keeps the same object between renders while the language does not change", async () => {
    const { rerender } = await renderApp(<Probe />);
    const first = money;

    rerender(<Probe />);

    expect(money).toBe(first);
  });

  it("fmtOrNull formats a pair that exists", async () => {
    await renderApp(<Probe />, { locale: "vi" });

    expect(money.fmtOrNull({ originalPriceVnd: 500_000, originalPriceUsd: 19.2 }, "originalPrice")).toBe("500.000 VNĐ");
  });
});

describe("MON-7E null pairs and VND-only figures", () => {
  it.each(["vi", "en"] as const)("fmtOrNull gives null for a null pair (%s)", async (locale) => {
    await renderApp(<Probe />, { locale });

    expect(money.fmtOrNull({ originalPriceVnd: null, originalPriceUsd: null }, "originalPrice")).toBeNull();
  });

  it("vnd is always VND, even in English: it is for figures the BE gives in VND alone", async () => {
    await renderApp(<Probe />, { locale: "en" });

    expect(money.vnd(1_250_000)).toBe("1.250.000 VNĐ");
  });
});

describe("MON-8 MoneyText", () => {
  it("shows the amount in the language of the UI", async () => {
    await renderApp(<MoneyText money={price} />, { locale: "vi" });

    expect(screen.getByText("350.000 VNĐ")).toBeInTheDocument();
  });

  it("shows USD in English", async () => {
    await renderApp(<MoneyText money={price} />, { locale: "en" });

    expect(screen.getByText("$13.46")).toBeInTheDocument();
  });

  it("never breaks the amount across lines, and takes extra classes", async () => {
    await renderApp(<MoneyText money={price} amountClassName="text-lg" className="ml-2" />);

    const span = screen.getByText("350.000 VNĐ");
    expect(span.tagName).toBe("SPAN");
    expect(span).toHaveClass("whitespace-nowrap", "text-lg", "ml-2");
    expect(span).not.toHaveClass("font-semibold");
  });

  it("is semibold by default", async () => {
    await renderApp(<MoneyText money={price} />);

    expect(screen.getByText("350.000 VNĐ")).toHaveClass("font-semibold");
  });
});
