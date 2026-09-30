"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      style={{ minHeight: "100vh", background: "var(--bg-primary)" }}
      className="flex flex-col items-center justify-center py-20 px-4 text-center gap-4"
    >
      <TriangleAlert size={48} className="text-[var(--text-disabled)]" />
      <h1 className="font-display font-normal text-2xl text-[var(--text-heading)] tracking-[-0.04em]">
        Something Went Wrong
      </h1>
      <p className="font-primary text-[15px] text-[var(--text-muted)] tracking-[-0.02em] max-w-96 leading-[150%]">
        We couldn&apos;t load this page right now. Please try again in a moment.
      </p>
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 py-2.5 px-5 rounded-full bg-[var(--color-obsidian)] text-[var(--color-pearl-cream)] font-primary text-xs tracking-[0.08em] uppercase font-medium border-none cursor-pointer"
        >
          <RefreshCw size={14} />
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 py-2.5 px-5 rounded-full border border-[var(--border-light)] font-primary text-xs text-[var(--text-accent)] tracking-[0.08em] uppercase no-underline font-medium"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
