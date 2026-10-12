---
trigger: always_on
---

# Module docs — a closed loop: docs → feature → docs

`docs/` is the as-built reference of the FE: **one file per module**, describing what the code does today. It is also the **starting point and the finish line of every task**. No module work starts without reading its doc, and no module work is finished until its doc is updated and the gate passes.

```
read doc ──► understand module ──► change code ──► update doc ──► yarn docs:check --changed ──► done
   ▲                                                                                              │
   └──────────────────────── the next task starts from the updated doc ◄─────────────────────────┘
```

## The loop (mandatory, in this order)

1. **Locate** — find the owner of every file you will touch: `yarn docs:who <file|folder|module>` (e.g. `yarn docs:who src/hooks/use-api.ts`, `yarn docs:who cart`). Several modules → several docs. A file with no owner is a new module (step 7).
2. **Read the doc, then the code** — read the owning doc(s) fully, then the module's code (`page`, `*Content`, `_common/*`, `_components/*`, the hooks/lib it calls). Check that the doc matches the code. If it does not, the code wins: fix the doc first, then continue. Also read the docs of modules you depend on or feed (the links at the end of each doc).
3. **Say what you understood** — before editing, state in one or two sentences what the module does and which parts your change touches. If you cannot, you have not understood it yet: keep reading.
4. **Change the code** — follow the other rules (`coding.md`, `components.md`, `design-system.md`, the `i18n` / `list-pages` / `errors-and-toasts` skills).
5. **Update the doc in the same change** — edit every section the change affects (sections 1–4), rewrite sentences instead of appending notes, bump `Cập nhật` to today.
6. **Gate** — run `yarn docs:check --changed` (alias: `node scripts/check-docs.mjs --changed`). It fails if a module's code changed and its doc did not, if the `Cập nhật` date was not bumped, if a code file has no owner, or if a doc is malformed. Also run the usual checks (`npx tsc --noEmit`, `yarn i18n:check`, `yarn conventions:check`). Fix everything it reports.
7. **New / removed / renamed module** — add or edit its entry in `MODULES` (`scripts/check-docs.mjs`), create / delete / move `docs/<group>/<module>.md`, and add / fix its row in `docs/README.md`, and every link to it.
8. **Report** — the final message lists the docs you read and the docs you updated. Never say a task is done while the gate fails or a touched module's doc is stale.

Skipping a step is not allowed because "the change is small": a one-line behaviour change still needs the doc line. The only exemptions are changes with **no behaviour or contract change** (formatting, renaming a local variable, comment edits, dependency bumps) — and even then `docs:check --changed` is the judge: if it flags the module, update the doc.

## What goes in `docs/`, what never does

| Yes | No |
|---|---|
| What the code does today: routes, files, data, API calls, state, permissions, i18n namespaces, behaviour, limits, constants | Plans, roadmaps, TODOs, proposals, "should / will", FE/BE standardisation notes, progress trackers, meeting or decision logs, migration guides, API wishes for the BE |
| Facts the reader would trip over ("`ShareButtons` exists but no page imports it") | Recommendations to change it — those go in the PR, an issue or `.claude/plans/` |

## Shape

- Path: `docs/platform/` (shared infrastructure), `docs/admin/` (`/admin/*`), `docs/storefront/` (customer pages). File name = module slug in kebab-case. One module = one file; never merge modules or split one across files. Nothing but module docs and `README.md` may live in `docs/` (the gate fails on strays).
- Four fixed sections, in this order: **1. Tóm tắt module · 2. Phục vụ gì / việc cần làm · 3. Submodule & chức năng hiện có · 4. Chi tiết**, under a header with group, route, last-updated date, code paths and i18n namespaces.
- Written in Vietnamese; identifiers, file paths, routes, keys and API paths stay exactly as in the code. Facts come from reading the code, never from memory or older text. Reference files by path instead of pasting long code. Link other modules with relative links (`../platform/auth.md`).

Template, per-module-type checklists and the verification list: `.agent/skills/07-module-docs.md` (skill `module-docs`).
