# 05 — List pages (admin tables, search, sort, filter, pagination)

Every admin list — and every storefront list that talks to a BE list endpoint — follows **one contract** and **one set of building blocks**. A new list page should be mostly wiring; if you find yourself inventing something here, extend the shared piece instead.

`yarn conventions:check` (runs before `yarn build`) fails on the most common deviations.

## 1. The BE contract (single source: `src/lib/list-query.ts`)

| | Rule |
|---|---|
| Query | `?search=&sort=&page=&limit=` plus module filters (`status`, `category`, …). Unknown params → **400** (`forbidNonWhitelisted`). |
| Sort | **one** field, param name **`sort`**. `field` = ascending, `-field` = descending (`createdAt` = oldest first, `-createdAt` = newest first). Values outside the module's whitelist → 400. Never `newest`, `price_asc`, `sorts`. |
| Limit | `LIST_DEFAULT_LIMIT` = **25**, `LIST_MAX_LIMIT` = **200**. More than 200 → 400. Never write a literal ≥ 100 — import the constant. |
| Response | `{ data, total, page, limit, totalPages }` |
| Errors | `ApiError` with `errorCode` — see skill 06. |

Build every list URL with `buildListQuery(params, filters)`:

```ts
const qs = buildListQuery(params, { category: params.category, status: params.status });
return authApi.get<ListResult<Product>>(`/api/admin/products?${qs}`);
```

It drops empty values, omits `page` on page 1 and clamps `limit` into 1..200. Do **not** `qs.set("limit" | "page" | "sort" | "search")` by hand (convention check `list-query`).

BE default sort per module (what you get without `sort`): categories `priority` (1 = first), everything else `-createdAt`. Sortable fields: categories `priority/title/createdAt` · collections `name/createdAt` · products `price/name/createdAt` · orders `createdAt/total` · users `name/email/createdAt` · media `createdAt/name/size`.

## 2. Anatomy of an admin list module

```
admin/<module>/
  <Module>Content.tsx        page: DataTable + modal form (UI only)
  _common/
    types.ts                 <Module>ListParams extends ListParams · FormData · ListResult
    constants.ts             <MODULE>_SORT_OPTIONS · statuses · EMPTY_FORM
    moduleSlice.ts           thunks (buildListQuery) + slice with BaseCrud state, registered in src/store/index.ts
```

- Server data for a **table** goes through the module's Redux slice (`dispatch(fetchXList(...)).unwrap()` inside `fetchData`).
- **Reference data** for dropdowns / pickers (all categories, all products) uses the SWR hooks in `src/hooks/use-admin-api.ts` (`useAdminCategories({ limit: LIST_MAX_LIMIT })`). Both go through `buildListQuery`.
- Components never call `fetch` directly (uploads use `uploadMediaFile` from `src/hooks/use-media-upload.ts`).

## 3. The table: `DataTable` (always)

```tsx
const sortOptions = useSortOptions(PRODUCT_SORT_OPTIONS);

<DataTable<Product>
  tableRef={tableRef}
  columns={columns}
  fetchData={fetchProducts}                       // server mode
  searchPlaceholder={t("table.searchPlaceholder")} // or searchable={false} + a reason
  filters={[{ key: "status", label: t("table.filters.status"), options }]}
  sortOptions={sortOptions}                        // required in server mode
/>
```

- **Search + sort are mandatory** for server tables (check `data-table`). Default sort is `-createdAt`; a module whose natural order differs sets `defaultSort` (categories: `priority`).
- **Sort options** are constants `{ value, key }` in the module's `constants.ts`; labels live **once** in `admin.components.crud.sort.<key>` and are resolved by `useSortOptions`. Shared keys: `newest oldest priority nameAsc nameDesc titleAsc titleDesc emailAsc emailDesc priceAsc priceDesc totalAsc totalDesc sizeAsc sizeDesc`. Add a new key there (en + vi) rather than a per-module label. Always offer **newest** and **oldest** first.
- **Filters** are `DataTable` `filters` (select per key) and are forwarded to the thunk via `params.filters.<key> || undefined`. Option lists that come from data must only ever **grow** (a filter built from the current filtered page collapses to the selected value).
- **Pagination / limit**: do nothing — 25 per page by default. Pass `pageSize` only when the screen must show everything at once (categories drag & drop: `LIST_MAX_LIMIT`); `DataTable` clamps it to 200 and hides the pager when everything fits.
- **Drag-and-drop order**: `reorder={{ sortValue, onReorder }}`; needs the whole list on one page.
- Forward **all** of `params.search / params.sort / params.page / params.limit` plus filters to the thunk — a forgotten `sort` silently disables the sort dropdown.
- After a mutation call `tableRef.current?.refresh()`; after an upload that adds rows to a "newest first" table also `reset()`.

## 4. Checklist for a new list page

1. `types.ts`: `XListParams extends ListParams` (+ filters).
2. `constants.ts`: `X_SORT_OPTIONS` using only whitelisted fields, newest/oldest included.
3. `moduleSlice.ts`: thunk with `buildListQuery`, initial `limit: LIST_DEFAULT_LIMIT`; register the reducer.
4. Page: `useSortOptions`, `DataTable` with search + sort (+ filters), thunk gets every param.
5. Messages: `table.searchPlaceholder`, `table.columns.*`, `table.filters.*`, `toast.*` (skill 06); new sort labels in `crud.json`.
6. `yarn i18n:check`, `npx tsc --noEmit`, `yarn conventions:check`.

---

## Docs (mandatory)

This work changes a module, so it is part of the docs loop (`.agent/rules/module-docs.md`, `.agent/skills/07-module-docs.md`):

1. **Before editing** — `yarn docs:who <file|folder|module>`, read the owning doc(s) and the module's code; if they disagree, fix the doc first.
2. **After editing** — update the module doc in the same change (affected sections, `Cập nhật` date) and run `yarn docs:check --changed`. Not done until it passes.

