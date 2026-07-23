"use client";

import Link from "next/link";
import { ShieldX, ArrowLeft, LogIn } from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";

export default function UnauthorizedContent() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)] p-6">
      <div className="flex flex-col items-center text-center gap-4 max-w-[440px] py-12 px-8 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg">
        <div className="w-20 h-20 rounded-xl bg-[rgba(212,165,165,0.1)] flex items-center justify-center mb-2">
          <ShieldX size={40} style={{ color: "var(--accent-rose)" }} />
        </div>

        <h1 className="font-display font-normal text-xl text-[var(--text-heading)] m-0">
          Access Denied
        </h1>

        <p className="font-primary text-sm text-[var(--text-muted)] leading-[1.6] m-0">
          {isAuthenticated
            ? `Your account (${user?.email ?? "unknown"}) does not have permission to access this area.`
            : "You need to sign in to access this page."}
        </p>

        {isAuthenticated && user && (
          <div className="flex items-center gap-2 py-2 px-4 bg-[var(--bg-elevated)] rounded-md">
            <span className="font-primary text-xs text-[var(--text-muted)]">
              Your role:
            </span>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold font-primary capitalize ${
                user.role === "admin"
                  ? "bg-[rgba(201,169,110,0.15)] text-[var(--accent-primary)]"
                  : "bg-[rgba(143,163,180,0.12)] text-[var(--accent-blue)]"
              }`}
            >
              {user.role}
            </span>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          {isAuthenticated ? (
            <Link
              href="/"
              className="flex items-center gap-2 py-2.5 px-6 bg-[var(--accent-primary)] text-[var(--text-on-gold)] no-underline rounded-md text-sm font-semibold font-primary"
            >
              <ArrowLeft size={16} />
              <span>Back to Store</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 py-2.5 px-6 bg-[var(--accent-primary)] text-[var(--text-on-gold)] no-underline rounded-md text-sm font-semibold font-primary"
            >
              <LogIn size={16} />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
