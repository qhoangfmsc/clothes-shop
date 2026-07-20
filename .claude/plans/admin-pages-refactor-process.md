# Admin Pages Refactor — Process & Checklist

> **Gold Standard:** `admin/products` — đã refactor chuẩn theo skills 01, 02, 03.
> **Goal:** Đồng bộ 4 trang còn lại thành cùng 1 pattern.

---

## Trạng thái hiện tại của 4 trang

| Module | Files | Dùng DataTable? | Dùng Redux Slice? | Inline styles? | Có `_common/`? |
|--------|-------|:--:|:--:|:--:|:--:|
| products ✅ | page.tsx, ProductsContent.tsx, `_common/` | Yes | Yes | No (Tailwind) | Yes |
| categories ❌ | page.tsx, CategoriesContent.tsx (172 dòng) | No (raw table) | No (SWR trực tiếp) | Yes (~170 dòng) | No |
| collections ❌ | page.tsx, CollectionsContent.tsx (887 dòng) | No (raw table) | No (SWR trực tiếp) | Yes (~330 dòng) | No |
| orders ❌ | page.tsx, OrdersContent.tsx (200 dòng) | No (raw table) | No (SWR trực tiếp) | Yes (~200 dòng) | No |
| users ❌ | page.tsx, UsersContent.tsx (210 dòng) | No (raw table) | No (SWR trực tiếp) | Yes (~210 dòng) | No |

---

## Pattern chuẩn (từ products)

Mỗi module admin cần có:

```
admin/<module>/
├── page.tsx                    # Thin route entry
├── <Module>Content.tsx         # UI component (DataTable + Modal)
└── _common/
    ├── moduleSlice.ts          # Redux slice — createAsyncThunk + BaseReducer
    ├── types.ts                # FormData, ListParams, ListResult
    └── constants.ts            # SORT_OPTIONS, EMPTY_FORM, etc.
```

**Nguyên tắc:**
1. Component dùng `useAppDispatch` / `useAppSelector` từ `@/src/store/hooks`
2. CRUD qua `dispatch(thunk).unwrap()`
3. List fetch qua `fetchData` callback của DataTable → dispatch thunk
4. Tất cả styles là Tailwind `className` — KHÔNG `style={}`
5. `style={{}}` chỉ dùng cho dynamic values
6. Constants, types form/list nằm trong `_common/`
7. Entity types nằm trong `src/types/`
8. Reducer được register trong `src/store/index.ts`

---

## Kế hoạch từng trang

### 1. Categories (độ phức tạp: THẤP)

**Đặc điểm:** CRUD đơn giản, có subcategories lồng nhau.

**Cần làm:**
- [ ] Tạo `_common/types.ts` — `CategoryFormData`, `CategoryListParams`, `CategoryListResult`
- [ ] Tạo `_common/constants.ts` — `EMPTY_CATEGORY_FORM`
- [ ] Tạo `_common/moduleSlice.ts` — `fetchCategoryList`, `createCategory`, `updateCategory`, `deleteCategory` (Redux thunks)
- [ ] Register `categoriesReducer` trong `src/store/index.ts`
- [ ] Refactor `CategoriesContent.tsx`:
  - SWR mutation → `dispatch(thunk).unwrap()`
  - Raw `<table>` → `<DataTable<Category>>` với columns
  - Inline `style={}` → Tailwind `className`
  - Giữ modal form nhưng convert styles sang Tailwind
- [ ] **KHÔNG** cần DataTable cho form subcategories (form này đặc thù)

**Columns cho DataTable:**
| Key | Header | Render |
|-----|--------|--------|
| title | Title | Category name in bold |
| slug | Slug | `<code>` badge |
| subcategories | Subcategories | Chip list of subcategory labels |
| description | Description | Truncated text |
| actions | Actions | Edit / Delete buttons |

**Lưu ý:** Categories hiện không có search/filter trên BE (chỉ fetch tất cả rồi hiển thị). DataTable vẫn dùng được — chỉ cần `fetchData` trả về toàn bộ data.

---

### 2. Collections (độ phức tạp: TRUNG BÌNH)

**Đặc điểm:** CRUD + product multi-select trong form, search local cho products.

**Cần làm:**
- [ ] Tạo `_common/types.ts` — `CollectionFormData`, `CollectionListParams`, `CollectionListResult`
- [ ] Tạo `_common/constants.ts` — `SEASONS`, `EMPTY_COLLECTION_FORM`
- [ ] Tạo `_common/moduleSlice.ts` — `fetchCollectionList`, `createCollection`, `updateCollection`, `deleteCollection`
- [ ] Register `collectionsReducer` trong `src/store/index.ts`
- [ ] Refactor `CollectionsContent.tsx`:
  - SWR mutation → `dispatch(thunk).unwrap()`
  - Raw `<table>` → `<DataTable<Collection>>` với columns
  - Inline `style={}` → Tailwind `className`
  - Modal form với product multi-select → convert sang Tailwind
  - Product search là local state (không cần Redux)

**Columns cho DataTable:**
| Key | Header | Render |
|-----|--------|--------|
| collection | Collection | Image thumbnail + name + subtitle |
| slug | Slug | `<code>` badge |
| season | Season | Season badge |
| products | Products | Count badge (e.g. "12 products") |
| actions | Actions | Edit / Delete buttons |

---

### 3. Orders (độ phức tạp: CAO)

**Đặc điểm:** Read-only list, inline status update, detail panel (read-only), phân trang manual.

**Cần làm:**
- [ ] Tạo `_common/types.ts` — `OrderListParams`, `OrderListResult`
- [ ] Tạo `_common/constants.ts` — `ORDER_STATUS_OPTIONS`
- [ ] Tạo `_common/moduleSlice.ts` — `fetchOrderList`, `updateOrderStatus`, `fetchOrderDetail`
- [ ] Register `ordersReducer` trong `src/store/index.ts`
- [ ] Refactor `OrdersContent.tsx`:
  - SWR mutation → `dispatch(thunk).unwrap()`
  - Raw `<table>` + manual pagination → `<DataTable<AdminOrder>>` (DataTable tự xử lý page)
  - Inline `style={}` → Tailwind `className`
  - Status dropdown trong column render (giữ logic như cũ)
  - Detail panel style → Tailwind

**Columns cho DataTable:**
| Key | Header | Render |
|-----|--------|--------|
| orderId | Order ID | #ID (truncated) |
| customer | Customer | User ID trích xuất |
| items | Items | Count badge |
| total | Total | $Amount |
| status | Status | Inline `<select>` dropdown (RoleGuard) |
| date | Date | Formatted date |
| actions | Actions | View button → mở detail panel |

**Lưu ý đặc biệt:**
- Detail panel là panel trượt/overlay riêng — KHÔNG phải modal form CRUD
- Status update inline — dùng dispatch + mutate DataTable
- Cần xử lý search orders: hiện tại search là client-side (lọc theo order ID + address). DataTable gửi search lên fetchData → có thể dispatch thunk với search param, nhưng BE orders có hỗ trợ search không? Nếu không thì giữ client-side filter trong component.

---

### 4. Users (độ phức tạp: TRUNG BÌNH)

**Đặc điểm:** Read-only list, edit modal cho role/status/permissions (không có create).

**Cần làm:**
- [ ] Tạo `_common/types.ts` — `UserListParams`, `UserListResult`, `UserUpdateData`
- [ ] Tạo `_common/constants.ts` — `ROLE_OPTIONS`, `STATUS_OPTIONS`
- [ ] Tạo `_common/moduleSlice.ts` — `fetchUserList`, `updateUser`
- [ ] Register `usersReducer` trong `src/store/index.ts`
- [ ] Refactor `UsersContent.tsx`:
  - SWR mutation → `dispatch(thunk).unwrap()`
  - Raw `<table>` + manual pagination → `<DataTable<AdminUser>>`
  - Inline `style={}` → Tailwind `className`
  - Edit modal (role, status, permissions) → convert sang Tailwind
  - Client-side search giữ lại (DataTable search → fetchData → component-level filter nếu BE không hỗ trợ)

**Columns cho DataTable:**
| Key | Header | Render |
|-----|--------|--------|
| user | User | Avatar + name |
| email | Email | Email text |
| role | Role | Role badge (gold for admin, blue for user) |
| provider | Provider | Provider text |
| status | Status | Status badge (green/red) |
| permissions | Permissions | Count badge |
| joined | Joined | Formatted date |
| actions | Actions | Edit button |

**Lưu ý:**
- Không có nút "Add" — users được tạo qua auth flow, không phải admin CRUD
- Edit modal mở ra form role/status/permissions — khác với CRUD form của products
- Permission checkboxes dùng PERMISSION_GROUPS từ `@/src/lib/permissions`

---

## Thứ tự thực hiện đề xuất

1. **Categories** — Đơn giản nhất, làm trước để validate pattern
2. **Collections** — Tương tự categories nhưng có thêm product multi-select
3. **Users** — Không có create, edit modal khác biệt
4. **Orders** — Phức tạp nhất (detail panel, inline status edit, client-side search)

---

## Những thứ KHÔNG đụng đến

- `DataTable.tsx` — vẫn đang dùng inline styles, cần refactor riêng (tách thành task khác)
- `use-admin-api.ts` — SWR hooks vẫn được giữ cho cross-module read-only data (vd: products cần categories list)
- `src/lib/api.ts`, `src/lib/auth-api.ts` — đã chuẩn
- `src/store/baseSlice.ts` — đã chuẩn

---

## Rủi ro & Lưu ý

1. **Orders search client-side**: DataTable gửi search lên `fetchData`, nhưng BE orders có thể không hỗ trợ search. Giải pháp: `fetchData` bỏ qua search param cho orders (luôn fetch full list), component tự filter client-side.

2. **DataTable chưa được Tailwind hoá**: DataTable vẫn dùng inline styles nên sẽ có inconsistency tạm thời giữa Content component (Tailwind) và DataTable (inline). Sẽ giải quyết khi refactor DataTable riêng.

3. **TypeScript type compatibility**: `SORT_OPTIONS` dùng `as const` → readonly arrays. DataTable props nhận mutable arrays. Cần cast hoặc đổi type DataTable.

4. **Không dùng `index.ts` để re-export**: Theo rule số 7 trong coding.md.
