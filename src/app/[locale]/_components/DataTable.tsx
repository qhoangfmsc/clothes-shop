"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
  type ReactNode,
} from "react";
import { Search, X, ChevronLeft, ChevronRight, RotateCcw, GripVertical } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { useLocale, useTranslations } from "next-intl";
import { useDebounce } from "@/src/hooks/use-debounce";
import { LIST_DEFAULT_LIMIT, clampLimit } from "@/src/lib/list-query";

/* ═══════════════════════════════════ Types ═══════════════════════════════════ */

export interface DataTableColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "right";
  /** Hide the column below this breakpoint (phone-first admin tables). */
  hideBelow?: "sm" | "md" | "lg";
  render: (row: T) => ReactNode;
}

/** What `renderBulkActions` receives when one or more rows are ticked. */
export interface DataTableSelection<T> {
  keys: string[];
  rows: T[];
  clear: () => void;
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

/** Opt-in drag-and-drop row ordering. Rows can only be dragged while the table is
 *  sorted by `sortValue`, unfiltered, and fits on a single page (the whole list is on screen). */
export interface DataTableReorder<T> {
  /** The `sort` value under which the on-screen order is the persisted order. */
  sortValue: string;
  /** Receives the full list in its new order. Throw to roll the table back. */
  onReorder: (rows: T[]) => Promise<void> | void;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  /** Server-driven mode: called on mount and whenever search/filter/sort/page change. */
  fetchData?: (params: DataTableFetchParams) => Promise<DataTableFetchResult<T>>;

  /* ── Static mode (no `fetchData`) ── */
  /** Rows the parent already has (e.g. from an SWR hook). No fetching, search,
   *  filters or sorting — just the shared table chrome. */
  rows?: T[];
  /** Static mode only: show the loading overlay while the parent is fetching. */
  loading?: boolean;

  /* ── Search ── */
  /** Set false for APIs without a search param — hides the search box. */
  searchable?: boolean;
  searchPlaceholder?: string;

  /* ── Filters ── */
  filters?: DataTableFilter[];

  /* ── Sort ── */
  sortOptions?: DataTableSortOption[];
  defaultSort?: string;

  /* ── Pagination ── */
  /** Records per page: `LIST_DEFAULT_LIMIT` (25) unless set, capped at `LIST_MAX_LIMIT` (200). */
  pageSize?: number;

  /* ── Drag & drop ordering ── */
  reorder?: DataTableReorder<T>;

  /* ── Data ── */
  keyExtractor?: (row: T) => string;

  /* ── Row selection ── */
  /** Adds a checkbox column + a bar with `renderBulkActions` while rows are ticked. */
  selectable?: boolean;
  renderBulkActions?: (selection: DataTableSelection<T>) => ReactNode;

  /* ── Errors ── */
  /** Called when `fetchData` rejects (the table itself just shows as empty). */
  onError?: (error: unknown) => void;

  /* ── Empty state ── */
  emptyMessage?: string | ((hasActiveFilters: boolean) => string);

  /* ── Ref ── */
  tableRef?: React.RefObject<DataTableRef | null>;
}

/* ═══════════════════════════════ Defaults ═══════════════════════════════════ */

const DEBOUNCE_MS = 350;

function defaultKeyExtractor<T extends { id?: string | number }>(row: T): string {
  return String(row.id ?? "");
}

const HIDE_BELOW_CLASS = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
} as const;

/* Page numbers to render, with "…" gaps — always keeps first, last, and a
   window around the current page so the control stays a fixed width. */
function getPageRange(current: number, total: number): (number | "...")[] {
  const range: (number | "...")[] = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 1) {
      range.push(i);
    } else if (range[range.length - 1] !== "...") {
      range.push("...");
    }
  }
  return range;
}

/* ═══════════════════════════════ Styles ═════════════════════════════════════ */

const inputClass =
  "py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none";
const selectClass =
  "py-2 px-3 border-0 rounded-lg text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none min-w-[8.125rem] h-9 pointer-coarse:h-11 pointer-coarse:text-base";

/* ═══════════════════════════════ Sortable row ═══════════════════════════════ */

interface SortableRowProps {
  id: string;
  className: string;
  disabled: boolean;
  handleLabel: string;
  children: ReactNode;
}

function SortableRow({ id, className, disabled, handleLabel, children }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        position: isDragging ? "relative" : undefined,
        zIndex: isDragging ? 2 : undefined,
      }}
      className={`${className} ${isDragging ? "bg-[var(--bg-secondary)] shadow-lg" : ""}`}
    >
      <td className="w-10 py-3 pl-4 pr-0 align-middle">
        <button
          type="button"
          ref={setActivatorNodeRef}
          disabled={disabled}
          aria-label={handleLabel}
          title={handleLabel}
          className="flex items-center justify-center w-7 h-7 border-0 rounded-sm bg-transparent text-[var(--text-muted)] touch-none cursor-grab active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
      </td>
      {children}
    </tr>
  );
}

/* ═══════════════════════════════ Component ══════════════════════════════════ */

function DataTableInner<T extends { id?: string | number }>(
  props: DataTableProps<T>,
  ref: React.Ref<DataTableRef>
) {
  const {
    columns,
    fetchData,
    rows,
    loading: externalLoading,
    searchable = true,
    searchPlaceholder,
    filters = [],
    sortOptions = [],
    defaultSort = "-createdAt",
    pageSize: requestedPageSize = LIST_DEFAULT_LIMIT,
    reorder,
    keyExtractor = defaultKeyExtractor,
    emptyMessage,
    tableRef,
    selectable = false,
    renderBulkActions,
    onError,
  } = props;

  /* Never ask the BE for more than its list maximum (it answers 400) */
  const pageSize = clampLimit(requestedPageSize);
  const t = useTranslations("admin.components.dataTable");
  const locale = useLocale();

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
  const [fetchedData, setData] = useState<T[]>([]);
  const [fetchedTotal, setTotal] = useState(0);
  const [fetching, setLoading] = useState(!!fetchData);

  const isStatic = !fetchData;
  const data = isStatic ? (rows ?? []) : fetchedData;
  const total = isStatic ? data.length : fetchedTotal;
  const loading = isStatic ? !!externalLoading : fetching;
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const hasActiveFilters =
    debouncedSearch !== "" || Object.values(activeFilters).some((v) => v !== "");

  /* ── In-flight guard — prevents concurrent API calls (StrictMode double-fire, rapid param changes) ── */
  const fetchingRef = useRef(false);
  const pendingRef = useRef(false);
  const activeParamsRef = useRef("");
  /* Always the `load` of the latest render, so a retry never runs with stale params */
  const loadRef = useRef<(() => Promise<void>) | null>(null);

  const buildParamsKey = useCallback(
    (overrides?: Partial<DataTableFetchParams>) =>
      JSON.stringify({ debouncedSearch, activeFilters, sort, page, pageSize, ...overrides }),
    [debouncedSearch, activeFilters, sort, page, pageSize]
  );

  /* ── Core fetch ── */
  const load = useCallback(
    async (overrides?: Partial<DataTableFetchParams>) => {
      if (!fetchData) return;
      const paramsKey = buildParamsKey(overrides);
      if (fetchingRef.current) {
        /* Only mark for retry if params are different from the in-flight request.
           This prevents StrictMode double-fire from triggering a false retry. */
        if (paramsKey !== activeParamsRef.current) {
          pendingRef.current = true;
        }
        return;
      }
      fetchingRef.current = true;
      pendingRef.current = false;
      activeParamsRef.current = paramsKey;
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
        /* Keep only ticked rows that are still on screen (page/filter change, deletes). */
        const visibleKeys = new Set(result.data.map(keyExtractor));
        setSelectedKeys((prev) => new Set([...prev].filter((k) => visibleKeys.has(k))));
        /* Last row of the last page was removed → step back instead of showing an empty page. */
        if (result.data.length === 0 && result.total > 0 && params.page > 1) {
          setPage(Math.max(1, Math.ceil(result.total / params.limit)));
        }
      } catch (err) {
        setData([]);
        setTotal(0);
        setSelectedKeys(new Set());
        onError?.(err);
      } finally {
        fetchingRef.current = false;
        setLoading(false);
        /* If params changed while this request was in-flight, re-fetch with latest params */
        if (pendingRef.current) {
          pendingRef.current = false;
          loadRef.current?.();
        }
      }
    },
    [
      buildParamsKey,
      fetchData,
      debouncedSearch,
      activeFilters,
      sort,
      page,
      pageSize,
      keyExtractor,
      onError,
    ]
  );

  useEffect(() => {
    loadRef.current = () => load();
  }, [load]);

  /* ── Selection ── */
  const allSelected = data.length > 0 && data.every((row) => selectedKeys.has(keyExtractor(row)));
  const someSelected = selectedKeys.size > 0 && !allSelected;

  const toggleRow = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedKeys(allSelected ? new Set() : new Set(data.map(keyExtractor)));
  };

  const clearSelection = () => setSelectedKeys(new Set());

  /* ── Drag & drop ordering ── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const reorderEnabled =
    !!reorder &&
    !isStatic &&
    sort === reorder.sortValue &&
    !hasActiveFilters &&
    totalPages === 1 &&
    !loading;
  const rowIds = data.map(keyExtractor);

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!reorder || !over || active.id === over.id) return;
    const from = rowIds.indexOf(String(active.id));
    const to = rowIds.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const previous = data;
    const next = arrayMove(previous, from, to);
    setData(next);
    try {
      await reorder.onReorder(next);
    } catch {
      setData(previous);
    }
  };

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
  const tableEl = (
    <table
      className="w-full border-collapse"
      style={{
        opacity: loading ? 0.4 : 1,
        transition: "opacity var(--duration-fast)",
      }}
    >
      <thead>
        <tr>
          {reorder && (
            <th className="sticky top-0 z-[1] bg-[var(--bg-secondary)] w-10 py-3 pl-4 pr-0 border-b border-[var(--border-subtle)]" />
          )}
          {selectable && (
            <th className="sticky top-0 z-[1] bg-[var(--bg-secondary)] w-12 py-3 px-4 border-b border-[var(--border-subtle)]">
              <input
                type="checkbox"
                className="w-3.5 h-3.5 pointer-coarse:w-5 pointer-coarse:h-5 accent-[var(--accent-primary)] cursor-pointer align-middle"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
                disabled={data.length === 0}
                aria-label={t("selection.selectAll")}
              />
            </th>
          )}
          {columns.map((col) => (
            <th
              key={col.key}
              className={`sticky top-0 z-[1] bg-[var(--bg-secondary)] text-left text-xs font-semibold text-[var(--text-muted)] py-3 px-4 border-b border-[var(--border-subtle)] font-primary uppercase tracking-[0.05em] ${
                col.align === "right" ? "text-right" : ""
              } ${col.hideBelow ? HIDE_BELOW_CLASS[col.hideBelow] : ""}`}
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
              colSpan={columns.length + (selectable ? 1 : 0) + (reorder ? 1 : 0)}
              className="py-10 px-4 text-center text-[var(--text-muted)] text-sm font-primary"
            >
              {typeof emptyMessage === "function"
                ? emptyMessage(hasActiveFilters)
                : (emptyMessage ?? t(hasActiveFilters ? "empty.filtered" : "empty.none"))}
            </td>
          </tr>
        )}
        {data.map((row) => {
          const rowKey = keyExtractor(row);
          const isSelected = selectedKeys.has(rowKey);
          const rowClass = `border-b border-[var(--border-subtle)] transition-opacity hover:bg-[var(--color-sage-cream)] ${
            isSelected ? "bg-[rgba(201,169,110,0.08)]" : ""
          }`;
          const cells = (
            <>
              {selectable && (
                <td className="py-3 px-4 align-middle">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 pointer-coarse:w-5 pointer-coarse:h-5 accent-[var(--accent-primary)] cursor-pointer align-middle"
                    checked={isSelected}
                    onChange={() => toggleRow(rowKey)}
                    aria-label={t("selection.selectRow")}
                  />
                </td>
              )}
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-3 px-4 text-sm text-[var(--text-primary)] font-primary align-middle ${
                    col.align === "right" ? "text-right" : ""
                  } ${col.hideBelow ? HIDE_BELOW_CLASS[col.hideBelow] : ""}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </>
          );
          return reorder ? (
            <SortableRow
              key={rowKey}
              id={rowKey}
              className={rowClass}
              disabled={!reorderEnabled}
              handleLabel={t(reorderEnabled ? "reorder.handle" : "reorder.disabled")}
            >
              {cells}
            </SortableRow>
          ) : (
            <tr key={rowKey} className={rowClass}>
              {cells}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="flex flex-col gap-6 flex-1 min-h-0">
      {/* ── Toolbar ── */}
      {(searchable || filters.length > 0 || sortOptions.length > 0) && (
        <div className="shrink-0 flex gap-3 items-end flex-wrap">
          {/* Search */}
          {searchable && (
            <label className="flex flex-col gap-0.75 flex-1 min-w-[min(100%,14rem)]">
              <span className="text-xs font-semibold text-[var(--text-muted)] font-primary">
                {t("search.label")}
              </span>
              <div className="flex items-center gap-2 bg-[var(--bg-secondary)] rounded-lg px-4 h-9 pointer-coarse:h-11">
                <Search size={14} className="text-[var(--text-muted)] shrink-0" />
                <input
                  placeholder={searchPlaceholder ?? t("search.placeholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 min-w-0 border-0 bg-transparent p-0 text-sm pointer-coarse:text-base font-primary text-[var(--text-primary)] outline-none"
                />
                {search && (
                  <button
                    type="button"
                    className="flex items-center justify-center w-6 h-6 pointer-coarse:w-9 pointer-coarse:h-9 border-0 rounded-sm bg-[var(--bg-elevated)] cursor-pointer text-[var(--text-muted)] shrink-0"
                    onClick={clearSearch}
                    title={t("search.clear")}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </label>
          )}

          {/* Filters */}
          {filters.map((fil) => {
            const val = activeFilters[fil.key] ?? "";
            const isActive = val !== (fil.defaultValue ?? "");
            return (
              <label key={fil.key} className="flex flex-col gap-0.75">
                <span className="text-xs font-semibold text-[var(--text-muted)] font-primary">
                  {fil.label}
                </span>
                <div className="flex gap-1 items-center">
                  <select
                    value={val}
                    onChange={(e) => setFilter(fil.key, e.target.value)}
                    className={selectClass}
                  >
                    <option value="">{t("filter.all")}</option>
                    {fil.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {isActive && (
                    <button
                      type="button"
                      className="flex items-center justify-center w-6 h-6 pointer-coarse:w-9 pointer-coarse:h-9 border-0 rounded-sm bg-[var(--bg-elevated)] cursor-pointer text-[var(--text-muted)] shrink-0"
                      onClick={() => resetFilter(fil.key, fil.defaultValue ?? "")}
                      title={t("filter.reset", { filter: fil.label.toLocaleLowerCase(locale) })}
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
              <span className="text-xs font-semibold text-[var(--text-muted)] font-primary">
                {t("sort.label")}
              </span>
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
                    className="flex items-center justify-center w-6 h-6 pointer-coarse:w-9 pointer-coarse:h-9 border-0 rounded-sm bg-[var(--bg-elevated)] cursor-pointer text-[var(--text-muted)] shrink-0"
                    onClick={() => {
                      setSort(defaultSort);
                      setPage(1);
                    }}
                    title={t("sort.reset")}
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>
            </label>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="relative bg-[var(--bg-secondary)] rounded-2xl overflow-hidden flex-1 min-h-0 flex flex-col">
        {loading && (
          <div className="absolute inset-0 bg-[rgba(251,248,241,0.5)] flex items-center justify-center z-10 rounded-2xl">
            <span className="text-sm text-[var(--text-muted)] font-primary">{t("loading")}</span>
          </div>
        )}
        {selectable && selectedKeys.size > 0 && (
          <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2 py-2 px-4 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
            <span className="text-xs font-semibold text-[var(--text-secondary)] font-primary">
              {t("selection.count", { count: selectedKeys.size })}
            </span>
            {renderBulkActions?.({
              keys: Array.from(selectedKeys),
              rows: data.filter((row) => selectedKeys.has(keyExtractor(row))),
              clear: clearSelection,
            })}
            <button
              type="button"
              className="ml-auto flex items-center justify-center w-7 h-7 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
              onClick={clearSelection}
              title={t("selection.clear")}
            >
              <X size={13} />
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-auto">
          {reorder ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
                {tableEl}
              </SortableContext>
            </DndContext>
          ) : (
            tableEl
          )}
        </div>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="shrink-0 flex justify-end items-center gap-5 flex-wrap">
          <span className="text-xs text-[var(--text-muted)] font-primary">
            {t.rich("pagination.showing", {
              from: Math.min((page - 1) * pageSize + 1, total),
              to: Math.min(page * pageSize, total),
              total,
              b: (chunks) => (
                <span className="font-semibold text-[var(--text-secondary)]">{chunks}</span>
              ),
            })}
          </span>

          <div className="flex items-center gap-1 flex-wrap">
            <button
              className="flex items-center justify-center w-8 h-8 pointer-coarse:w-11 pointer-coarse:h-11 border-0 rounded-sm bg-[var(--bg-secondary)] cursor-pointer text-[var(--text-secondary)] disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              title={t("pagination.previous")}
            >
              <ChevronLeft size={14} />
            </button>

            {getPageRange(page, totalPages).map((p, i) =>
              p === "..." ? (
                <span
                  key={`ellipsis-${i}`}
                  className="flex items-center justify-center w-8 h-8 pointer-coarse:w-6 text-xs text-[var(--text-disabled)] font-primary"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  className={`flex items-center justify-center w-8 h-8 pointer-coarse:w-11 pointer-coarse:h-11 border-0 rounded-sm cursor-pointer text-sm font-primary font-semibold transition-colors ${
                    p === page
                      ? "bg-[var(--accent-primary)] text-[var(--text-on-gold)]"
                      : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                  }`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              )
            )}

            <button
              className="flex items-center justify-center w-8 h-8 pointer-coarse:w-11 pointer-coarse:h-11 border-0 rounded-sm bg-[var(--bg-secondary)] cursor-pointer text-[var(--text-secondary)] disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              title={t("pagination.next")}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════ Forward Ref ════════════════════════════════ */

export const DataTable = forwardRef(DataTableInner) as <T extends { id?: string | number }>(
  props: DataTableProps<T> & { ref?: React.Ref<DataTableRef> }
) => ReturnType<typeof DataTableInner>;
