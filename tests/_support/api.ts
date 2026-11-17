/** Base URL of the API in unit / component tests (set as `NEXT_PUBLIC_API_URL` in `vitest.config.ts`). */
export const API = "http://api.test";

/** Token keys as the app stores them in `localStorage`. */
export const ACCESS_KEY = "clothes_shop_access_token";
export const REFRESH_KEY = "clothes_shop_refresh_token";

export function seedSession(tokens: { access?: string; refresh?: string }) {
  if (tokens.access) localStorage.setItem(ACCESS_KEY, tokens.access);
  if (tokens.refresh) localStorage.setItem(REFRESH_KEY, tokens.refresh);
}
