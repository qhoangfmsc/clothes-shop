# Plan: Reusable DataTable Component

## Goal
Create a single `DataTable<T>` component that encapsulates search, filters, sort, pagination, loading states, and refresh — then apply it to `admin/products`.

## Component API Design

```tsx
// ── Types ──
interface DataTableColumn<T> {
  key: string;                          // unique key
  header: string;                       // column header text
  width?: string;                       // optional width
  align?: "left" | "right";             // text align (default left)
  render: (row: T) => React.ReactNode;  // cell renderer
}

interface DataTableFilter {
  key: string;                          // query param key
  label: string;                        // display label in toolbar
  options: { value: string; label: string }[];  // select options
  defaultValue?: string;                // default "all" value (default: "")
}

interface DataTableSortOption {
  value: string;
  label: string;
}

interface FetchParams {
  search: string;
  filters: Record<string, string>;   // { category: "tops", badge: "" }
  sort: string;
  page: number;
  limit: number;
}

interface FetchResult<T> {
  data: T[];
  total: number;
}

// ── Component ──
<DataTable<T>
  columns={DataTableColumn<T>[]}
  fetchData={(params: FetchParams) => Promise<FetchResult<T>>}
  
  // Search
  searchPlaceholder?: string          // default "Search..."
  
  // Filters (optional)
  filters?: DataTableFilter[]
  
  // Sort (optional)  
  sortOptions?: DataTableSortOption[]
  defaultSort?: string               // default "newest"
  
  // Pagination
  pageSize?: number                  // default 25
  
  // Refresh
  tableRef?: React.RefObject<DataTableRef>
  
  // Customization
  emptyState?: string | ((hasFilters: boolean) => string)
  keyExtractor?: (row: T) => string  // default (row) => row.id
  headerExtra?: React.ReactNode      // rendered in header row (e.g. "Add Product" button)
  totalLabel?: string                // default "total"
/>
```

## Data Flow

```
User types in search / changes filter / clicks page
        │
        ▼
  Internal state updates (search debounced 350ms)
        │
        ▼
  fetchData({ search, filters, sort, page, limit })
        │
        ▼
  setData({ data, total }) + setLoading
        │
        ▼
  Table re-renders
```

## Refresh Mechanism

```tsx
// Parent:
const tableRef = useRef<DataTableRef>(null);
// after CRUD success:
tableRef.current?.refresh();

// DataTable internally:
useImperativeHandle(tableRef, () => ({
  refresh: () => mutate(),  // force re-fetch with current params
}));
```

Actually, since the fetch is not SWR-based but a manual call, `refresh` just calls `fetchData` again with current params.

## Implementation

### File structure:
```
src/app/_components/DataTable.tsx   — single file (types + component + styles)
```

### Internal state:
- `search` (string) + `debouncedSearch` (350ms)
- `filters` (Record<string, string>) — keyed by filter key
- `sort` (string)
- `page` (number)
- `data` (T[])
- `total` (number)
- `loading` (boolean)

### Effects:
- `useEffect` on debouncedSearch + filters + sort + page → call fetchData
- When any filter/sort/search changes → reset page to 1

### Styling:
- Mirror existing styles from ProductsContent/OrdersContent — same CSS variable patterns
- Toolbar: flex row with search + filters + sort
- Table: contained card (`var(--bg-secondary)`, `border-radius-lg`)
- Pagination: centered below table

## Apply to admin/products

Replace ProductsContent's toolbar + table + pagination with:
```tsx
const tableRef = useRef<DataTableRef>(null);

// After create/update/delete success:
tableRef.current?.refresh();

<DataTable
  tableRef={tableRef}
  columns={productColumns}
  fetchData={async (params) => {
    const res = await apiFetch(...);
    return { data: res.data, total: res.total };
  }}
  filters={[
    { key: "category", label: "Category", options: categoryFilterOptions },
    { key: "badge", label: "Badge", options: badgeOptions },
  ]}
  sortOptions={SORT_OPTIONS}
  defaultSort="newest"
  searchPlaceholder="Name or slug..."
  headerExtra={<Add Product button>}
/>
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/app/_components/DataTable.tsx` | **Create** — reusable DataTable component |
| `src/app/(admin)/admin/products/ProductsContent.tsx` | **Modify** — use DataTable instead of manual toolbar+table |

## Trade-offs

- **Pro:** All table pages get consistent UX. Adding a new table page is ~30 lines of column/filter config.
- **Con:** The modal/form part stays in the page component (varies too much to abstract).
