"use client";

import { useEffect, useRef, type InputHTMLAttributes } from "react";
import { Check, Minus } from "lucide-react";

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "checked" | "onChange"> {
  checked: boolean;
  /** "Some selected" state for a select-all box; shows a dash and reports `mixed` to assistive tech. */
  indeterminate?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** Themed checkbox. The real input stays in the DOM (keyboard, label clicks and screen readers
 *  work natively); it is stretched invisibly over the box, which also enlarges the touch target.
 *  Name it with a wrapping `<label>` or an `aria-label`. */
export default function Checkbox({
  checked,
  indeterminate = false,
  onCheckedChange,
  className = "",
  ...inputProps
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  /* `indeterminate` is a DOM property only — there is no HTML attribute for it */
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const filled = checked || indeterminate;

  return (
    <span className={`relative inline-flex h-[1.125rem] w-[1.125rem] shrink-0 ${className}`}>
      <input
        {...inputProps}
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="peer absolute -inset-2 z-10 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span
        aria-hidden="true"
        className={`flex h-full w-full items-center justify-center rounded-[0.3125rem] border transition-colors duration-150 motion-reduce:transition-none peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent-primary)] peer-focus-visible:ring-offset-2 peer-disabled:opacity-50 ${
          filled
            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-on-gold)]"
            : "border-[var(--border-default)] bg-[var(--color-white)] text-transparent"
        }`}
      >
        {indeterminate ? <Minus size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}
      </span>
    </span>
  );
}
