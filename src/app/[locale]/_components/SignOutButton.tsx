"use client";

import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { useAuth } from "@/src/contexts/auth-context";
import { useConfirm } from "./ConfirmDialog";

interface SignOutButtonProps {
  /** "profile" = round icon button that grows into a text button on lg (account page), "drawer" = quiet row in the dark burger menu */
  variant: "profile" | "drawer";
  /** Called only after the user confirmed and the session was cleared (e.g. to close the drawer) */
  onSignedOut?: () => void;
}

const PROFILE_CLASS =
  "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-transparent font-primary text-sm font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] transition-colors duration-150 hover:border-[var(--border-default)] hover:bg-[var(--color-champagne-cream)] hover:text-[var(--text-primary)] motion-reduce:transition-none lg:h-auto lg:w-full lg:px-6 lg:py-3";

/** The one sign-out control of the storefront: asks for confirmation first so a mis-tap doesn't end the session. */
export default function SignOutButton({ variant, onSignedOut }: SignOutButtonProps) {
  const t = useTranslations("shared.header.account");
  const confirm = useConfirm();
  const { logout } = useAuth();

  const handleClick = async () => {
    const ok = await confirm({
      title: t("signOutConfirm.title"),
      message: t("signOutConfirm.message"),
      confirmLabel: t("signOutConfirm.confirm"),
      danger: true,
    });
    if (!ok) return;
    logout();
    onSignedOut?.();
  };

  if (variant === "profile") {
    return (
      <button type="button" onClick={handleClick} aria-label={t("signOut")} className={PROFILE_CLASS}>
        <LogOut size={16} />
        <span className="hidden lg:inline">{t("signOut")}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="drawer-category-link"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.875rem 0",
        background: "none",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
      }}
    >
      <LogOut size={16} style={{ color: "rgba(255, 255, 255, 0.3)", flexShrink: 0 }} />
      <span
        className="drawer-category-label"
        style={{
          color: "rgba(255, 255, 255, 0.4)",
          fontSize: "var(--text-sm)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontFamily: "var(--font-primary)",
          fontWeight: 500,
          transition: `color var(--duration-fast) var(--ease-default)`,
        }}
      >
        {t("signOut")}
      </span>
    </button>
  );
}
