import { MESSAGE_FILES } from "./registry";
import { routing, type AppLocale } from "./routing";

/* ── Types: "admin/products" → { admin: { products: <shape of en/admin/products.json> } } ── */
type Files = {
  [K in keyof typeof MESSAGE_FILES]: Awaited<ReturnType<(typeof MESSAGE_FILES)[K]>>["default"];
};
type Nest<K extends string, V> = K extends `${infer Head}/${infer Rest}`
  ? { [P in Head]: Nest<Rest, V> }
  : { [P in K]: V };
type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (
  arg: infer I
) => void
  ? I
  : never;

export type Messages = UnionToIntersection<
  { [K in keyof Files & string]: Nest<K, Files[K]> }[keyof Files & string]
>;

/** Top-level groups of the message tree. A layout sends only the groups its pages use to the client. */
export type MessageScope = keyof Messages;

function setDeep(target: Record<string, unknown>, path: string[], value: unknown) {
  const [head, ...rest] = path;
  if (rest.length === 0) {
    target[head] = value;
    return;
  }
  const child = (target[head] ??= {}) as Record<string, unknown>;
  setDeep(child, rest, value);
}

/** Loads and assembles every message file of one locale into a single nested object. */
export async function loadMessages(locale: AppLocale): Promise<Messages> {
  const entries = Object.entries(MESSAGE_FILES) as [
    string,
    (l: AppLocale) => Promise<{ default: unknown }>,
  ][];
  const messages: Record<string, unknown> = {};
  const loaded = await Promise.all(entries.map(([, loader]) => loader(locale)));
  entries.forEach(([file], i) => setDeep(messages, file.split("/"), loaded[i].default));
  return messages as Messages;
}

/** Keeps only the given top-level groups (e.g. `common`, `admin`) for the client provider. */
export function pickMessages(messages: Messages, scopes: MessageScope[]): Partial<Messages> {
  return Object.fromEntries(scopes.map((scope) => [scope, messages[scope]])) as Partial<Messages>;
}
