"use client";

import { useState, useMemo, useRef, type FormEvent } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, X, ImageIcon, Search } from "lucide-react";
import { useAdminProducts } from "@/src/hooks/use-admin-api";
import { useToast } from "@/src/app/_components/Toast";
import { RoleGuard } from "@/src/app/_components/RoleGuard";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRef,
} from "@/src/app/_components/DataTable";
import { PERMISSIONS } from "@/src/lib/permissions";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  fetchCollectionList,
  createCollection,
  updateCollection,
  deleteCollection,
} from "./_common/moduleSlice";
import { SEASONS, EMPTY_COLLECTION_FORM } from "./_common/constants";
import type { CollectionListResult } from "./_common/types";
import type { Collection } from "@/src/types/collection";

/* ═══════════════════════════════ Helpers ═══════════════════════════════ */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ═══════════════════════════════ Sub-components ═══════════════════════ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-0 border-b border-[var(--border-subtle)] pb-5 px-0 mx-0">
      <legend className="font-primary text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em] p-0 mb-4">
        {title}
      </legend>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  hint,
  required,
  span,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  span?: number;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1 ${span === 2 ? "col-span-2" : ""}`}>
      <span className="text-xs font-semibold text-[var(--text-secondary)] font-primary">
        {label}
        {required && <span className="text-[var(--accent-rose)]"> *</span>}
      </span>
      {children}
      {hint && (
        <span className="text-[10px] text-[var(--text-disabled)] font-primary italic">{hint}</span>
      )}
    </div>
  );
}

/* ═══════════════════════════════ Main Component ═══════════════════════ */

export default function CollectionsContent() {
  const { toast } = useToast();
  const tableRef = useRef<DataTableRef>(null);
  const dispatch = useAppDispatch();

  const { isCreating, isUpdating, total, items } = useAppSelector((s) => s.collections);
  const isSaving = isCreating || isUpdating;

  /* Derive unique seasons from loaded items for filter */
  const seasonOptions = useMemo(() => {
    const uniqueSeasons = [...new Set(items.map((item) => item.season).filter(Boolean))];
    return uniqueSeasons.map((s) => ({ value: s, label: s }));
  }, [items]);

  /* Products for multi-select (read-only SWR reference data) */
  const { products: allProducts } = useAdminProducts({ limit: 500 });

  /* ── fetchData for DataTable ── */
  const fetchCollections = async (params: DataTableFetchParams): Promise<CollectionListResult> => {
    return dispatch(
      fetchCollectionList({
        search: params.search || undefined,
        season: params.filters.season || undefined,
        sort: params.sort,
        page: params.page,
        limit: params.limit,
      })
    ).unwrap();
  };

  /* ── Columns ── */
  const columns: DataTableColumn<Collection>[] = useMemo(
    () => [
      {
        key: "collection",
        header: "Collection",
        render: (c) => (
          <div className="flex items-center gap-3">
            {c.image ? (
              <div className="relative w-12 h-9 shrink-0">
                <Image src={c.image} alt="" fill className="object-cover rounded-sm" sizes="48px" />
              </div>
            ) : (
              <div className="w-12 h-9 bg-[var(--bg-elevated)] rounded-sm flex items-center justify-center text-[var(--text-muted)] shrink-0">
                <ImageIcon size={14} />
              </div>
            )}
            <div>
              <p className="font-semibold">{c.name}</p>
              {c.subtitle && <p className="text-xs text-[var(--text-muted)]">{c.subtitle}</p>}
            </div>
          </div>
        ),
      },
      {
        key: "slug",
        header: "Slug",
        render: (c) => (
          <code className="text-xs bg-[var(--bg-elevated)] py-0.5 px-1.5 rounded-sm font-mono">
            {c.slug}
          </code>
        ),
      },
      {
        key: "season",
        header: "Season",
        render: (c) =>
          c.season ? (
            <span className="text-xs bg-[rgba(240,228,166,0.2)] text-[var(--color-honey)] py-0.5 px-2 rounded-full font-medium">
              {c.season}
            </span>
          ) : (
            <span className="text-[var(--text-disabled)] text-xs">—</span>
          ),
      },
      {
        key: "products",
        header: "Products",
        render: (c) => (
          <span className="text-xs bg-[rgba(143,163,180,0.12)] text-[var(--accent-blue)] py-0.5 px-2 rounded-full font-medium">
            {c.productIds?.length ?? 0} products
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (c) => (
          <div className="flex gap-1 justify-end">
            <RoleGuard permission={PERMISSIONS.COLLECTION_UPDATE}>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-secondary)]"
                onClick={() => openEdit(c)}
                title="Edit"
              >
                <Pencil size={14} />
              </button>
            </RoleGuard>
            <RoleGuard permission={PERMISSIONS.COLLECTION_DELETE}>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--accent-rose)]"
                onClick={() => handleDelete(c.id, c.name)}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </RoleGuard>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /* ── Form state ── */
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_COLLECTION_FORM);
  const [productSearch, setProductSearch] = useState("");

  /* Filter products by search */
  const filteredProducts = useMemo(() => {
    if (!productSearch) return allProducts;
    const s = productSearch.toLowerCase();
    return allProducts.filter(
      (p) => p.name.toLowerCase().includes(s) || p.slug.toLowerCase().includes(s)
    );
  }, [allProducts, productSearch]);

  /* ── Handlers ── */
  const resetForm = () => {
    setForm(EMPTY_COLLECTION_FORM);
    setProductSearch("");
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (c: Collection) => {
    setEditingId(c.id);
    setForm({
      slug: c.slug,
      name: c.name,
      subtitle: c.subtitle,
      description: c.description,
      image: c.image,
      productIds: Array.isArray(c.productIds) ? [...c.productIds] : [],
      season: c.season,
    });
    setProductSearch("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    resetForm();
  };

  /* ── CRUD (Redux dispatch) ── */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await dispatch(
          updateCollection({ id: editingId, body: form as unknown as Record<string, unknown> })
        ).unwrap();
        toast.success("Collection updated");
      } else {
        await dispatch(createCollection(form as unknown as Record<string, unknown>)).unwrap();
        toast.success("Collection created");
      }
      tableRef.current?.refresh();
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await dispatch(deleteCollection(id)).unwrap();
      toast.success("Deleted");
      tableRef.current?.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal">
            Collections
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-primary mt-1">
            {total} collection{total !== 1 ? "s" : ""}
          </p>
        </div>
        <RoleGuard permission={PERMISSIONS.COLLECTION_CREATE}>
          <button
            className="flex items-center gap-1.5 py-[10px] px-5 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-lg text-sm font-semibold font-primary cursor-pointer hover:opacity-90 transition-opacity"
            onClick={openCreate}
          >
            <Plus size={16} /> Add Collection
          </button>
        </RoleGuard>
      </div>

      <DataTable<Collection>
        tableRef={tableRef}
        columns={columns}
        fetchData={fetchCollections}
        searchPlaceholder="Name or slug..."
        filters={[
          {
            key: "season",
            label: "Season",
            options: seasonOptions,
          },
        ]}
      />

      {/* ═══════════════ MODAL FORM ═══════════════ */}
      {showModal && (
        <div
          className="fixed inset-0 bg-[rgba(10,10,8,0.5)] flex items-center justify-center z-100 p-6"
          onClick={closeModal}
        >
          <div
            className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-160 max-h-[85vh] overflow-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center py-5 px-6 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--bg-primary)] z-1">
              <h2 className="font-display text-lg text-[var(--text-heading)] font-normal m-0">
                {editingId ? "Edit Collection" : "New Collection"}
              </h2>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-muted)]"
                onClick={closeModal}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
              {/* ── Basic Info ── */}
              <Section title="Basic Info">
                <Field label="Name" required>
                  <input
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full"
                    value={form.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((p) => ({
                        ...p,
                        name: v,
                        slug: slugify(v),
                      }));
                    }}
                    required
                  />
                </Field>
                <Field label="Subtitle">
                  <input
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full"
                    value={form.subtitle}
                    onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                    placeholder="short tagline shown below name"
                  />
                </Field>
                <Field label="Season">
                  <input
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full"
                    value={form.season}
                    onChange={(e) => setForm((p) => ({ ...p, season: e.target.value }))}
                    list="season-list"
                    placeholder="pick from list or type your own"
                  />
                  <datalist id="season-list">
                    {SEASONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </Field>
              </Section>

              {/* ── Details ── */}
              <Section title="Details">
                <Field label="Cover Image URL" span={2}>
                  <input
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full"
                    value={form.image}
                    onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
                    placeholder="primary collection image URL"
                  />
                </Field>
                <Field label="Description" span={2}>
                  <textarea
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full resize-y"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="shown on collection page"
                  />
                </Field>
              </Section>

              {/* ── Products Multi-Select ── */}
              <Section title="Products">
                <Field label={`Add Products (${form.productIds.length} selected)`} span={2}>
                  <div className="flex gap-1.5 mb-2">
                    <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-3 flex-1">
                      <Search size={14} className="text-[var(--text-muted)] shrink-0" />
                      <input
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="flex-1 border-0 bg-transparent py-2 px-0 text-xs font-primary text-[var(--text-primary)] outline-none"
                      />
                    </div>
                  </div>

                  {/* Selected products */}
                  {form.productIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {form.productIds.map((pid) => {
                        const prod = allProducts.find((p) => p.id === pid);
                        return (
                          <span
                            key={pid}
                            className="inline-flex items-center gap-0.5 py-0.5 px-1.5 rounded-full bg-[rgba(163,177,138,0.15)] text-[var(--accent-sage)] text-[11px] font-medium border border-[rgba(163,177,138,0.25)]"
                          >
                            {prod?.images?.[0] && (
                              <div className="relative w-3.5 h-4.5 shrink-0">
                                <Image
                                  src={prod.images[0]}
                                  alt=""
                                  fill
                                  className="object-cover rounded-xs"
                                  sizes="14px"
                                />
                              </div>
                            )}
                            <span className="text-[11px] max-w-24 overflow-hidden text-ellipsis whitespace-nowrap">
                              {prod?.name ?? pid}
                            </span>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-3.5 h-3.5 border-0 bg-transparent cursor-pointer text-[var(--accent-sage)]/60 p-0 rounded-full shrink-0"
                              onClick={() =>
                                setForm((p) => ({
                                  ...p,
                                  productIds: p.productIds.filter((id) => id !== pid),
                                }))
                              }
                            >
                              <X size={9} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Available products */}
                  <div className="max-h-50 overflow-auto border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)]">
                    {filteredProducts.length === 0 ? (
                      <p className="p-4 text-xs text-[var(--text-muted)] text-center">
                        No products found.
                      </p>
                    ) : (
                      filteredProducts.slice(0, 50).map((p) => {
                        const selected = form.productIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className={`flex items-center gap-3 py-2 px-3 w-full border-0 border-b border-[var(--border-subtle)] cursor-pointer transition-colors text-left ${
                              selected
                                ? "bg-[var(--accent-sage)] text-white"
                                : "bg-transparent hover:bg-[var(--bg-elevated)]"
                            }`}
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                productIds: selected
                                  ? prev.productIds.filter((id) => id !== p.id)
                                  : [...prev.productIds, p.id],
                              }))
                            }
                          >
                            {p.images?.[0] ? (
                              <div className="relative w-7 h-9 shrink-0">
                                <Image
                                  src={p.images[0]}
                                  alt=""
                                  fill
                                  className="object-cover rounded-sm"
                                  sizes="28px"
                                />
                              </div>
                            ) : (
                              <div className="w-7 h-9 bg-[var(--bg-elevated)] rounded-sm flex items-center justify-center shrink-0">
                                <ImageIcon size={10} className="text-[var(--text-disabled)]" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div
                                className={`text-xs font-medium overflow-hidden text-ellipsis whitespace-nowrap ${
                                  selected ? "text-white" : "text-[var(--text-primary)]"
                                }`}
                              >
                                {p.name}
                              </div>
                              <div
                                className={`text-[10px] ${
                                  selected ? "text-white/70" : "text-[var(--text-muted)]"
                                }`}
                              >
                                {p.category?.slug ?? "—"} — ${Number(p.price).toFixed(2)}
                              </div>
                            </div>
                            {selected && (
                              <span className="text-xs font-semibold text-white shrink-0">✓</span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </Field>
              </Section>

              {/* ── Actions ── */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  className="py-2 px-4 bg-[var(--bg-elevated)] border-0 rounded-sm text-sm font-primary text-[var(--text-secondary)] cursor-pointer"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-sm text-sm font-semibold font-primary cursor-pointer disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : editingId ? "Update Collection" : "Create Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
