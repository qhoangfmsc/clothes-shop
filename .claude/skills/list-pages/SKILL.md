---
name: list-pages
description: Build or change any list/table page (admin products, orders, users, categories, collections, media, or a storefront list) — search, sort, filters, pagination, page size, BE query contract. Use whenever touching DataTable, a moduleSlice list thunk, use-admin-api hooks, sort options or limit values.
---

# list-pages skill (clothes-shop)

The full convention lives in **`.agent/skills/05-list-pages.md`** — read it first and follow it exactly.

Quick checklist:

1. Build list URLs only with `buildListQuery()` (`src/lib/list-query.ts`); sort is `field` / `-field`, one field, param `sort`; limit default `LIST_DEFAULT_LIMIT` (25), max `LIST_MAX_LIMIT` (200).
2. Admin tables use `DataTable` in server mode with **`searchPlaceholder` and `sortOptions`**; sort options are `<MODULE>_SORT_OPTIONS` constants resolved by `useSortOptions` (labels in `admin.components.crud.sort`).
3. Forward search, sort, page, limit **and** filters from `fetchData` to the thunk.
4. `pageSize` only when the screen must show everything (max 200).
5. Types extend `ListParams`; slice initial `limit` is `LIST_DEFAULT_LIMIT`.
6. Run `npx tsc --noEmit`, `yarn i18n:check`, `yarn conventions:check`.

Docs loop (mandatory): before editing run `yarn docs:who <path>` and read the module's doc + code; after editing update that doc and run `yarn docs:check --changed` (skill `module-docs`).
