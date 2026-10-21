/// <reference types="vite/client" />
import type { Messages } from "@/src/i18n/messages";

/* Every real translation of both locales, loaded once, so tests read the same text the user sees.
   Same tree as `loadMessages` (src/i18n/messages.ts): `messages/vi/admin/orders.json` → `admin.orders`.
   `loadMessages` itself cannot run here: Vite does not resolve its multi-level dynamic `import()`. */

const files = import.meta.glob("../../src/messages/*/**/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

function setDeep(target: Record<string, unknown>, path: string[], value: unknown) {
  const [head, ...rest] = path;
  if (rest.length === 0) target[head] = value;
  else setDeep((target[head] ??= {}) as Record<string, unknown>, rest, value);
}

function assemble(locale: "vi" | "en"): Messages {
  const messages: Record<string, unknown> = {};
  const prefix = `../../src/messages/${locale}/`;
  for (const [file, content] of Object.entries(files)) {
    if (file.startsWith(prefix)) setDeep(messages, file.slice(prefix.length).replace(/\.json$/, "").split("/"), content);
  }
  return messages as Messages;
}

export const MESSAGES = { vi: assemble("vi"), en: assemble("en") };

/** The real text behind a message key, e.g. `msg("admin.components.guards.denied.title")`. Throws if the key is missing. */
export function msg(path: string, locale: "vi" | "en" = "vi"): string {
  let node: unknown = MESSAGES[locale];
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null || !(part in node)) throw new Error(`no message "${path}" in ${locale}`);
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node !== "string") throw new Error(`message "${path}" in ${locale} is not a text`);
  return node;
}
