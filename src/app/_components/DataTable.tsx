"use client";

import {
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  type ReactNode,
} from "react";
import { Search, X, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useDebounce } from "@/src/hooks/use-debounce";

/* ═══════════════════════════════════ Types ═══════════════════════════════════ */

export interface DataTableColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
}

export interface DataTableFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}

export interface DataTableSortOption {
  value: string;
  label: string;
}

export interface DataTableFetchParams {
  search: string;
  filters: Record<string, string>;
  sort: string;
  page: number;
  limit: number;
}

export interface DataTableFetchResult<T> {
  data: T[];
  total: number;
}

export interface DataTableRef {
  refresh: () => void;
  reset: () => void;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  fetchData: (params: DataTableFetchParams) => Promise<DataTableFetchResult<T>>;

  /* ── Search ── */
  searchPlaceholder?: string;

  /* ── Filters ── */
  filters?: DataTableFilter[];

  /* ── Sort ── */
  sortOptions?: DataTableSortOption[];
  defaultSort?: string;

  /* ── Pagination ── */
  pageSize?: number;

  /* ── Data ── */
  keyExtractor?: (row: T) => string;

  /* ── Empty state ── */
  emptyMessage?: string | ((hasActiveFilters: boolean) => string);

  /* ── Ref ── */
  tableRef?: React.RefObject<DataTableRef | null>;
}

/* ═══════════════════════════════ Defaults ═══════════════════════════════════ */

const DEFAULT_PAGE_SIZE = 25;
const DEBOUNCE_MS = 350;

function defaultKeyExtractor<T extends { id?: string | number }>(row: T): string {
  return String(row.id ?? "");
}

function defaultEmpty(hasFilters: boolean): string {
  return hasFilters ? "No results match your filters." : "Nothing yet.";
}

/* ═══════════════════════════════ Styles ═════════════════════════════════════ */

const inputClass =
  "py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none";
const selectClass =
  "py-2 px-3 border-0 rounded-lg text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none min-w-[130px] h-9";

/* ═══════════════════════════════ Component ══════════════════════════════════ */

function DataTableInner<T extends { id?: string | number }>(
  props: DataTableProps<T>,
  ref: React.Ref<DataTableRef>
) {
  const {
    columns,
    fetchData,
    searchPlaceholder = "Search...",
    filters = [],
    sortOptions = [],
    defaultSort = "-createdAt",
    pageSize = DEFAULT_PAGE_SIZE,
    keyExtractor = defaultKeyExtractor,
    emptyMessage,
    tableRef,
  } = props;

  /* ── State ── */
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, DEBOUNCE_MS);

  const initFilters = (): Record<string, string> => {
    const f: Record<string, string> = {};
    for (const fil of filters) f[fil.key] = fil.defaultValue ?? "";
    return f;
  };
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(initFilters);
  const [sort, setSort] = useState(defaultSort);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const hasActiveFilters =
    debouncedSearch !== "" || Object.values(activeFilters).some((v) => v !== "");

  /* ── Core fetch ── */
  const load = useCallback(
    async (overrides?: Partial<DataTableFetchParams>) => {
      setLoading(true);
      try {
        const params: DataTableFetchParams = {
          search: debouncedSearch,
          filters: activeFilters,
          sort,
          page,
          limit: pageSize,
          ...overrides,
        };
        const result = await fetchData(params);
        setData(result.data);
        setTotal(result.total);
      } catch {
        setData([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, activeFilters, sort, page, pageSize, fetchData]
  );

  /* ── Ref API ── */
  useImperativeHandle(tableRef ?? ref, () => ({
    refresh: () => load(),
    reset: () => {
      setSearch("");
      setActiveFilters(initFilters());
      setSort(defaultSort);
      setPage(1);
    },
  }));

  /* ── Fetch on param change ── */
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, activeFilters, sort, page]);

  /* ── Handlers ── */
  const setFilter = (key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilter = (key: string, defaultValue = "") => {
    setFilter(key, defaultValue);
  };

  const clearSearch = () => {
    setSearch("");
    setPage(1);
  };

  /* ── Render ── */
  return (
    <div className="flex flex-col gap-6">
      {/* ── Toolbar ── */}
      <div className="flex gap-3 items-end flex-wrap">
        {/* Search */}
        <label className="flex flex-col gap-0.75 flex-1">
          <span className="text-xs font-semibold text-[var(--text-muted)] font-primary">Search</span>
          <div className="flex items-center gap-2 bg-[var(--bg-secondary)] rounded-lg px-4 h-9">
            <Search size={14} className="text-[var(--text-muted)] shrink-0" />
            <input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border-0 bg-transparent p-0 text-sm font-primary text-[var(--text-primary)] outline-none"
            />
            {search && (
              <button
                type="button"
                className="flex items-center justify-center w-6 h-6 border-0 rounded-sm bg-[var(--bg-elevated)] cursor-pointer text-[var(--text-muted)] shrink-0"
                onClick={clearSearch}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </label>

        {/* Filters */}
        {filters.map((fil) => {
          const val = activeFilters[fil.key] ?? "";
          const isActive = val !== (fil.defaultValue ?? "");
          return (
            <label key={fil.key} className="flex flex-col gap-0.75">
              <span className="text-xs font-semibold text-[var(--text-muted)] font-primary">{fil.label}</span>
              <div className="flex gap-1 items-center">
                <select
                  value={val}
                  onChange={(e) => setFilter(fil.key, e.target.value)}
                  className={selectClass}
                >
                  <option value="">All</option>
                  {fil.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {isActive && (
                  <button
                    type="button"
                    className="flex items-center justify-center w-6 h-6 border-0 rounded-sm bg-[var(--bg-elevated)] cursor-pointer text-[var(--text-muted)] shrink-0"
                    onClick={() => resetFilter(fil.key, fil.defaultValue ?? "")}
                    title={`Reset ${fil.label.toLowerCase()}`}
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            </label>
          );
        })}

        {/* Sort */}
        {sortOptions.length > 0 && (
          <label className="flex flex-col gap-0.75">
            <span className="text-xs font-semibold text-[var(--text-muted)] font-primary">Sort</span>
            <div className="flex gap-1 items-center">
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className={selectClass}
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {sort !== defaultSort && (
                <button
                  type="button"
                  className="flex items-center justify-center w-6 h-6 border-0 rounded-sm bg-[var(--bg-elevated)] cursor-pointer text-[var(--text-muted)] shrink-0"
                  onClick={() => {
                    setSort(defaultSort);
                    setPage(1);
                  }}
                  title="Reset sort"
                >
                  <RotateCcw size={12} />
                </button>
              )}
            </div>
          </label>
        )}
      </div>

      {/* ── Table ── */}
      <div className="relative bg-[var(--bg-secondary)] rounded-2xl overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-[rgba(251,248,241,0.5)] flex items-center justify-center z-10 rounded-2xl">
            <span className="text-sm text-[var(--text-muted)] font-primary">Loading...</span>
          </div>
        )}
        <table
          className="w-full border-collapse"
          style={{
            opacity: loading ? 0.4 : 1,
            transition: "opacity var(--duration-fast)",
          }}
        >
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left text-xs font-semibold text-[var(--text-muted)] py-3 px-4 border-b border-[var(--border-subtle)] font-primary uppercase tracking-[0.05em] ${
                    col.align === "right" ? "text-right" : ""
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-10 px-4 text-center text-[var(--text-muted)] text-sm font-primary"
                >
                  {typeof emptyMessage === "function"
                    ? emptyMessage(hasActiveFilters)
                    : (emptyMessage ?? defaultEmpty(hasActiveFilters))}
                </td>
              </tr>
            )}
            {data.map((row) => (
              <tr key={keyExtractor(row)} className="border-b border-[var(--border-subtle)]">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3 px-4 text-sm text-[var(--text-primary)] font-primary align-middle ${
                      col.align === "right" ? "text-right" : ""
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4">
          <button
            className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-[var(--bg-secondary)] cursor-pointer text-[var(--text-secondary)] disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-[var(--text-muted)] font-primary">
            Page {page} of {totalPages}
          </span>
          <button
            className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-[var(--bg-secondary)] cursor-pointer text-[var(--text-secondary)] disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════ Forward Ref ════════════════════════════════ */

export const DataTable = forwardRef(DataTableInner) as <T extends { id?: string | number }>(
  props: DataTableProps<T> & { ref?: React.Ref<DataTableRef> }
) => ReturnType<typeof DataTableInner>;
