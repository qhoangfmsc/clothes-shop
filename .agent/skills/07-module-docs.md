# 07 — Module docs workflow (docs → feature → docs)

Every task that touches a module is one closed loop: **read the module's doc → understand the module → change the code → update the doc → pass the gate.** The binding rule is `.agent/rules/module-docs.md`; this skill is the how-to. `docs/` holds one **as-built** doc per module and nothing else (no plans, no standards).

## 0. The tools

| Command | Use |
|---|---|
| `yarn docs:who <file\|folder\|module>` | Which module / doc owns it, and everything that module owns. Run it first, for every area you will touch. |
| `yarn docs:check` | Structure + coverage: every code file has an owner, every module has a well-formed doc and a README row, links and referenced files exist, no planning words. Runs in `yarn build`. |
| `yarn docs:check --changed` | All of the above **plus**: every module whose code changed (vs `HEAD`, or `--base=<ref>`, including untracked files) must have its doc edited, with a new `Cập nhật` date. This is the finish line. |

The ownership map is `MODULES` in `scripts/check-docs.mjs` (longest matching path wins). Translations (`src/messages/**`) and generated files are deliberately unowned: the module doc names its i18n namespaces.

## 1. Phase A — Read (before the first edit)

1. `yarn docs:who …` for the files/folders/modules the task names. Include modules you only read from or feed (shared components, hooks, slices, the pages that consume your change).
2. Read each owning doc **in full**, including its "hiện trạng" notes and the links at the end.
3. Read the module's code: `page.tsx` / `layout.tsx`, `<Module>Content.tsx`, `_common/{moduleSlice,types,constants}.ts`, `_components/*`, the hooks and `lib` files it calls, and its message file(s) under `src/messages/en/**`.
4. Compare doc vs code. Where they differ, the code is right: correct the doc **before** continuing, so the loop starts from truth. Do not trust a doc you have not checked against the code you will edit.
5. Write down (in your reply) what the module does and which part your change touches. Not being able to is the signal to keep reading.

A module with code but no doc cannot exist (`docs:check` fails). If you meet one, create its doc first (section 3) and then do the task.

## 2. Phase B — Change

Implement with the usual rules and skills (`coding.md`, `components.md`, `design-system.md`, `i18n`, `list-pages`, `errors-and-toasts`). While you work, keep a list of every fact that changes: routes, files, fields/columns/filters/sort options, API calls (method + path + params), state/slice fields, types, permissions, i18n namespaces/keys, constants and limits, behaviours, removed features.

## 3. Phase C — Write the doc

**Updating a module** — for each module on your list:

1. Open its doc and edit every section the change touches (1 summary, 2 purpose, 3 feature table, 4 details). Rewrite the sentence instead of appending "(updated)" notes; delete what no longer exists.
2. Bump `Cập nhật` to today's date. If the route or one-line description changed, fix the `docs/README.md` row.
3. `grep -rn "<renamed or removed thing>" docs/` and fix statements and links in other docs that are now false.

**Creating a module** (new route folder, new platform concern):

1. Add an entry to `MODULES` in `scripts/check-docs.mjs` (doc slug + the paths it owns).
2. Create `docs/<platform|admin|storefront>/<slug>.md` from the template below, filled from the code you wrote/read.
3. Add a row to `docs/README.md` (module, route, link).

**Deleting / renaming a module** — delete / move the doc, update `MODULES` and the README row, fix every link to it.

### Template

```markdown
# <Module name> (<short Vietnamese description>)

> **Nhóm:** Admin | Storefront (public|private) | Platform · **Route:** `/[locale]/…` · **Cập nhật:** YYYY-MM-DD
> **Code:** `<folder>/` — `<main files>` · <other files it owns or calls>
> **i18n:** `<namespace>` · **Redux slice:** `state.<name>` (if any)

## 1. Tóm tắt module
What it is, in 2–4 sentences.

## 2. Phục vụ gì / việc cần làm
Who uses it and the job it does (the purpose, not a to-do list).

## 3. Submodule & chức năng hiện có
| Submodule / chức năng | Mô tả |
|---|---|

## 4. Chi tiết
Sub-sections `4.1 …` as needed (see the checklists). Facts only.
```

### What goes into section 4

**Admin CRUD module**: table columns · filters · sort options (constant name + values) · page size / reorder · form tabs and fields (required, defaults, derived values like slugs) · validation and error toasts · every API call (method + path + params) and the thunk/hook that makes it · slice state · types (entity + form + list params) · permissions gating each action · confirm dialogs · i18n namespaces · modules it feeds or reads.

**Storefront page**: routes and dynamic params · server fetches (function, endpoint, revalidate) · `generateStaticParams` / metadata / JSON-LD · client state and derived data · every user action and what it dispatches or calls · auth gating (`requireAuth`, `UnauthenticatedState`) · responsive behaviour that changes structure, per device class (phone / tablet / iPad landscape / desktop / wide) and per input (touch / mouse) · analytics events · i18n namespaces · what the page does **not** do when that is easy to assume.

**Platform module**: public API (exports, props, hooks) · behaviour rules and defaults · storage keys, env vars, endpoints · who depends on it · constants other modules must match (codes, enums).

End with a short **hiện trạng** list when the code holds facts a reader would trip over (unused exports, local-only behaviour, hardcoded text). State them as facts; no recommendations, no plans.

### Style

Vietnamese, present tense, short sentences, tables for enumerations. Code identifiers, file paths, routes, endpoints and message keys verbatim in backticks. Exact numbers (limits, timeouts, TTLs, thresholds). Reference files by path rather than pasting code.

## 4. Phase D — Gate (the task is not done before this passes)

```bash
yarn docs:check --changed      # docs ↔ code
yarn conventions:check         # shared building blocks
yarn i18n:check                # translations
npx tsc --noEmit               # types
```

Fix every line the docs gate prints — it names the doc, the file that triggered it and the reason. Then re-read the diff of your doc once: every statement must be true of the final code (paths exist, constants and endpoints match).

## 5. Phase E — Report

The last message of the task lists: docs read, docs updated or created (paths), and the gate result. If the gate could not be run, say so explicitly — do not call the task done.

## 6. Why the loop is closed

The doc you update in phase C is the doc the next person (or the next AI session) reads in phase A. A stale doc breaks the next task, so a task that changes behaviour without changing its doc is an unfinished task, however well the code works.
