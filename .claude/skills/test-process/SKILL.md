---
name: test-process
description: Run one batch of the project-wide test programme — make 5 modules fully tested (right and error cases × guest / user / admin with and without permission), with spec, mutants and docs, then stop. Use when the user asks to test or complete a batch (e.g. "batch 1", "continue the test process"), or to check test progress.
---

# test-process skill (clothes-shop)

Full procedure: **`.agent/skills/13-test-process.md`** — read it first and follow it exactly. Binding rule: `.agent/rules/quality-loop.md`. Related: `09-tech-specs`, `10-testing`, `11-design-principles`, `12-review-checklist`.

Start of a session (do not read the whole project):

1. `yarn test:progress` — the board. Take the batch the user named, or the first not finished.
2. `yarn test:progress --batch N` — the worksheet: modules, files to read, dimensions to cover, gaps.

Per module, one at a time (finish it before the next): read doc + code → list flows → spec first (matrix in section 6) → characterization tests for every cell, green on the old code → `tests/<module>/mutants.json` and `yarn test:mutants <module>` (all caught) → refactor only under tests → docs, thresholds, critical flows, leave the baseline → module gate.

End of the batch: `yarn test:progress --verify N` must pass, run every gate, **stop** (never start the next batch in the same session), and report with the template in section 6 of the procedure, ending with the "Vì sao" note. Findings that need the owner's decision (suspicious behaviour locked by a test, debts) go in the report, not into silent changes. State plainly what was not run.
