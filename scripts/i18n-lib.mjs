/* Pure rules of `yarn i18n:check`: flatten a message file, read its placeholders, compare a locale to the source. */

/** Flatten nested JSON into { "a.b.c": "text" }. */
export function flatten(obj, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") flatten(value, path, out);
    else out[path] = value;
  }
  return out;
}

/** Top-level ICU argument names: {name}, {count, plural, ...} -> name, count. Nested branches are ignored. */
export function placeholders(text) {
  const names = new Set();
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (text[i] === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        names.add(text.slice(start, i).split(",")[0].trim());
        start = -1;
      }
    }
  }
  return [...names].sort().join(",");
}

/** Problems of one translated file against its source file (both nested JSON objects). */
export function compareLocale(file, locale, sourceJson, targetJson) {
  const errors = [];
  const source = flatten(sourceJson);
  const target = flatten(targetJson);
  for (const key of Object.keys(source)) {
    if (!(key in target)) errors.push(`[${locale}] ${file}.json missing key "${key}"`);
    else if (typeof target[key] !== "string" || target[key].trim() === "") errors.push(`[${locale}] ${file}.json empty value at "${key}"`);
    else if (placeholders(source[key]) !== placeholders(target[key])) {
      errors.push(`[${locale}] ${file}.json "${key}" placeholders differ: {${placeholders(source[key])}} vs {${placeholders(target[key])}}`);
    }
  }
  for (const key of Object.keys(target)) {
    if (!(key in source)) errors.push(`[${locale}] ${file}.json has unknown key "${key}"`);
  }
  return errors;
}
