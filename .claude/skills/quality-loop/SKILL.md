---
name: quality-loop
description: The mandatory spec → test → code → docs loop. Use at the START of any task that touches a module (read doc + spec, update the spec first), while changing it (tests before code), and at the END (docs, gates, "Vì sao" report); also when creating a module or writing/updating a tech spec. Covers specs/, tests/, `yarn quality:check`, scripts/quality-baseline.json.
---

# quality-loop skill (clothes-shop)

Binding rule: **`.agent/rules/quality-loop.md`**. How to write a spec: **`.agent/skills/09-tech-specs.md`** (template `specs/_template.md`, worked example `specs/platform/auth.md`). Testing: **`.agent/skills/10-testing.md`** (skill `testing`).

The loop (no step may be skipped):

1. `yarn docs:who <path|module>`; read the doc, the spec and the code. Say what the module does and what you will touch.
2. **Update the spec first**: goal, contract, design, **design decisions (Design pattern · Architecture · SOLID · Conventions, each with a reason and the option rejected)**, vital flows + the tests that guard them.
3. **Tests before the change**: characterization tests (green on current code) before refactoring; a failing test before a fix or a new behaviour.
4. **Code** with `.agent/skills/11-design-principles.md` (skill `design-principles`).
5. **Docs** per `module-docs`.
6. **Gates**: `yarn quality:check --changed`, `yarn docs:check --changed`, `yarn test`, `npx tsc --noEmit`, `yarn i18n:check`, `yarn conventions:check`.
7. **Report**: docs/specs read and updated, tests added, and a short **"Vì sao"** note (pattern/principle, where, why).

A module listed in `scripts/quality-baseline.json` gets its spec and tests the first time it is touched and leaves the list (it only shrinks). Order of work for the existing modules: `specs/_roadmap.md`.
