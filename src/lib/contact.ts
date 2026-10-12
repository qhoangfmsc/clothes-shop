/** Company inbox shown to customers (About page CTA, legal texts, custom-order contact page). */
export const CONTACT_EMAIL = "contact@doovan.vn";

/** `mailto:` link with an optional subject and body. */
export function buildMailto(subject?: string, body?: string): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString().replace(/\+/g, "%20");
  return `mailto:${CONTACT_EMAIL}${query ? `?${query}` : ""}`;
}
