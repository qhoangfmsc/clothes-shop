"use client";

import Link from "next/link";
import { ShieldX, ArrowLeft, LogIn } from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";

export default function UnauthorizedContent() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <ShieldX size={40} style={{ color: "var(--accent-rose)" }} />
        </div>

        <h1 style={styles.heading}>Access Denied</h1>

        <p style={styles.message}>
          {isAuthenticated
            ? `Your account (${user?.email ?? "unknown"}) does not have permission to access this area.`
            : "You need to sign in to access this page."}
        </p>

        {isAuthenticated && user && (
          <div style={styles.roleInfo}>
            <span style={styles.roleLabel}>Your role:</span>
            <span
              style={{
                ...styles.roleBadge,
                ...(user.role === "admin"
                  ? { background: "rgba(201,169,110,0.15)", color: "var(--accent-primary)" }
                  : { background: "rgba(143,163,180,0.12)", color: "var(--accent-blue)" }),
              }}
            >
              {user.role}
            </span>
          </div>
        )}

        <div style={styles.actions}>
          {isAuthenticated ? (
            <Link href="/" style={styles.btnPrimary}>
              <ArrowLeft size={16} />
              <span>Back to Store</span>
            </Link>
          ) : (
            <Link href="/login" style={styles.btnPrimary}>
              <LogIn size={16} />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "var(--bg-primary)",
    padding: "var(--space-6)",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "var(--space-4)",
    maxWidth: 440,
    padding: "var(--space-12) var(--space-8)",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: "var(--radius-xl)",
    background: "rgba(212, 165, 165, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "var(--space-2)",
  },
  heading: {
    fontFamily: "var(--font-display)",
    fontSize: "var(--text-xl)",
    color: "var(--text-heading)",
    fontWeight: 400,
    margin: 0,
  },
  message: {
    fontSize: "var(--text-sm)",
    color: "var(--text-muted)",
    fontFamily: "var(--font-primary)",
    lineHeight: 1.6,
    margin: 0,
  },
  roleInfo: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    padding: "var(--space-2) var(--space-4)",
    background: "var(--bg-elevated)",
    borderRadius: "var(--radius-md)",
  },
  roleLabel: {
    fontSize: "var(--text-xs)",
    color: "var(--text-muted)",
    fontFamily: "var(--font-primary)",
  },
  roleBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "var(--radius-pill)",
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    fontFamily: "var(--font-primary)",
    textTransform: "capitalize" as const,
  },
  actions: {
    marginTop: "var(--space-4)",
    display: "flex",
    gap: "var(--space-3)",
  },
  btnPrimary: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 24px",
    background: "var(--accent-primary)",
    color: "var(--text-on-gold)",
    textDecoration: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--text-sm)",
    fontWeight: 600,
    fontFamily: "var(--font-primary)",
  },
};
