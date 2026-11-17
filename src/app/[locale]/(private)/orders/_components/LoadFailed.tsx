import { TriangleAlert } from "lucide-react";

interface LoadFailedProps {
  title: string;
  retryLabel: string;
  onRetry: () => void;
}

/** What a page shows when its data could not be loaded, instead of an empty or "not found" screen. */
export default function LoadFailed({ title, retryLabel, onRetry }: LoadFailedProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 py-16 px-6 text-center bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)]"
    >
      <TriangleAlert size={40} style={{ color: "var(--text-disabled)" }} />
      <p className="m-0 max-w-[23.75rem] font-primary text-sm text-[var(--text-muted)] tracking-[-0.02em] leading-[150%]">
        {title}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center min-h-11 py-3 px-6 rounded-full border border-[var(--border-light)] bg-transparent cursor-pointer font-primary text-xs text-[var(--text-accent)] tracking-[0.08em] uppercase font-medium hover:bg-[var(--color-champagne-cream)]"
      >
        {retryLabel}
      </button>
    </div>
  );
}
