"use client";

import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { getAccessToken } from "@/src/lib/auth-api";

/** <img> can't send an Authorization header, so we fetch the bytes
 *  ourselves and hand the browser a blob: URL instead. */
export function AuthedImage({
  src,
  alt,
  className,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked = "";
    setFailed(false);
    setObjectUrl(null);

    const token = getAccessToken();
    fetch(src, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load image");
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        revoked = url;
        setObjectUrl(url);
      })
      .catch(() => setFailed(true));

    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [src]);

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-[var(--bg-secondary)] ${className ?? ""}`}>
        <ImageOff size={20} className="text-[var(--text-disabled)]" />
      </div>
    );
  }

  if (!objectUrl) {
    return (
      <div className={`flex items-center justify-center bg-[var(--bg-secondary)] ${className ?? ""}`}>
        <Loader2 size={18} className="text-[var(--text-disabled)] animate-spin" />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={objectUrl} alt={alt} className={className} onClick={onClick} />;
}
