---
trigger: always_on
---

# Quality loop — spec → test → code → docs

Extends the docs loop (`module-docs.md`). Every change to a module is one closed loop, and it is not done until every gate passes. A module is one entry of `MODULES` in `scripts/modules.mjs`; it owns **one doc** (`docs/<group>/<module>.md`, what the code does), **one tech spec** (`specs/<group>/<module>.md`, what it is designed to do and why) and **one test folder** (`tests/<group>/<module>/`).

```
yarn docs:who ► read doc + code ► UPDATE SPEC ► WRITE/UPDATE TESTS ► code ► UPDATE DOCS ► gates ► report
                                      ▲                                                                │
                                      └──────────────── the next task starts from the spec ◄──────────┘
```

## The loop (in this order)

1. **Locate & read** — `yarn docs:who <path|module>`; read the doc, the spec (if any) and the code. Code wins over doc; fix the doc first. Say what the module does and what you will touch.
2. **Spec first** — create or update `specs/<module>.md` (template `specs/_template.md`, how-to `.agent/skills/09-tech-specs.md`): goal, contract, design, **design decisions (Design pattern · Architecture · SOLID · Conventions, each with a reason)**, and the **test matrix** (section 6): every vital flow labelled `đúng`/`lỗi` and with the identity it is about (`khách`, `user`, `admin đủ quyền`, `admin thiếu quyền`, `—`), plus the tests that guard it. Status `Approved` before coding, `Implemented` after.
3. **Tests before the change** — `.agent/skills/10-testing.md`.
   - **Existing behaviour you will refactor:** write *characterization tests* that pass on the current code, then change the code under them.
   - **New behaviour:** write the failing test first (or together with the code) for every vital flow in the spec.
   - **Bug fix:** a test that reproduces the bug first.
4. **Code** — apply the design principles in `.agent/skills/11-design-principles.md`: prefer the simplest design that satisfies SOLID, uses an established pattern where it removes real duplication or coupling, and respects the module-first architecture. No abstraction without a second use or a test that needs it.
5. **Docs** — update `docs/` per `module-docs.md`.
6. **Gates** — all must pass: `yarn quality:check --changed`, `yarn docs:check --changed`, `yarn test`, `npx tsc --noEmit`, `yarn i18n:check`, `yarn conventions:check`. UI changes: also the responsive check (`responsive.md`).
7. **Report** — list the docs and specs read and updated, the tests added, and end with a short **"Vì sao"** note: which pattern / principle you applied, where, and why (2–6 lines, so the owner learns from every change). Say plainly if a gate was not run.

## Hard rules

- A module whose code changed must have its **spec updated** and **a test under `tests/<module>/` added or changed** in the same change. The only exemption is a change with no behaviour or contract change (formatting, comments, renames): log `no-test: <reason>` in the spec's change history.
- **A module is done only when `yarn test:progress` shows it ✓**: spec `Implemented` for the whole module, full matrix (a right and an error flow; with `auth = có` a guest flow and a signed-in flow; with `permission = có` an admin who may and one who may not; a dimension that does not apply says why), at least one test per flow, out of the baseline. Prove the tests bite with `yarn test:mutants <module>` (all mutants caught).
- A module with no spec and tests is listed in `scripts/quality-baseline.json` (`pending`). Touching it means writing its spec and tests and **removing it from that list** in the same change. The list may only shrink; never add to it.
- Tests live **only** under `tests/` (never beside the code, never under `src/app`). `tests/_support/` is shared helpers; `tests/e2e/` is cross-module journeys.
- Never lower a coverage threshold in `vitest.config.mts` to pass a build; add a test.
- Browser (E2E) tests run against the real API and are read-only unless `E2E_ALLOW_WRITES=1` is set deliberately against non-production data. Never put tokens or passwords in the repo.
- A new vital flow goes into `specs/_critical-flows.md`.
- The existing modules are brought up to this standard **in batches of at most 5 modules, one batch per session**, by the procedure in `.agent/skills/13-test-process.md` (skill `test-process`; plan `scripts/test-batches.json`; board `yarn test:progress`). Principles and the finish line: `specs/_roadmap.md`.
