---
name: i18n
description: Add, change or review any user-facing text in this project (labels, buttons, toasts, metadata, new pages, new languages). Use whenever code under src/app renders text, or when touching src/messages or src/i18n.
---

# i18n skill (clothes-shop)

The full convention lives in **`.agent/skills/04-i18n.md`** — read it first and follow it exactly.

Quick checklist before finishing any UI change:

1. No hardcoded user-facing string — use `useTranslations` / `getTranslations` with keys from `src/messages/<locale>/<role>/<module>.json`.
2. Every new key exists in **en and vi** with identical `{placeholders}` (`yarn i18n:check`).
3. Messages are placed by branch: role → module/page → section (table / form / modal / toast), shared admin components in `admin/components/`.
4. `Link`, `useRouter`, `usePathname`, `redirect` come from `@/src/i18n/navigation`; paths have no locale prefix.
5. Money/dates via `useFormatter` (`"price"`, `"priceFixed"`, `"short"`, `"dateTime"`); plurals via ICU; no sentence fragments.
6. Server pages/layouts call `setRequestLocale(locale)`; metadata via `generateMetadata` + `buildAlternates` + `withBrand`.
7. Run `yarn i18n:sync && yarn i18n:check` and `npx tsc --noEmit`. Never run `yarn build` in the session.

Docs loop (mandatory): before editing run `yarn docs:who <path>` and read the module's doc + code; after editing update that doc and run `yarn docs:check --changed` (skill `module-docs`).
