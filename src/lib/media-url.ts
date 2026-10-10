/** Matches a Supabase Storage public object URL and captures the object key
 *  (the bucket segment is dropped — it is re-added server-side by the
 *  `/media/[...path]` route handler). */
const STORAGE_PUBLIC_URL = /^https?:\/\/[^/]+\/storage\/v1\/object\/public\/[^/]+\/(.+)$/;

/** Maps a Supabase Storage public URL to our own `/media/<key>` path so the
 *  project id and bucket never reach the DOM. Anything else (local assets,
 *  other CDNs, data/blob URLs) is returned untouched. Display-only: forms
 *  keep the original URL as their value. */
export function toMediaUrl<T extends string | null | undefined>(url: T): T {
  if (!url) return url;
  const match = STORAGE_PUBLIC_URL.exec(url);
  return (match ? `/media/${match[1]}` : url) as T;
}

/** Deep-maps every string in an API payload through `toMediaUrl`. Used on
 *  read-only (storefront / account) fetches so components receive `/media/...`
 *  paths; admin fetches skip this so forms keep editing the real URLs. */
export function mapMediaUrls<T>(data: T): T {
  if (typeof data === "string") return toMediaUrl(data);
  if (Array.isArray(data)) return data.map(mapMediaUrls) as T;
  if (data && typeof data === "object") {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, mapMediaUrls(value)])) as T;
  }
  return data;
}
