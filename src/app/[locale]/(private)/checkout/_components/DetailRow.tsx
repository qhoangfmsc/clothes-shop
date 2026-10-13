"use client";

import CopyButton from "@/src/app/[locale]/_components/CopyButton";

interface DetailRowProps {
  label: string;
  value: string;
  /** Adds a small copy icon next to the value */
  copyable?: boolean;
}

/** One transfer detail: label on the left, value on the right (with an optional copy icon) */
export default function DetailRow({ label, value, copyable = false }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[var(--border-subtle)] last:border-b-0">
      <span className="shrink-0 font-primary text-xs text-[var(--text-muted)] tracking-[0.08em] uppercase font-medium">
        {label}
      </span>
      <div className="min-w-0 flex items-center justify-end gap-1.5">
        <span className="font-primary text-sm text-[var(--text-heading)] font-medium tracking-[-0.02em] text-right break-all">
          {value}
        </span>
        {copyable && <CopyButton value={value} label={label} />}
      </div>
    </div>
  );
}
