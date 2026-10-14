"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { RETURN_PROGRESS_STEPS, type ReturnStatus } from "../_common/types";

/** The four stages of a return as a bar: done ones filled, the current one outlined. Rejected / cancelled requests have no bar. */
export default function ReturnProgress({ status }: { status: ReturnStatus }) {
  const t = useTranslations("private.returns.status");
  const current = RETURN_PROGRESS_STEPS.indexOf(status as (typeof RETURN_PROGRESS_STEPS)[number]);
  if (current < 0) return null;

  return (
    <ol className="m-0 p-0 list-none grid grid-cols-4 gap-1" aria-label={t("progress")}>
      {RETURN_PROGRESS_STEPS.map((step, index) => {
        const done = index < current || status === "REFUNDED";
        const active = index === current && status !== "REFUNDED";
        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className="flex flex-col items-center gap-1.5 text-center min-w-0"
          >
            <span className="flex items-center w-full">
              <span className={`h-0.5 flex-1 ${index === 0 ? "bg-transparent" : done || active ? "bg-[var(--accent-primary)]" : "bg-[var(--border-light)]"}`} />
              <span
                className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  done
                    ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--text-on-gold)]"
                    : active
                      ? "border-[var(--accent-primary)] bg-[var(--bg-elevated)]"
                      : "border-[var(--border-light)] bg-[var(--bg-elevated)]"
                }`}
              >
                {done ? <Check size={12} /> : active ? <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" /> : null}
              </span>
              <span className={`h-0.5 flex-1 ${index === RETURN_PROGRESS_STEPS.length - 1 ? "bg-transparent" : done ? "bg-[var(--accent-primary)]" : "bg-[var(--border-light)]"}`} />
            </span>
            <span
              className={`font-primary text-[11px] leading-[130%] tracking-[-0.02em] ${
                done || active ? "text-[var(--text-heading)] font-medium" : "text-[var(--text-muted)]"
              }`}
            >
              {t(step)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
