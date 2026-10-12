---
name: module-docs
description: The mandatory docs → feature → docs loop. Use at the START of any task that touches a module (read its doc first), at the END of it (update the doc, run the gate), and whenever you create, change, move or delete a module, or the user asks to document one. Covers docs/, `yarn docs:who`, `yarn docs:check --changed`.
---

# module-docs skill (clothes-shop)

The full procedure and template live in **`.agent/skills/07-module-docs.md`** — read it first and follow it exactly. The binding rule is `.agent/rules/module-docs.md`.

The loop (no step may be skipped):

1. **Locate** — `yarn docs:who <file|folder|module>` for everything you will touch.
2. **Read** the owning doc(s) fully, then the module's code; if they disagree, the code wins — fix the doc first. Say in one or two sentences what the module does and what your change touches.
3. **Change** the code with the usual rules/skills.
4. **Update the doc** in the same change: every affected section, `Cập nhật` bumped to today. New module → `MODULES` entry in `scripts/check-docs.mjs` + new doc + `docs/README.md` row. Deleted/renamed → remove/move all three.
5. **Gate** — `yarn docs:check --changed` (plus `npx tsc --noEmit`, `yarn i18n:check`, `yarn conventions:check`) must pass.
6. **Report** the docs read and updated; never call a task done while the gate fails.

Docs hold as-built facts only, in Vietnamese with code identifiers verbatim: no plans, standards, TODOs or proposals.
