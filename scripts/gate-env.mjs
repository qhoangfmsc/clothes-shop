/* Project root, module map and file ownership shared by every gate. `GATE_ROOT` and `GATE_MODULES` aim them at another project (tests). */
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/* Under a test runner `import.meta.url` is not always a file URL: fall back to the working directory (the repository root). */
function repositoryRoot() {
  try {
    return join(fileURLToPath(new URL(".", import.meta.url)), "..");
  } catch {
    return process.cwd();
  }
}

export const ROOT = process.env.GATE_ROOT ?? repositoryRoot();

const modulesUrl = process.env.GATE_MODULES ? pathToFileURL(process.env.GATE_MODULES).href : pathToFileURL(join(ROOT, "scripts/modules.mjs")).href;
export const { MODULES, IGNORED, CODE_ROOTS, CODE_FILES, CODE_EXT } = await import(modulesUrl);

const owners = MODULES.flatMap((m) => m.paths.map((p) => ({ prefix: p, doc: m.doc })));

/** The doc slug that owns `file` (posix path from the root), or null. A path ending in "/" owns the folder; the longest match wins. */
export function ownerOf(file) {
  let best = null;
  for (const o of owners) {
    const hit = o.prefix.endsWith("/") ? file.startsWith(o.prefix) : file === o.prefix;
    if (hit && (!best || o.prefix.length > best.prefix.length)) best = o;
  }
  return best?.doc ?? null;
}
