---
name: design-principles
description: Apply and explain Design patterns, Architecture, Coding conventions and SOLID when writing, refactoring or reviewing code in this project — with the repo's own examples and known debts. Use when designing a change, filling section 5 of a spec, reviewing a diff, or writing the "Vì sao" note.
---

# design-principles skill (clothes-shop)

Full guide: **`.agent/skills/11-design-principles.md`**; self-review list: **`.agent/skills/12-review-checklist.md`**. Binding rule: `.agent/rules/quality-loop.md`.

Priorities, in order of use:

1. **Architecture** — module-first, one-way dependencies (UI → hook/slice → lib), code goes to `src/` root only when ≥ 2 modules use it; classify the state (server / client / UI / URL) before choosing a tool.
2. **Conventions** — one way per job (`useMoney`, `useErrorMessage`, `session.ts`, `buildListQuery`, `DataTable`, `Carousel`); recurring violations become rules in `scripts/check-conventions.mjs`.
3. **Design patterns** — only to remove real duplication, coupling or untestability (rule of three); never "for the sake of the pattern".
4. **SOLID** — one reason to change per unit, extend by props/functions, small interfaces, depend on hooks/functions rather than details.

Record every decision with its reason and the rejected option in the spec (section 5). Finish the task with a short **"Vì sao"** note: what you applied, where, why — the owner is learning these techniques.
