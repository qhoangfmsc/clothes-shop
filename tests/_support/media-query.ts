/* jsdom has no `window.matchMedia`, and logs an error when the page calls `window.scrollTo`. This stand-in matches nothing unless the test says otherwise, e.g.
   `media.matching = (query) => query.includes("640")` for a screen at least 640px wide. `setup.ts` installs it and resets it after each test. */

export const media = {
  matching: (_query: string) => false,
  reset() {
    media.matching = () => false;
  },
};

export function installMatchMedia() {
  window.scrollTo = (() => {}) as typeof window.scrollTo;
  window.matchMedia = (query: string) =>
    ({
      matches: media.matching(query),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
