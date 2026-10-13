/** Company inbox shown to customers (About page CTA, legal texts, custom-order contact page). */
export const CONTACT_EMAIL = "contact@doovan.vn";

/** Hotline as customers read it, and the same number in international form (structured data, `tel:` links). */
export const CONTACT_PHONE = "0946 841 344";
export const CONTACT_PHONE_E164 = "+84946841344";

/** Business address: the one-line form shown in the legal texts, and its parts for structured data. */
export const CONTACT_ADDRESS = "313 Nguyễn Duy, Phường Chánh Hưng, TP. Hồ Chí Minh, Việt Nam";
export const CONTACT_ADDRESS_PARTS = {
  streetAddress: "313 Nguyễn Duy",
  addressLocality: "Phường Chánh Hưng",
  addressRegion: "TP. Hồ Chí Minh",
  addressCountry: "VN",
} as const;

/** Public "Share" link of the DOOVAN Google Business Profile; `NEXT_PUBLIC_GOOGLE_BUSINESS_URL` overrides it. */
export const GOOGLE_BUSINESS_URL = "https://share.google/IW85rWWlr0HKopGIX";

/** Where every "address" link goes (opens the Maps app on phones): the business profile. */
export const CONTACT_MAPS_URL = GOOGLE_BUSINESS_URL;

/** `mailto:` link with an optional subject and body. */
export function buildMailto(subject?: string, body?: string): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString().replace(/\+/g, "%20");
  return `mailto:${CONTACT_EMAIL}${query ? `?${query}` : ""}`;
}
