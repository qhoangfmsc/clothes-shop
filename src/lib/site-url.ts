/** Public origin of the site (no trailing slash), e.g. "https://doovan.vn".
 *  Set NEXT_PUBLIC_SITE_URL in the production environment; local dev falls back to localhost.
 *  Used wherever an absolute URL is required: metadataBase, sitemap, robots, structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
