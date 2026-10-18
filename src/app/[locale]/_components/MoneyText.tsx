"use client";

import { useMoney } from "@/src/hooks/use-money";
import type { Money } from "@/src/lib/money";

interface MoneyTextProps {
  money: Money;
  /** Size / weight of the amount */
  amountClassName?: string;
  className?: string;
}

/** One amount in the currency of the UI language (VND for `vi`, USD otherwise), straight from the response. */
export default function MoneyText({ money, amountClassName = "font-semibold", className = "" }: MoneyTextProps) {
  const { format } = useMoney();
  return <span className={`whitespace-nowrap ${amountClassName} ${className}`}>{format(money)}</span>;
}
