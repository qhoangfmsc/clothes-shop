# Plan: Admin Products Page Improvements

## Summary
Refactor the Admin Products page to follow the same paginated, BE-driven pattern as Orders and Users pages, fix the subcategory NaN bug, add filter reset buttons, reduce tags, and document the design.

---

## 1. Fix SubCategory Select NaN Bug (Critical)

**Root cause:** The `<select value={form.subcategoryId ?? ""}>` mixes types — `form.subcategoryId` is `number | null` but `<select>` values must be strings. When a number is passed as `value` to a `<select>`, React can produce `NaN`.

**Fix:** Store `subcategoryId` as a string in form state (`""` for none), convert to `number` only when building the BE payload. This aligns with how HTML `<select>` elements natively work — all option values are strings.

- Change `EMPTY_FORM.subcategoryId` from `null as number | null` to `""`
- Change the select `value={form.subcategoryId}` (no `?? ""` needed since it's always a string)
- Change `onChange` to set the string directly: `subcategoryId: e.target.value`
- In `handleSubmit`, convert to number for BE: `subcategoryId: form.subcategoryId ? Number(form.subcategoryId) : 0`
- Update `openEdit` to convert: `subcategoryId: p.subcategory?.id ? String(p.subcategory.id) : ""`

---

## 2. Add Pagination

Follow the exact pattern from `OrdersContent.tsx`:
- Add `page` state, `limit = 25` (match Orders/Users)
- Pass `page` and `limit` to `useAdminProducts`
- Add pagination UI below table (ChevronLeft/ChevronRight + "Page X of Y")
- Ensure filters reset `page` to 1

**Hook changes (`use-admin-api.ts`):**
- Add `page` and `search` to `ProductFilters` interface
- Pass them as query params
- Return `page` and `limit` from hook

---

## 3. BE Search

- Add `search` field to `ProductFilters` in the hook
- Pass `search` query param to BE (`?search=...`)
- Remove client-side `filtered` memo — products come pre-filtered from BE
- The search input calls BE on every change — may want debounce or only search on Enter to reduce requests. Start simple: search on Enter keypress.

---

## 4. Filter Reset Buttons

Add a small reset button next to each toolbar filter:
- **Category filter:** Reset to "" (All) — show reset button when `filterCategory !== ""`
- **Badge filter:** Reset to "" (All) — show reset button when `filterBadge !== ""`
- **Sort filter:** Reset to "newest" — show reset button when `filterSort !== "newest"`

Use a small `X` or rotate-ccw icon button, styled like the existing `clearBtn`.

---

## 5. Reduce Tag Suggestions

Change `TAG_SUGGESTIONS` from 12 items to 5-6:
```
"summer", "winter", "casual", "formal", "luxury", "streetwear"
```

---

## 6. Document Design Pattern

Write `/docs/admin-products.md` documenting:
- Page architecture (filters + pagination + table + modal CRUD)
- Data flow (BE-driven search/filter/pagination via SWR)
- Reusable patterns (Section/Field components, chip-based multi-select)
- Styling conventions

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/use-admin-api.ts` | Add `page`, `search` to `ProductFilters`; pass params; return `page`/`limit` |
| `src/app/(admin)/admin/products/ProductsContent.tsx` | All 6 changes above |
| `docs/admin-products.md` | New file — design documentation |

## Files to Create

| File | Purpose |
|------|---------|
| `docs/admin-products.md` | Page design reference doc |
