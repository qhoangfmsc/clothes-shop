export type CursorVariant = "default" | "pointer" | "text";

interface CursorVariantConfig {
  /** Image in /public/cursor */
  src: string;
  /** Rendered width/height in px, slightly above the ~24px native arrow, kept at the artwork's own ratio. */
  width: number;
  height: number;
  /** Where the "active point" of the artwork sits, as a fraction of its own box (0 = left/top edge, 1 = right/bottom edge). */
  anchor: { x: number; y: number };
  /** Extra scale applied on top of the base size for this variant. */
  scale: number;
}

export const CURSOR_VARIANTS: Record<CursorVariant, CursorVariantConfig> = {
  default: {
    src: "/cursor/default.png",
    width: 32,
    height: 42,
    anchor: { x: 0.12, y: 0.05 },
    scale: 1,
  },
  pointer: {
    src: "/cursor/pointer.png",
    width: 33,
    height: 42,
    anchor: { x: 0.32, y: 0.04 },
    scale: 1.12,
  },
  text: {
    src: "/cursor/text.png",
    width: 14,
    height: 36,
    anchor: { x: 0.5, y: 0.5 },
    scale: 1,
  },
};

/** Elements under the pointer that should switch the cursor to the "pointer" (ready-to-click) look. */
export const POINTER_SELECTOR = [
  "a",
  "button",
  "label",
  "select",
  "summary",
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="radio"]',
  "input[type='button']",
  "input[type='submit']",
  "input[type='reset']",
  "input[type='checkbox']",
  "input[type='radio']",
  "[data-cursor='pointer']",
  "[onclick]",
].join(", ");

/** Elements under the pointer that should switch the cursor to the "text" (I-beam) look. */
export const TEXT_SELECTOR = [
  "input:not([type='button']):not([type='submit']):not([type='reset']):not([type='checkbox']):not([type='radio'])",
  "textarea",
  "[contenteditable='true']",
  "[data-cursor='text']",
].join(", ");

/** Elements that opt the cursor back to the native OS cursor entirely (e.g. embedded video/canvas controls). */
export const NATIVE_SELECTOR = "[data-cursor='native']";
