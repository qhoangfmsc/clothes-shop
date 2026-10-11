/** About page structure. All visible copy lives in messages/<locale>/public/about.json. */

export const STORY_PARAGRAPH_KEYS = ["first", "second", "third"] as const;

export const SERVICES = [
  { key: "curated", icon: "✦" },
  { key: "custom", icon: "◈" },
  { key: "styling", icon: "❋" },
] as const;
