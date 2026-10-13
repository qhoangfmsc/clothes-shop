"use client";

import type { ReactNode } from "react";

export interface OptionRow<V extends string> {
  value: V;
  icon: ReactNode;
  title: string;
  /** Muted detail next to the title (delivery time) */
  meta?: string;
  /** Right-aligned detail, e.g. the fee */
  trailing?: ReactNode;
}

interface OptionListProps<V extends string> {
  name: string;
  value: V;
  options: readonly OptionRow<V>[];
  onChange: (value: V) => void;
}

/** A short list of choices, one per row, all visible at once; every row has its own border, the chosen one is outlined */
export default function OptionList<V extends string>({ name, value, options, onChange }: OptionListProps<V>) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={`flex items-center gap-3 min-h-12 py-2.5 px-3.5 rounded-md border cursor-pointer transition-colors duration-150 motion-reduce:transition-none has-[:focus-visible]:shadow-[0_0_0_3px_rgba(201,169,110,0.25)] ${
              selected
                ? "border-[var(--accent-primary)] bg-[var(--color-champagne-cream)]"
                : "border-[var(--border-light)] bg-[var(--bg-primary)] hover:border-[var(--text-disabled)]"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
                selected ? "border-[var(--accent-primary)]" : "border-[var(--border-light)]"
              }`}
            >
              {selected && <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />}
            </span>
            <span className="shrink-0 text-[var(--text-accent)]">{option.icon}</span>
            <span className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
              <span className="font-primary text-sm text-[var(--text-heading)] font-medium tracking-[-0.02em]">
                {option.title}
              </span>
              {option.meta && (
                <span className="font-primary text-xs text-[var(--text-muted)] tracking-[-0.02em]">{option.meta}</span>
              )}
            </span>
            {option.trailing && <span className="shrink-0">{option.trailing}</span>}
          </label>
        );
      })}
    </div>
  );
}
