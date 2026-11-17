"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

export function UserAvatar({
  user,
  size = 32,
  onClick,
  className,
}: {
  user: { name: string | null; image: string | null };
  size?: number;
  onClick?: () => void;
  className?: string;
}) {
  const t = useTranslations("shared.header.account");
  const initials = user.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  /* A <button> only when it does something: the avatar is also shown inside other buttons / links
     (burger menu toggle) where a nested <button> would be invalid HTML. */
  const Root = onClick ? "button" : "span";
  const interactiveProps = onClick
    ? { onClick, className: `user-avatar-btn ${className ?? ""}`, "aria-label": t("userMenu") }
    : { className };

  return (
    <Root
      {...interactiveProps}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "1.5px solid var(--border-light)",
        background: "var(--color-champagne-cream)",
        cursor: onClick ? "pointer" : "default",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        flexShrink: 0,
        transition: `border-color var(--duration-fast) var(--ease-default), box-shadow var(--duration-fast) var(--ease-default)`,
        pointerEvents: "auto",
      }}
    >
      {user.image ? (
        <Image
          src={user.image}
          alt={user.name ?? t("userFallback")}
          width={size}
          height={size}
          unoptimized
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "50%",
          }}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          style={{
            fontSize: size * 0.38,
            fontFamily: "var(--font-primary)",
            fontWeight: 500,
            color: "var(--text-secondary)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {initials}
        </span>
      )}
    </Root>
  );
}
