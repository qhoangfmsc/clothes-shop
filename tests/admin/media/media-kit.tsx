import { http, HttpResponse } from "msw";
import MediaContent from "@/src/app/[locale]/(admin)/admin/media/MediaContent";
import type { MediaFile } from "@/src/app/[locale]/(admin)/admin/media/_common/types";
import type { AuthUser } from "@/src/contexts/auth-context";
import { API } from "@/tests/_support/api";
import type { IdentityName } from "@/tests/_support/identities";
import { server } from "@/tests/_support/msw-server";
import { navigation } from "@/tests/_support/navigation";
import { renderApp } from "@/tests/_support/render";

/* Sample media files, the fake admin media API and the render function shared by the admin media tests. */

const STAMP = "2026-03-05T05:00:00.000Z";

export function mediaFile(over: Partial<MediaFile> = {}): MediaFile {
  return { id: "m-1", name: "photo.png", mimeType: "image/png", sizeOriginal: 2048, createdAt: STAMP, url: "https://x.supabase.co/storage/v1/object/public/media/photo.png", ...over };
}

type Refusal = { status: number; body: Record<string, unknown> };

export interface MediaApiOptions {
  pages?: { data: MediaFile[]; total: number }[];
  /** Refuse every list request from this call on (1 = from the first) */
  failListFrom?: number;
  /** The refusal the list answers with (default: a plain 500) */
  listRefusal?: Refusal;
  deny?: 401 | 403;
  /** Refuse an upload by the name of the file */
  refuseUpload?: Record<string, Refusal>;
  /** Refuse deleting a file by id */
  refuseDelete?: Record<string, Refusal>;
  ping?: Refusal;
  /** What the browser gets when it fetches an image to save it */
  download?: number;
  /** Hold the answer to a picture fetched for saving for this long (to see the busy state) */
  downloadDelayMs?: number;
  /** Hold the answer to an upload for this long (to see the busy state) */
  uploadDelayMs?: number;
}

export interface MediaCalls {
  lists: URLSearchParams[];
  uploads: { name: string; type: string; auth: string | null }[];
  deletes: string[];
  pings: number;
  downloads: string[];
}

export function mediaApi(options: MediaApiOptions = {}): MediaCalls {
  const calls: MediaCalls = { lists: [], uploads: [], deletes: [], pings: 0, downloads: [] };
  server.use(
    http.get(`${API}/api/admin/media/ping`, () => {
      calls.pings += 1;
      return options.ping ? HttpResponse.json(options.ping.body, { status: options.ping.status }) : HttpResponse.json({ data: { ok: true } });
    }),
    http.get(`${API}/api/admin/media`, ({ request }) => {
      const url = new URL(request.url);
      calls.lists.push(url.searchParams);
      if (options.deny) return HttpResponse.json({ message: "denied" }, { status: options.deny });
      if (options.failListFrom && calls.lists.length >= options.failListFrom) {
        const refusal = options.listRefusal ?? { status: 500, body: { message: "boom" } };
        return HttpResponse.json(refusal.body, { status: refusal.status });
      }
      const page = Number(url.searchParams.get("page") ?? 1);
      const answer = options.pages?.[page - 1] ?? { data: [], total: 0 };
      return HttpResponse.json({ ...answer, page, limit: Number(url.searchParams.get("limit") ?? 25) });
    }),
    http.post(`${API}/api/admin/media`, async ({ request }) => {
      const form = await request.formData();
      const file = form.get("file") as File;
      /* The file name does not survive the form in jsdom, so each test file carries its name as its content */
      const name = await file.text();
      calls.uploads.push({ name, type: file.type, auth: request.headers.get("authorization") });
      if (options.uploadDelayMs) await new Promise((resolve) => setTimeout(resolve, options.uploadDelayMs));
      const refusal = options.refuseUpload?.[name];
      if (refusal) return HttpResponse.json(refusal.body, { status: refusal.status });
      return HttpResponse.json({ data: { id: `up-${calls.uploads.length}`, name, mimeType: file.type, sizeOriginal: file.size, url: `https://x.supabase.co/storage/v1/object/public/media/${name}` } });
    }),
    http.delete(`${API}/api/admin/media/:id`, ({ params }) => {
      const id = String(params.id);
      calls.deletes.push(id);
      const refusal = options.refuseDelete?.[id];
      return refusal ? HttpResponse.json(refusal.body, { status: refusal.status }) : HttpResponse.json({ data: null });
    }),
    http.get(`${window.location.origin}/media/:key`, async ({ params }) => {
      calls.downloads.push(String(params.key));
      if (options.downloadDelayMs) await new Promise((resolve) => setTimeout(resolve, options.downloadDelayMs));
      if (options.download) return new HttpResponse("nope", { status: options.download });
      return new HttpResponse(new Blob(["bytes"], { type: "image/png" }));
    })
  );
  return calls;
}

export interface RenderMediaOptions extends MediaApiOptions {
  as?: IdentityName | AuthUser;
  locale?: "vi" | "en";
}

export async function renderMedia(options: RenderMediaOptions = {}) {
  const { as = "adminFull", locale, ...api } = options;
  navigation.pathname = "/admin/media";
  navigation.searchParams = new URLSearchParams();
  const calls = mediaApi(api);
  const view = await renderApp(<MediaContent />, { as, locale });
  return { calls, ...view };
}
