"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { useToast } from "./Toast";

interface CopyButtonProps {
  /** Text put on the clipboard */
  value: string;
  /** What is being copied — only used for the accessible name ("Copy <label>") */
  label: string;
}

/** Small copy icon: clipboard + toast + a tick for 1.5 s. The visible box is 28px, the tap area about 44px. */
export default function CopyButton({ value, label }: CopyButtonProps) {
  const t = useTranslations("shared.feedback.copy");
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetRef.current) clearTimeout(resetRef.current);
    },
    []
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("copied"));
      setCopied(true);
      if (resetRef.current) clearTimeout(resetRef.current);
      resetRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t("failed"));
    }
  }, [value, toast, t]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={t("aria", { field: label })}
      title={t("aria", { field: label })}
      className="relative shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-full border-none bg-transparent text-[var(--text-muted)] cursor-pointer transition-colors duration-150 hover:bg-[var(--color-champagne-cream)] hover:text-[var(--text-accent)] motion-reduce:transition-none after:absolute after:-inset-2 after:content-['']"
    >
      {copied ? <Check size={14} className="text-[var(--accent-sage)]" /> : <Copy size={14} />}
    </button>
  );
}
