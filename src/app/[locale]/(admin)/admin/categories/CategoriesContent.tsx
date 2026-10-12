"use client";

import { useState, useMemo, useRef, type FormEvent } from "react";
import { Plus, Pencil, Trash2, X, FolderTree } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "@/src/app/[locale]/_components/Toast";
import { useConfirm } from "@/src/app/[locale]/_components/ConfirmDialog";
import { RoleGuard } from "@/src/app/[locale]/_components/RoleGuard";
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
import { ImageUrlField } from "@/src/app/[locale]/_components/ImageUrlField";
import { PERMISSIONS } from "@/src/lib/permissions";
import { errorMessage } from "@/src/i18n/error-message";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  fetchCategoryList,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchNextCategoryPriority,
  reorderCategories,
} from "./_common/moduleSlice";
import {
  EMPTY_CATEGORY_FORM,
  CATEGORY_SORT_OPTIONS,
  CATEGORY_PRIORITY_SORT,
  CATEGORY_PAGE_SIZE,
} from "./_common/constants";
import type { CategoryListResult } from "./_common/types";
import type { Category } from "@/src/types/category";

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

export default function CategoriesContent() {
  const t = useTranslations("admin.categories");
  const tCrud = useTranslations("admin.components.crud");
  const locale = useLocale();
  const CATEGORY_TABS: FormTab[] = [
    { id: "info", label: t("form.tabs.info") },
    { id: "subcategories", label: t("form.tabs.subcategories") },
  ];
  const sortOptions = CATEGORY_SORT_OPTIONS.map((o) => ({
    value: o.value,
    label:
      o.key === "newest" || o.key === "oldest" ? tCrud(`sort.${o.key}`) : t(`table.sort.${o.key}`),
  }));
  const { toast } = useToast();
  const confirm = useConfirm();
  const tableRef = useRef<DataTableRef>(null);
  const dispatch = useAppDispatch();

  const { isCreating, isUpdating, total } = useAppSelector((s) => s.categories);
  const isSaving = isCreating || isUpdating;

  /* ── fetchData for DataTable ── */
  const fetchCategories = async (params: DataTableFetchParams): Promise<CategoryListResult> => {
    return dispatch(
      fetchCategoryList({
        search: params.search || undefined,
        sort: params.sort,
        page: params.page,
        limit: params.limit,
      })
    ).unwrap();
  };

  /* ── Columns ── */
  const columns: DataTableColumn<Category>[] = useMemo(
    () => [
      {
        key: "priority",
        header: t("table.columns.priority"),
        width: "90px",
        render: (c) => <span className="text-[var(--text-muted)] tabular-nums">{c.priority}</span>,
      },
      {
        key: "title",
        header: t("table.columns.title"),
        render: (c) => <span className="font-semibold">{c.title}</span>,
      },
      {
        key: "subcategories",
        header: t("table.columns.subcategories"),
        render: (c) => (
          <div className="flex gap-1 flex-wrap">
            {c.subcategories && c.subcategories.length > 0 ? (
              c.subcategories.map((s) => (
                <span
                  key={s.id}
                  className="text-xs bg-[rgba(184,165,200,0.12)] text-[var(--accent-lavender)] py-0.5 px-1.5 rounded-sm font-medium"
                >
                  {s.label}
                </span>
              ))
            ) : (
              <span className="text-[var(--text-disabled)] text-xs">—</span>
            )}
          </div>
        ),
      },
      {
        key: "description",
        header: t("table.columns.description"),
        render: (c) => (
          <span className="text-xs text-[var(--text-muted)]">
            {c.description
              ? c.description.length > 50
                ? c.description.slice(0, 50) + "..."
                : c.description
              : "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: t("table.columns.actions"),
        align: "right",
        render: (c) => (
          <div className="flex gap-1 justify-end">
            <RoleGuard permission={PERMISSIONS.CATEGORY_UPDATE}>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-secondary)]"
                onClick={() => openEdit(c)}
                title={tCrud("edit")}
              >
                <Pencil size={14} />
              </button>
            </RoleGuard>
            <RoleGuard permission={PERMISSIONS.CATEGORY_DELETE}>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--accent-rose)]"
                onClick={() => handleDelete(c.id, c.title)}
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
  const [activeTab, setActiveTab] = useState<string>(CATEGORY_TABS[0].id);
  const [form, setForm] = useState(EMPTY_CATEGORY_FORM);
  const [nextPriority, setNextPriority] = useState<number | null>(null);

  /* ── Subcategory helpers ── */
  const addSub = () =>
    setForm((p) => ({
      ...p,
      subcategories: [
        ...p.subcategories,
        { id: 0, slug: "", label: "", description: "", count: 0 },
      ],
    }));

  const updSub = (i: number, field: string, value: string) =>
    setForm((p) => {
      const s = [...p.subcategories];
      (s[i] as unknown as Record<string, unknown>)[field] = value;
      return { ...p, subcategories: s };
    });

  const rmSub = (i: number) =>
    setForm((p) => ({ ...p, subcategories: p.subcategories.filter((_, j) => j !== i) }));

  /* ── Handlers ── */
  const resetForm = () => setForm(EMPTY_CATEGORY_FORM);

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setActiveTab(CATEGORY_TABS[0].id);
    setShowModal(true);
    /* Display only — the BE assigns the real rank (next in line) on create. */
    setNextPriority(null);
    dispatch(fetchNextCategoryPriority())
      .unwrap()
      .then(setNextPriority)
      .catch(() => {});
  };

  const openEdit = (c: Category) => {
    setEditingId(c.id);
    setForm({
      slug: c.slug,
      title: c.title,
      description: c.description,
      heroImage: c.heroImage ?? "",
      priority: c.priority,
      subcategories: c.subcategories?.map((s) => ({ ...s })) ?? [],
    });
    setActiveTab(CATEGORY_TABS[0].id);
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
      const body = {
        slug: form.slug,
        title: form.title,
        description: form.description,
        heroImage: form.heroImage.trim() || null,
        subcategories: form.subcategories.map((s) => {
          const {
            id: _id,
            count: _c,
            createdAt: _cat,
            updatedAt: _uat,
            ...rest
          } = s as Record<string, unknown>;
          return rest;
        }),
      };
      if (editingId) {
        await dispatch(updateCategory({ id: editingId, body })).unwrap();
        toast.success(t("toast.updated"));
      } else {
        await dispatch(createCategory(body)).unwrap();
        toast.success(t("toast.created"));
      }
      tableRef.current?.refresh();
      closeModal();
    } catch (err) {
      toast.error(errorMessage(err, tCrud("failed")));
    }
  };

  /* DataTable already moved the row optimistically; throwing makes it roll back. */
  const handleReorder = async (rows: Category[]) => {
    try {
      await dispatch(reorderCategories(rows.map((r) => r.id))).unwrap();
      toast.success(t("toast.reordered"));
      tableRef.current?.refresh();
    } catch (err) {
      toast.error(errorMessage(err, tCrud("failed")));
      tableRef.current?.refresh();
      throw err;
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: t("confirmDelete.title"),
      message: t("confirmDelete.message", { title }),
      confirmLabel: tCrud("delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await dispatch(deleteCategory(id)).unwrap();
      toast.success(tCrud("deleted"));
      tableRef.current?.refresh();
    } catch (err) {
      toast.error(errorMessage(err, tCrud("failed")));
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
        <RoleGuard permission={PERMISSIONS.CATEGORY_CREATE}>
          <button
            className="flex items-center gap-1.5 py-[10px] px-5 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-lg text-sm font-semibold font-primary cursor-pointer hover:opacity-90 transition-opacity"
            onClick={openCreate}
          >
            <Plus size={16} /> {t("page.add")}
          </button>
        </RoleGuard>
      </div>

      <DataTable<Category>
        tableRef={tableRef}
        columns={columns}
        fetchData={fetchCategories}
        searchPlaceholder={t("table.searchPlaceholder")}
        sortOptions={sortOptions}
        defaultSort={CATEGORY_PRIORITY_SORT}
        pageSize={CATEGORY_PAGE_SIZE}
        reorder={{ sortValue: CATEGORY_PRIORITY_SORT, onReorder: handleReorder }}
      />

      {/* ═══════════════ MODAL FORM ═══════════════ */}
      {showModal && (
        <ModalShell title={editingId ? t("form.titleEdit") : t("form.titleCreate")} onClose={closeModal}>
          <FormTabs tabs={CATEGORY_TABS} active={activeTab} onChange={setActiveTab} />

          <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
            <ModalBody>
              {activeTab === "info" && (
                <FormSection>
                  <FormField label={t("form.fields.title")} required>
                    <input
                      className={inputClass}
                      value={form.title}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((p) => ({ ...p, title: v, slug: slugify(v) }));
                      }}
                      placeholder={t("form.placeholders.title")}
                      required
                    />
                  </FormField>
                  <FormField label={t("form.fields.priority")} info={t("form.priorityInfo")}>
                    <input
                      className={`${inputClass} opacity-60 cursor-not-allowed`}
                      value={(editingId ? form.priority : nextPriority) ?? ""}
                      readOnly
                      disabled
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
                  <FormField
                    label={t("form.fields.heroImage")}
                    info={t("form.heroImageInfo")}
                  >
                    <ImageUrlField
                      value={form.heroImage}
                      onChange={(url) => setForm((p) => ({ ...p, heroImage: url }))}
                    />
                  </FormField>
                </FormSection>
              )}

              {activeTab === "subcategories" && (
                <FormSection>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-[var(--text-secondary)] font-primary flex items-center gap-1.5">
                      <FolderTree size={14} /> {t("subcategories.heading", { count: form.subcategories.length })}
                    </span>
                    <button
                      type="button"
                      className="flex items-center gap-1 py-1 px-2.5 bg-transparent border border-[var(--border-subtle)] rounded-sm text-xs font-primary text-[var(--text-secondary)] cursor-pointer"
                      onClick={addSub}
                    >
                      <Plus size={12} /> {t("subcategories.add")}
                    </button>
                  </div>
                  {form.subcategories.length === 0 && (
                    <p className="text-xs text-[var(--text-muted)] py-3">
                      {t("subcategories.empty")}
                    </p>
                  )}
                  {form.subcategories.map((sub, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-2 p-3 border border-[var(--border-subtle)] rounded-lg"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
                          {t("subcategories.item", { index: i + 1 })}
                        </span>
                        <button
                          type="button"
                          className="flex items-center justify-center w-6 h-6 border-0 bg-transparent cursor-pointer text-[var(--accent-rose)] shrink-0"
                          onClick={() => rmSub(i)}
                          aria-label={t("subcategories.remove")}
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <input
                        className={inputClass}
                        placeholder={t("subcategories.label")}
                        value={sub.label}
                        onChange={(e) => {
                          const v = e.target.value;
                          updSub(i, "label", v);
                          updSub(i, "slug", slugify(v));
                        }}
                      />
                      <input
                        className={inputClass}
                        placeholder={t("subcategories.description")}
                        value={sub.description}
                        onChange={(e) => updSub(i, "description", e.target.value)}
                      />
                    </div>
                  ))}
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
