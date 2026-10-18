"use client";

import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useMoney } from "@/src/hooks/use-money";
import { Plus, Pencil, Trash2, X, ImageIcon, Search } from "lucide-react";
import { useAdminProducts } from "@/src/hooks/use-admin-api";
import { LIST_MAX_LIMIT } from "@/src/lib/list-query";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useSortOptions } from "@/src/hooks/use-sort-options";
import { useConfirm } from "@/src/app/[locale]/_components/ConfirmDialog";
import { RoleGuard } from "@/src/app/[locale]/_components/RoleGuard";
import { ImageUrlField } from "@/src/app/[locale]/_components/ImageUrlField";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRef,
} from "@/src/app/[locale]/_components/DataTable";
import {
  ModalShell,
  ModalBody,
  FormTabs,
  FormSection,
  FormField,
  FormActions,
  inputClass,
  type FormTab,
} from "@/src/app/[locale]/_components/AdminFormKit";
import { PERMISSIONS } from "@/src/lib/permissions";
import { useErrorMessage } from "@/src/i18n/use-error-message";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  fetchCollectionList,
  createCollection,
  updateCollection,
  deleteCollection,
} from "./_common/moduleSlice";
import { SEASONS, EMPTY_COLLECTION_FORM, COLLECTION_SORT_OPTIONS } from "./_common/constants";
import type { CollectionListResult } from "./_common/types";
import type { Collection } from "@/src/types/collection";
import { toMediaUrl } from "@/src/lib/media-url";

/* ═══════════════════════════════ Helpers ═══════════════════════════════ */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ═══════════════════════════════ Main Component ═══════════════════════ */

export default function CollectionsContent() {
  const t = useTranslations("admin.collections");
  const toErrorMessage = useErrorMessage();
  const tCrud = useTranslations("admin.components.crud");
  const sortOptions = useSortOptions(COLLECTION_SORT_OPTIONS);
  const locale = useLocale();
  const { fmt } = useMoney();
  const COLLECTION_TABS: FormTab[] = [
    { id: "info", label: t("form.tabs.info") },
    { id: "products", label: t("form.tabs.products") },
  ];
  const { toast } = useToast();
  const confirm = useConfirm();
  const tableRef = useRef<DataTableRef>(null);
  const dispatch = useAppDispatch();

  const { isCreating, isUpdating, total, items } = useAppSelector((s) => s.collections);
  const isSaving = isCreating || isUpdating;

  /* Season filter options: the known seasons plus every one seen in a loaded page. They only ever
     grow — building them from the current (filtered) page alone would collapse the list to the
     selected season and make it impossible to switch to another one. */
  const [seasons, setSeasons] = useState<string[]>([...SEASONS]);
  useEffect(() => {
    setSeasons((prev) => {
      const next = new Set(prev);
      for (const item of items) if (item.season) next.add(item.season);
      return next.size === prev.length ? prev : [...next];
    });
  }, [items]);
  const seasonOptions = useMemo(() => seasons.map((s) => ({ value: s, label: s })), [seasons]);

  /* Products for multi-select (read-only SWR reference data) */
  const { products: allProducts } = useAdminProducts({ limit: LIST_MAX_LIMIT });

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
        header: t("table.columns.collection"),
        render: (c) => (
          <div className="flex items-center gap-3">
            {c.image ? (
              <div className="relative w-12 h-9 shrink-0">
                <Image src={toMediaUrl(c.image)} alt="" fill className="object-cover rounded-sm" sizes="48px" />
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
        key: "season",
        header: t("table.columns.season"),
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
        header: t("table.columns.products"),
        render: (c) => (
          <span className="text-xs bg-[rgba(143,163,180,0.12)] text-[var(--accent-blue)] py-0.5 px-2 rounded-full font-medium">
            {t("table.productCount", { count: c.productIds?.length ?? 0 })}
          </span>
        ),
      },
      {
        key: "actions",
        header: t("table.columns.actions"),
        align: "right",
        render: (c) => (
          <div className="flex gap-1 justify-end">
            <RoleGuard permission={PERMISSIONS.COLLECTION_UPDATE}>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-secondary)]"
                onClick={() => openEdit(c)}
                title={tCrud("edit")}
              >
                <Pencil size={14} />
              </button>
            </RoleGuard>
            <RoleGuard permission={PERMISSIONS.COLLECTION_DELETE}>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--accent-rose)]"
                onClick={() => handleDelete(c.id, c.name)}
                title={tCrud("delete")}
              >
                <Trash2 size={14} />
              </button>
            </RoleGuard>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );

  /* ── Form state ── */
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(COLLECTION_TABS[0].id);
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
    setActiveTab(COLLECTION_TABS[0].id);
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
    setActiveTab(COLLECTION_TABS[0].id);
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
        toast.success(t("toast.updated"));
      } else {
        await dispatch(createCollection(form as unknown as Record<string, unknown>)).unwrap();
        toast.success(t("toast.created"));
      }
      tableRef.current?.refresh();
      closeModal();
    } catch (err) {
      toast.error(toErrorMessage(err, t("toast.saveFailed")));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title: t("confirmDelete.title"),
      message: t("confirmDelete.message", { name }),
      confirmLabel: tCrud("delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await dispatch(deleteCollection(id)).unwrap();
      toast.success(t("toast.deleted"));
      tableRef.current?.refresh();
    } catch (err) {
      toast.error(toErrorMessage(err, t("toast.deleteFailed")));
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      {/* ── Header ── */}
      <div className="shrink-0 flex justify-between items-start">
        <div>
          <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal">
            {t("page.title")}
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-primary mt-1">
            {t("page.count", { count: total })}
          </p>
        </div>
        <RoleGuard permission={PERMISSIONS.COLLECTION_CREATE}>
          <button
            className="flex items-center gap-1.5 py-[10px] px-5 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-lg text-sm font-semibold font-primary cursor-pointer hover:opacity-90 transition-opacity"
            onClick={openCreate}
          >
            <Plus size={16} /> {t("page.add")}
          </button>
        </RoleGuard>
      </div>

      <DataTable<Collection>
        tableRef={tableRef}
        columns={columns}
        fetchData={fetchCollections}
        searchPlaceholder={t("table.searchPlaceholder")}
        filters={[
          {
            key: "season",
            label: t("table.filters.season"),
            options: seasonOptions,
          },
        ]}
        sortOptions={sortOptions}
      />

      {/* ═══════════════ MODAL FORM ═══════════════ */}
      {showModal && (
        <ModalShell title={editingId ? t("form.titleEdit") : t("form.titleCreate")} onClose={closeModal}>
          <FormTabs tabs={COLLECTION_TABS} active={activeTab} onChange={setActiveTab} />

          <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
            <ModalBody>
              {activeTab === "info" && (
                <>
                  <FormSection title={t("form.sections.basic")}>
                    <FormField label={t("form.fields.name")} required>
                      <input
                        className={inputClass}
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
                    </FormField>
                    <FormField label={t("form.fields.subtitle")} info={t("form.subtitleInfo")}>
                      <input
                        className={inputClass}
                        value={form.subtitle}
                        onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                      />
                    </FormField>
                    <FormField label={t("form.fields.season")}>
                      <input
                        className={inputClass}
                        value={form.season}
                        onChange={(e) => setForm((p) => ({ ...p, season: e.target.value }))}
                        list="season-list"
                        placeholder={t("form.placeholders.season")}
                      />
                      <datalist id="season-list">
                        {SEASONS.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </FormField>
                  </FormSection>

                  <FormSection title={t("form.sections.details")}>
                    <FormField label={t("form.fields.coverImage")}>
                      <ImageUrlField
                        value={form.image}
                        onChange={(url) => setForm((p) => ({ ...p, image: url }))}
                        placeholder={t("form.placeholders.coverImage")}
                      />
                    </FormField>
                    <FormField label={t("form.fields.description")}>
                      <textarea
                        className={`${inputClass} resize-y`}
                        rows={3}
                        value={form.description}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                        placeholder={t("form.placeholders.description")}
                      />
                    </FormField>
                  </FormSection>
                </>
              )}

              {activeTab === "products" && (
                <FormSection>
                  <FormField label={t("products.addLabel", { count: form.productIds.length })}>
                    <div className="flex gap-1.5 mb-2">
                      <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-3 flex-1">
                        <Search size={14} className="text-[var(--text-muted)] shrink-0" />
                        <input
                          placeholder={t("products.searchPlaceholder")}
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
                                    src={toMediaUrl(prod.images[0])}
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
                                aria-label={t("products.removeProduct", { name: prod?.name ?? pid })}
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
                          {t("products.empty")}
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
                                    src={toMediaUrl(p.images[0])}
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
                                  {p.category?.slug ?? "—"} — {fmt(p, "price")}
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
                  </FormField>
                </FormSection>
              )}
            </ModalBody>

            <FormActions
              onCancel={closeModal}
              isSaving={isSaving}
              submitLabel={editingId ? t("form.submitUpdate") : t("form.submitCreate")}
            />
          </form>
        </ModalShell>
      )}
    </div>
  );
}
