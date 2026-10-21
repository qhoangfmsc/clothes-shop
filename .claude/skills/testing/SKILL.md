---
name: testing
description: Write or change automated tests in this project (Vitest, Testing Library, MSW, Playwright) — characterization tests before a refactor, a failing test before a fix, integration tests for hooks/clients/components, E2E on the real API, coverage thresholds. Use whenever adding code under src/ or a file under tests/.
---

# testing skill (clothes-shop)

Full guide: **`.agent/skills/10-testing.md`** — read it first. Binding rule: `.agent/rules/quality-loop.md`.

Essentials:

- Tests live **only** in `tests/<group>/<module>/` (mirror of `docs/` and `specs/`); helpers in `tests/_support/`; cross-module journeys in `tests/e2e/`. Unit/integration/component: `*.test.ts(x)` (Vitest). Browser: `*.e2e.ts` (Playwright).
- Mostly integration tests through MSW (`tests/_support/msw-server.ts`, unhandled requests fail the test); unit tests for pure functions; few E2E for flows in `specs/_critical-flows.md`.
- Name `describe` blocks after the spec's flow ids (`SES-4 …`). Assert what a user or caller sees, not internals. Query components by role/text.
- Refactor = characterization tests green on the **old** code first. Fix = reproduce the bug first. New behaviour = failing test first.
- Prove the tests bite: break the code on purpose in T0 files and watch them fail.
- E2E uses the real API: read-only by default; writes only with `E2E_ALLOW_WRITES=1` against non-production data. Signed-out flows are `*.e2e.ts`; signed-in flows are `*.auth.e2e.ts` and use the test account's refresh token from `.env.e2e.local` (git-ignored, template `.env.e2e.example`): `setup` checks it and stops with a clear message when it expired; never commit tokens.
- Coverage thresholds in `vitest.config.mts` only go up. Run: `yarn test`, `yarn test:coverage`, `yarn test:e2e`.
