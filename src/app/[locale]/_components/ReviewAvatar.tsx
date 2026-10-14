"use client";

import { toMediaUrl } from "@/src/lib/media-url";

/** Round avatar from the review's snapshot; the BE sends an empty string when the author had no picture. */
export default function ReviewAvatar({ avatar, author, size = 40 }: { avatar: string; author: string; size?: number }) {
  const initial = author.trim().charAt(0).toUpperCase();
  const isUrl = /^(https?:)?\/\//.test(avatar) || avatar.startsWith("/");
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--bg-elevated)] font-primary text-sm font-medium text-[var(--text-heading)]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {isUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- third-party avatar (Google) that next/image would have to whitelist
        <img src={toMediaUrl(avatar)} alt="" referrerPolicy="no-referrer" loading="lazy" className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
