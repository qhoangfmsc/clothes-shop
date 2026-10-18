"use client";

import type { InputHTMLAttributes } from "react";
import { inputClass } from "./AdminFormKit";
import { maskVndInput } from "@/src/lib/money";

interface VndInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** The text in the box: digits grouped with dots (`350.000`). Parse it with `parseVndInput`. */
  value: string;
  onChange: (value: string) => void;
  /** Called when the typed or pasted text has a decimal part (`350000.5`, `350000,5`): the text is not taken, so a
   *  decimal is never silently read as a bigger whole number */
  onReject?: () => void;
}

/** `next` is `previous` with some characters removed */
function isDeletion(previous: string, next: string): boolean {
  let at = 0;
  for (const char of next) {
    at = previous.indexOf(char, at) + 1;
    if (at === 0) return false;
  }
  return true;
}

/** Whole-dong amount field for the admin. Typing keeps only digits and groups them with dots; letters are dropped and
 *  a decimal is refused (`onReject`), so neither can end up in the amount. The BE takes whole VND only (`...Vnd` fields). */
export default function VndInput({ value, onChange, onReject, className = inputClass, ...rest }: VndInputProps) {
  const handleChange = (raw: string) => {
    /* Thousand groups are always three digits, so a 1–2 digit tail after `.` or `,` (or any comma) is a decimal.
       Deleting characters can leave such a tail (`350.000` → `350.00`) and must still work: only added text is refused. */
    if (/,|[.]\d{1,2}$/.test(raw) && !isDeletion(value, raw)) {
      onReject?.();
      return;
    }
    onChange(maskVndInput(raw));
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      value={value}
      onChange={(e) => handleChange(e.target.value)}
    />
  );
}
