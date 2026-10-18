"use client";

import { useState, useMemo, useRef, type FormEvent } from "react";
import Image from "next/image";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, X, ImageIcon, Star } from "lucide-react";
import { useAdminCategories } from "@/src/hooks/use-admin-api";
import { useMoney } from "@/src/hooks/use-money";
import { maskVndInput, moneyOf, parseVndInput } from "@/src/lib/money";
import MoneyText from "@/src/app/[locale]/_components/MoneyText";
import VndInput from "@/src/app/[locale]/_components/VndInput";
import { LIST_MAX_LIMIT } from "@/src/lib/list-query";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useSortOptions } from "@/src/hooks/use-sort-options";
import { useConfirm } from "@/src/app/[locale]/_components/ConfirmDialog";
import { RoleGuard } from "@/src/app/[locale]/_components/RoleGuard";
import { ImageListField } from "@/src/app/[locale]/_components/ImageListField";
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
  fetchProductList,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./_common/moduleSlice";
import {
  PRODUCT_MIN_RATINGS,
  PRODUCT_SORT_OPTIONS,
  SIZE_GROUPS,
  TAG_SUGGESTIONS,
  EMPTY_FORM,
  MIN_PRICE_VND,
  MAX_PRICE_VND,
} from "./_common/constants";
import type { ProductListResult } from "./_common/types";
import type { Product, ProductColor } from "@/src/types/product";
import {
  PRODUCT_BADGES,
  PRODUCT_STATUSES,
  type ProductBadge,
  type ProductStatus,
} from "@/src/types/enums";
import { ADMIN_BADGE_STYLES } from "@/src/lib/product-badge";
import type { Category, SubCategory } from "@/src/types/category";
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

/* ═══════════════════════════════ Status/Badge styles ═══════════════════ */

function statusStyle(s: string): string {
  return s === "active"
    ? "bg-[rgba(163,177,138,0.15)] text-[var(--accent-sage)]"
    : "bg-[rgba(107,101,96,0.1)] text-[var(--color-ash)]";
}

/* ═══════════════════════════════ Main Component ═══════════════════════ */

export default function ProductsContent() {
  const t = useTranslations("admin.products");
  const toErrorMessage = useErrorMessage();
  const tStatus = useTranslations("common.status");
  const tBadge = useTranslations("common.productBadge");
  const tCrud = useTranslations("admin.components.crud");
  const locale = useLocale();
  const format = useFormatter();
  const { fmtOrNull } = useMoney();
  const PRODUCT_TABS: FormTab[] = [
    { id: "general", label: t("form.tabs.general") },
    { id: "variants", label: t("form.tabs.variants") },
    { id: "images", label: t("form.tabs.images") },
  ];
  const sortOptions = useSortOptions(PRODUCT_SORT_OPTIONS);
  const { toast } = useToast();
  const confirm = useConfirm();
  const tableRef = useRef<DataTableRef>(null);
  const dispatch = useAppDispatch();

  const { isCreating, isUpdating, total } = useAppSelector((s) => s.products);
  const isSaving = isCreating || isUpdating;

  const { categories: catList } = useAdminCategories({ limit: LIST_MAX_LIMIT });

  /* ── fetchData for DataTable (Redux thunk) ── */
  const fetchProducts = async (params: DataTableFetchParams): Promise<ProductListResult> => {
    return dispatch(
      fetchProductList({
        search: params.search || undefined,
        category: params.filters.category || undefined,
        badge: (params.filters.badge || undefined) as ProductBadge | undefined,
        status: (params.filters.status || undefined) as ProductStatus | undefined,
        minRating: params.filters.minRating ? Number(params.filters.minRating) : undefined,
        sort: params.sort,
        page: params.page,
        limit: params.limit,
      })
    ).unwrap();
  };

  /* ── Column definitions ── */
  const columns: DataTableColumn<Product>[] = useMemo(
    () => [
      {
        key: "product",
        header: t("table.columns.product"),
        render: (p) => (
          <div className="flex items-center gap-3">
            {p.images?.[0] ? (
              <div className="relative w-10 h-12 shrink-0">
                <Image
                  src={toMediaUrl(p.images[0])}
                  alt=""
                  fill
                  className="object-cover rounded-sm"
                  sizes="40px"
                />
              </div>
            ) : (
              <div className="w-10 h-12 bg-[var(--bg-elevated)] rounded-sm flex items-center justify-center text-[var(--text-muted)] shrink-0">
                <ImageIcon size={14} />
              </div>
            )}
            <div>
              <p className="font-semibold text-sm">{p.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{p.slug}</p>
            </div>
          </div>
        ),
      },
      {
        key: "category",
        header: t("table.columns.category"),
        render: (p) => (
          <>
            <span className="text-xs text-[var(--accent-primary)] font-semibold">
              {p.category?.slug ?? "—"}
            </span>
            {p.subcategory?.slug && (
              <span className="text-xs text-[var(--text-muted)]"> / {p.subcategory.slug}</span>
            )}
          </>
        ),
      },
      {
        key: "price",
        header: t("table.columns.price"),
        render: (p) => (
          <div className="flex flex-col gap-0.5">
            <MoneyText money={moneyOf(p, "price")} />
            {p.originalPriceVnd !== null && (
              <span className="text-xs text-[var(--text-muted)] line-through">{fmtOrNull(p, "originalPrice")}</span>
            )}
          </div>
        ),
      },
      {
        key: "status",
        header: t("table.columns.status"),
        render: (p) => (
          <span
            className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary ${statusStyle(p.status)}`}
          >
            {tStatus.has(p.status as never) ? tStatus(p.status as never) : p.status}
          </span>
        ),
      },
      {
        key: "badge",
        header: t("table.columns.badge"),
        render: (p) =>
          p.badge ? (
            <span
              className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary ${ADMIN_BADGE_STYLES[p.badge] ?? ""}`}
            >
              {tBadge(p.badge)}
            </span>
          ) : (
            <span className="text-[var(--text-disabled)]">—</span>
          ),
      },
      {
        key: "rating",
        header: t("table.columns.rating"),
        hideBelow: "md",
        render: (p) =>
          p.ratingAverage != null && p.ratingCount > 0 ? (
            <span className="inline-flex flex-col gap-0.5 whitespace-nowrap">
              <span className="inline-flex items-center gap-1 text-sm font-semibold">
                <Star size={12} fill="currentColor" className="text-[var(--color-champagne-gold)]" aria-hidden="true" />
                {format.number(p.ratingAverage, "decimal1")}
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">{t("table.reviewCount", { count: p.ratingCount })}</span>
            </span>
          ) : (
            <span className="text-xs text-[var(--text-disabled)]">{t("table.noReviews")}</span>
          ),
      },
      {
        key: "actions",
        header: t("table.columns.actions"),
        align: "right",
        render: (p) => (
          <div className="flex gap-1 justify-end">
            <RoleGuard permission={PERMISSIONS.PRODUCT_UPDATE}>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-secondary)] hover:opacity-70"
                onClick={() => openEdit(p)}
                title={tCrud("edit")}
              >
                <Pencil size={14} />
              </button>
            </RoleGuard>
            <RoleGuard permission={PERMISSIONS.PRODUCT_DELETE}>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--accent-rose)] hover:opacity-70"
                onClick={() => handleDelete(p.id, p.name)}
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
    [catList, locale, fmtOrNull]
  );

  /* ── Filter options ── */
  const categoryFilterOptions = useMemo(
    () =>
      catList
        .map((c) => ({ value: c.slug, label: c.slug }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [catList]
  );

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(PRODUCT_TABS[0].id);
  const [form, setForm] = useState(EMPTY_FORM);
  /* Errors of the price fields, shown under them; the BE would refuse the same values with a 400 */
  const [priceErrors, setPriceErrors] = useState<{ price?: boolean; originalPrice?: boolean }>({});  /* Color builder */
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#333333");
  /* Tag input */
  const [tagInput, setTagInput] = useState("");

  /* ── Derived data ── */
  const selectedCategory = useMemo<Category | undefined>(
    () => catList.find((c) => c.id === form.categoryId),
    [catList, form.categoryId]
  );
  const subcategoryOptions = useMemo<SubCategory[]>(
    () => selectedCategory?.subcategories ?? [],
    [selectedCategory]
  );

  /* ── Pre-computed <option> arrays ── */
  const categoryOptions = useMemo(
    () =>
      catList.map((c) => (
        <option key={c.id} value={c.id}>
          {c.title}
        </option>
      )),
    [catList]
  );
  const subcategorySelectOptions = useMemo(
    () =>
      subcategoryOptions.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      )),
    [subcategoryOptions]
  );

  /* ── Handlers ── */
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setColorName("");
    setColorHex("#333333");
    setTagInput("");
    setPriceErrors({});
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setActiveTab(PRODUCT_TABS[0].id);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      slug: p.slug,
      priceVnd: maskVndInput(String(p.priceVnd)),
      originalPriceVnd: p.originalPriceVnd !== null ? maskVndInput(String(p.originalPriceVnd)) : "",
      images: [...p.images],
      categoryId: p.category?.id ?? "",
      subcategoryId: p.subcategory?.id ? String(p.subcategory.id) : "",
      badge: p.badge,
      status: p.status,
      description: p.description,
      material: p.material,
      care: p.care,
      sizes: [...p.sizes],
      colors: [...p.colors],
      tags: [...p.tags],
    });
    setColorName("");
    setColorHex("#333333");
    setTagInput("");
    setPriceErrors({});
    setActiveTab(PRODUCT_TABS[0].id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    resetForm();
  };

  const addColor = () => {
    const name = colorName.trim();
    if (!name) return;
    if (form.colors.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error(t("toast.colorExists"));
      return;
    }
    setForm((p) => ({ ...p, colors: [...p.colors, { name, hex: colorHex }] }));
    setColorName("");
    setColorHex("#333333");
  };

  /* ── CRUD operations (Redux dispatch) ── */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (subcategoryOptions.length > 0 && !form.subcategoryId) {
      toast.error(t("toast.subcategoryRequired"));
      return;
    }

    /* Whole VND from 1 to 1.000.000.000; the struck-through price may not be below the price */
    const priceVnd = parseVndInput(form.priceVnd);
    const originalPriceVnd = form.originalPriceVnd ? parseVndInput(form.originalPriceVnd) : null;
    const priceInvalid = priceVnd === null || priceVnd < MIN_PRICE_VND || priceVnd > MAX_PRICE_VND;
    const originalInvalid =
      Boolean(form.originalPriceVnd) &&
      (originalPriceVnd === null ||
        originalPriceVnd > MAX_PRICE_VND ||
        (priceVnd !== null && originalPriceVnd < priceVnd));
    if (priceInvalid || originalInvalid) {
      setPriceErrors({ price: priceInvalid, originalPrice: originalInvalid });
      setActiveTab(PRODUCT_TABS[0].id);
      return;
    }
    setPriceErrors({});

    try {
      const { priceVnd: _price, originalPriceVnd: _original, ...rest } = form;
      const payload = {
        ...rest,
        priceVnd,
        originalPriceVnd,
        subcategoryId: form.subcategoryId || null,
      };
      if (editingId) {
        await dispatch(updateProduct({ id: editingId, body: payload })).unwrap();
        toast.success(t("toast.updated"));
      } else {
        await dispatch(createProduct(payload)).unwrap();
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
      await dispatch(deleteProduct(id)).unwrap();
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
        <RoleGuard permission={PERMISSIONS.PRODUCT_CREATE}>
          <button
            className="flex items-center gap-1.5 py-[10px] px-5 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-lg text-sm font-semibold font-primary cursor-pointer hover:opacity-90 transition-opacity"
            onClick={openCreate}
          >
            <Plus size={16} /> {t("page.add")}
          </button>
        </RoleGuard>
      </div>

      <DataTable<Product>
        tableRef={tableRef}
        columns={columns}
        fetchData={fetchProducts}
        searchPlaceholder={t("table.searchPlaceholder")}
        filters={[
          { key: "category", label: t("table.filters.category"), options: categoryFilterOptions },
          {
            key: "status",
            label: t("table.filters.status"),
            options: PRODUCT_STATUSES.map((s) => ({ value: s, label: tStatus(s) })),
          },
          {
            key: "badge",
            label: t("table.filters.badge"),
            options: PRODUCT_BADGES.map((b) => ({ value: b, label: tBadge(b) })),
          },
          {
            key: "minRating",
            label: t("table.filters.minRating"),
            options: PRODUCT_MIN_RATINGS.map((stars) => ({ value: String(stars), label: t("table.filterOptions.minRating", { stars }) })),
          },
        ]}
        sortOptions={sortOptions}
        defaultSort="-createdAt"
      />

      {/* ═══════════════════════════ MODAL FORM ═══════════════════════════ */}
      {showModal && (
        <ModalShell
          title={editingId ? t("form.titleEdit") : t("form.titleCreate")}
          onClose={closeModal}
          maxWidthClass="max-w-160"
        >
          <FormTabs tabs={PRODUCT_TABS} active={activeTab} onChange={setActiveTab} />

          <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
            <ModalBody>
              {/* ── General ── */}
              {activeTab === "general" && (
                <>
                  <FormSection title={t("form.sections.basic")}>
                    <FormField label={t("form.fields.name")} required>
                      <input
                        className={inputClass}
                        value={form.name}
                        placeholder={t("form.placeholders.name")}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((p) => ({ ...p, name: v, slug: slugify(v) }));
                        }}
                        required
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

                  <FormSection title={t("form.sections.pricing")}>
                    <FormField label={t("form.fields.price")} required info={t("form.info.price")}>
                      <VndInput
                        value={form.priceVnd}
                        onChange={(value) => {
                          setForm((p) => ({ ...p, priceVnd: value }));
                          setPriceErrors((prev) => ({ ...prev, price: false }));
                        }}
                        onReject={() => setPriceErrors((prev) => ({ ...prev, price: true }))}
                        aria-invalid={priceErrors.price || undefined}
                        placeholder={t("form.placeholders.price")}
                        required
                      />
                      {priceErrors.price && (
                        <p role="alert" className="m-0 text-xs text-[var(--accent-rose)] font-primary">
                          {t("form.errors.price")}
                        </p>
                      )}
                    </FormField>
                    <FormField
                      label={t("form.fields.originalPrice")}
                      info={t("form.info.originalPrice")}
                    >
                      <VndInput
                        value={form.originalPriceVnd}
                        onChange={(value) => {
                          setForm((p) => ({ ...p, originalPriceVnd: value }));
                          setPriceErrors((prev) => ({ ...prev, originalPrice: false }));
                        }}
                        onReject={() => setPriceErrors((prev) => ({ ...prev, originalPrice: true }))}
                        aria-invalid={priceErrors.originalPrice || undefined}
                      />
                      {priceErrors.originalPrice && (
                        <p role="alert" className="m-0 text-xs text-[var(--accent-rose)] font-primary">
                          {t("form.errors.originalPrice")}
                        </p>
                      )}
                    </FormField>
                  </FormSection>

                  <FormSection title={t("form.sections.classification")}>
                    <FormField label={t("form.fields.category")} required>
                      <select
                        className={inputClass}
                        value={form.categoryId}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, categoryId: e.target.value, subcategoryId: "" }))
                        }
                        required
                      >
                        <option value="">{t("form.options.selectCategory")}</option>
                        {categoryOptions}
                      </select>
                    </FormField>
                    <FormField label={t("form.fields.subcategory")}>
                      <select
                        className={inputClass}
                        value={form.subcategoryId}
                        onChange={(e) => setForm((p) => ({ ...p, subcategoryId: e.target.value }))}
                        disabled={!form.categoryId || subcategoryOptions.length === 0}
                      >
                        <option value="">{t("form.options.noneDash")}</option>
                        {subcategorySelectOptions}
                      </select>
                    </FormField>
                    <FormField label={t("form.fields.status")} info={t("form.info.status")}>
                      <select
                        className={inputClass}
                        value={form.status}
                        onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ProductStatus }))}
                      >
                        {PRODUCT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {tStatus(s)}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label={t("form.fields.badge")}>
                      <select
                        className={inputClass}
                        value={form.badge ?? ""}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, badge: (e.target.value || null) as ProductBadge | null }))
                        }
                      >
                        <option value="">{t("form.options.none")}</option>
                        {PRODUCT_BADGES.map((b) => (
                          <option key={b} value={b}>
                            {tBadge(b)}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </FormSection>
                </>
              )}

              {/* ── Variants & Tags ── */}
              {activeTab === "variants" && (
                <FormSection>
                  <FormField label={t("form.fields.sizes")}>
                    <div className="flex flex-col gap-1">
                      {form.sizes.length > 0 && (
                        <button
                          type="button"
                          className="self-start inline-flex items-center gap-1 py-0.5 px-2 bg-transparent border-0 rounded-sm text-[10px] font-primary text-[var(--text-muted)] cursor-pointer"
                          onClick={() => setForm((p) => ({ ...p, sizes: [] }))}
                        >
                          {t("form.sizes.clearAll", { count: form.sizes.length })}
                          <X size={10} />
                        </button>
                      )}
                      {SIZE_GROUPS.map((group) => (
                        <div key={group.key} className="mb-2">
                          <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1 block">
                            {t(`form.sizes.groups.${group.key}`)}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {group.sizes.map((size) => {
                              const active = form.sizes.includes(size);
                              return (
                                <button
                                  key={size}
                                  type="button"
                                  className={`inline-flex items-center gap-1 py-[5px] px-3 rounded-full text-xs font-primary cursor-pointer border-0 transition-all ${
                                    active
                                      ? "bg-[var(--accent-sage)] text-white px-2 font-semibold cursor-default"
                                      : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                                  }`}
                                  onClick={() =>
                                    setForm((p) => ({
                                      ...p,
                                      sizes: active
                                        ? p.sizes.filter((s) => s !== size)
                                        : [...p.sizes, size],
                                    }))
                                  }
                                >
                                  {size}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <input
                        className="py-1.5 px-2.5 border-0 border-b border-[var(--border-light)] rounded-none text-xs font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full"
                        placeholder={t("form.placeholders.customSize")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const v = (e.target as HTMLInputElement).value.trim().toUpperCase();
                            if (v && !form.sizes.includes(v)) {
                              setForm((p) => ({ ...p, sizes: [...p.sizes, v] }));
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                    </div>
                  </FormField>

                  <FormField label={t("form.fields.colors")}>
                    <div className="flex gap-2 mb-2.5 items-end">
                      <input
                        className="py-1.5 px-2.5 border-0 border-b border-[var(--border-light)] rounded-none text-xs font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none flex-1"
                        placeholder={t("form.placeholders.colorName")}
                        value={colorName}
                        onChange={(e) => setColorName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addColor();
                          }
                        }}
                      />
                      <input
                        type="color"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        className="w-10 h-9 border border-[var(--border-light)] rounded-sm cursor-pointer p-0.5 bg-none shrink-0"
                      />
                      <button
                        type="button"
                        className="flex items-center justify-center w-8.5 h-8.5 border-0 rounded-sm bg-[var(--bg-elevated)] cursor-pointer text-[var(--accent-primary)] shrink-0 self-end"
                        onClick={addColor}
                        aria-label={t("form.colors.add")}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    {form.colors.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {form.colors.map((c, i) => (
                          <span
                            key={`${c.name}-${c.hex}`}
                            className="inline-flex items-center gap-1 py-[5px] px-2 rounded-full bg-[var(--accent-sage)] text-white text-xs font-semibold cursor-default"
                          >
                            <span
                              className="inline-block w-4 h-4 rounded-sm border border-black/15 shrink-0"
                              style={{ background: c.hex }}
                            />
                            <span className="text-xs font-medium">{c.name}</span>
                            <code className="text-[10px] text-white/70">{c.hex}</code>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-4 h-4 border-0 bg-transparent cursor-pointer text-white/70 p-0 ml-0.5 rounded-full shrink-0"
                              aria-label={t("form.colors.remove", { name: c.name })}
                              onClick={() =>
                                setForm((p) => ({
                                  ...p,
                                  colors: p.colors.filter((_, j) => j !== i),
                                }))
                              }
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] italic">
                        {t("form.colors.empty")}
                      </p>
                    )}
                  </FormField>

                  <FormField label={t("form.fields.material")}>
                    <input
                      className={inputClass}
                      value={form.material}
                      onChange={(e) => setForm((p) => ({ ...p, material: e.target.value }))}
                      placeholder={t("form.placeholders.material")}
                    />
                  </FormField>
                  <FormField label={t("form.fields.care")}>
                    <input
                      className={inputClass}
                      value={form.care}
                      onChange={(e) => setForm((p) => ({ ...p, care: e.target.value }))}
                      placeholder={t("form.placeholders.care")}
                    />
                  </FormField>

                  <FormField label={t("form.fields.tags")}>
                    <div className="flex flex-wrap gap-1.5">
                      {TAG_SUGGESTIONS.filter((suggestion) => !form.tags.includes(suggestion)).map(
                        (tag) => (
                          <button
                            key={tag}
                            type="button"
                            className="inline-flex items-center gap-1 py-[5px] px-2.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] text-[11px] font-primary cursor-pointer border-0 transition-all"
                            onClick={() => setForm((p) => ({ ...p, tags: [...p.tags, tag] }))}
                          >
                            + {tag}
                          </button>
                        )
                      )}
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <input
                        className="py-1.5 px-2.5 border-0 border-b border-[var(--border-light)] rounded-none text-xs font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none flex-1"
                        placeholder={t("form.placeholders.tag")}
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const v = tagInput.trim().toLowerCase();
                            if (v && !form.tags.includes(v)) {
                              setForm((p) => ({ ...p, tags: [...p.tags, v] }));
                              setTagInput("");
                            }
                          }
                        }}
                      />
                    </div>
                    {form.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {form.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 py-[5px] px-2 rounded-full bg-[var(--accent-sage)] text-white text-xs font-semibold cursor-default"
                          >
                            {tag}
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-4 h-4 border-0 bg-transparent cursor-pointer text-white/70 p-0 ml-0.5 rounded-full shrink-0"
                              aria-label={t("form.tagsRemove", { tag })}
                              onClick={() =>
                                setForm((p) => ({ ...p, tags: p.tags.filter((x) => x !== tag) }))
                              }
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </FormField>
                </FormSection>
              )}

              {/* ── Images ── */}
              {activeTab === "images" && (
                <FormSection>
                  <FormField label={t("form.fields.images")} info={t("form.info.images")}>
                    <ImageListField
                      value={form.images}
                      onChange={(images) => setForm((p) => ({ ...p, images }))}
                    />
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
