/** Legal documents shared by the storefront: the reading pages, footer, menu, login and checkout links. */
export const LEGAL_DOCS = [
  { key: "terms", path: "/terms" },
  { key: "privacy", path: "/privacy" },
  { key: "shippingReturns", path: "/shipping-returns" },
] as const;

export type LegalDocKey = (typeof LEGAL_DOCS)[number]["key"];

/** Overview page that lists every document; kept out of search results because it repeats them. */
export const LEGAL_HUB_PATH = "/legal";

/** Bump together with the message text whenever a document changes (ISO date). */
export const LEGAL_LAST_UPDATED = "2026-10-11";

/** Business details injected into the legal texts as `{company}`, `{email}`, `{phone}`, `{address}`.
 *  TODO: replace the placeholders with the real details before going live. */
export const LEGAL_CONTACT = {
  company: "DOOVAN",
  email: "[contact email]",
  phone: "[hotline]",
  address: "[business address]",
} as const;
