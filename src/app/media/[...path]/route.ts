/** Same-origin proxy for Supabase Storage objects: `/media/<key>` streams
 *  `<MEDIA_STORAGE_ORIGIN>/<key>`. Unlike a `rewrites()` entry it sends only
 *  an allow-list of headers, so upstream ones (e.g. `sb-project-ref`) never
 *  reach the browser. */

const MEDIA_STORAGE_ORIGIN = process.env.MEDIA_STORAGE_ORIGIN?.replace(/\/+$/, "");

const FORWARDED_HEADERS = ["content-type", "content-length", "etag", "last-modified"];

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!MEDIA_STORAGE_ORIGIN) {
    return new Response("Media storage is not configured", { status: 503 });
  }

  const { path } = await params;
  // Next already decodes segments; reject anything that could climb out of the bucket path.
  if (path.some((segment) => segment === "." || segment === ".." || segment.includes("/"))) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = await fetch(`${MEDIA_STORAGE_ORIGIN}/${path.map(encodeURIComponent).join("/")}`, {
    headers: { ...(request.headers.get("range") && { range: request.headers.get("range")! }) },
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response("Not found", { status: upstream.status === 404 || upstream.status === 400 ? 404 : 502 });
  }

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("cache-control", "public, max-age=259200");

  return new Response(upstream.body, { status: upstream.status, headers });
}
