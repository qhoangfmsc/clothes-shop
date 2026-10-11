import { toMediaUrl } from "@/src/lib/media-url";
import type { MediaFile } from "@/src/hooks/use-admin-media";

/** Saves a media file under its original name. Goes through a blob so the
 *  `download` attribute is honoured even when the URL is cross-origin. */
export async function downloadMediaFile(file: Pick<MediaFile, "url" | "name">): Promise<void> {
  const res = await fetch(toMediaUrl(file.url));
  if (!res.ok) throw new Error("");

  const objectUrl = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
