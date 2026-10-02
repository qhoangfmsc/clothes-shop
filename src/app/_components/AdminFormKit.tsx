"use client";

import { useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";

/* ═══════════════════════════════ Info hint ═══════════════════════════════
   Small "i" icon that reveals a short explanation on hover/focus, so forms
   stay simple to read without long inline captions under every field. */

export function InfoHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className="flex items-center justify-center w-3.5 h-3.5 border-0 bg-transparent p-0 text-[var(--text-disabled)] cursor-help"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => e.preventDefault()}
        aria-label={text}
      >
        <Info size={13} />
      </button>
      {open && (
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-max max-w-56 whitespace-normal rounded-md bg-[var(--text-heading)] px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-lg text-center z-20">
          {text}
        </span>
      )}
    </span>
  );
}

/* ═══════════════════════════════ Modal shell ══════════════════════════════ */

export function FormModalShell({
  title,
  onClose,
  maxWidthClass = "max-w-160",
  children,
}: {
  title: string;
  onClose: () => void;
  maxWidthClass?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 bg-[rgba(10,10,8,0.5)] flex items-center justify-center z-100 p-6"
      onClick={onClose}
    >
      <div
        className={`bg-[var(--bg-primary)] rounded-2xl w-full ${maxWidthClass} max-h-[85vh] overflow-auto shadow-xl flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center py-5 px-6 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--bg-primary)] z-1 shrink-0">
          <h2 className="font-display text-lg text-[var(--text-heading)] font-normal m-0">
            {title}
          </h2>
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-muted)] hover:opacity-70"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════ Tabs ══════════════════════════════════ */

export interface FormTab {
  id: string;
  label: string;
}

export function FormTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: FormTab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 px-6 border-b border-[var(--border-subtle)] shrink-0 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`py-2.5 px-3.5 -mb-px border-0 border-b-2 bg-transparent text-sm font-primary font-semibold cursor-pointer transition-colors whitespace-nowrap ${
            active === t.id
              ? "border-[var(--accent-primary)] text-[var(--text-heading)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════ Section / Field ═══════════════════════ */

export function FormSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <fieldset className="border-0 p-0 m-0 flex flex-col gap-4">
      {title && (
        <legend className="font-primary text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em] p-0 mb-1">
          {title}
        </legend>
      )}
      {children}
    </fieldset>
  );
}

export function FormField({
  label,
  info,
  required,
  children,
}: {
  label: string;
  info?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] font-primary">
        {label}
        {required && <span className="text-[var(--accent-rose)]"> *</span>}
        {info && <InfoHint text={info} />}
      </span>
      {children}
    </div>
  );
}

/* ═══════════════════════════════ Footer actions ════════════════════════ */

export function FormActions({
  onCancel,
  isSaving,
  submitLabel,
  savingLabel = "Saving...",
}: {
  onCancel: () => void;
  isSaving?: boolean;
  submitLabel: string;
  savingLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
      <button
        type="button"
        className="py-2 px-4 bg-[var(--bg-elevated)] border-0 rounded-sm text-sm font-primary text-[var(--text-secondary)] cursor-pointer"
        onClick={onCancel}
      >
        Cancel
      </button>
      <button
        type="submit"
        className="py-2 px-5 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-sm text-sm font-semibold font-primary cursor-pointer disabled:opacity-50"
        disabled={isSaving}
      >
        {isSaving ? savingLabel : submitLabel}
      </button>
    </div>
  );
}

export const inputClass =
  "py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full";
