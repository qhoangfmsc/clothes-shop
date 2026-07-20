"use client";

import { useState, useMemo, useRef, type FormEvent } from "react";
import { Plus, Pencil, Trash2, X, FolderTree } from "lucide-react";
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
  fetchCategoryList,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./_common/moduleSlice";
import { EMPTY_CATEGORY_FORM, CATEGORY_SORT_OPTIONS } from "./_common/constants";
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

export default function CategoriesContent() {
  const { toast } = useToast();
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
        key: "title",
        header: "Title",
        render: (c) => <span className="font-semibold">{c.title}</span>,
      },
      {
        key: "slug",
        header: "Slug",
        render: (c) => (
          <code className="text-xs bg-[var(--bg-elevated)] py-0.5 px-1.5 rounded-sm font-mono">{c.slug}</code>
        ),
      },
      {
        key: "subcategories",
        header: "Subcategories",
        render: (c) => (
          <div className="flex gap-1 flex-wrap">
            {c.subcategories && c.subcategories.length > 0
              ? c.subcategories.map((s) => (
                  <span
                    key={s.id}
                    className="text-xs bg-[rgba(184,165,200,0.12)] text-[var(--accent-lavender)] py-0.5 px-1.5 rounded-sm font-medium"
                  >
                    {s.label}
                  </span>
                ))
              : (
                <span className="text-[var(--text-disabled)] text-xs">—</span>
              )}
          </div>
        ),
      },
      {
        key: "description",
        header: "Description",
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
        header: "Actions",
        align: "right",
        render: (c) => (
          <div className="flex gap-1 justify-end">
            <RoleGuard permission={PERMISSIONS.CATEGORY_UPDATE}>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-secondary)]"
                onClick={() => openEdit(c)}
                title="Edit"
              >
                <Pencil size={14} />
              </button>
            </RoleGuard>
            <RoleGuard permission={PERMISSIONS.CATEGORY_DELETE}>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--accent-rose)]"
                onClick={() => handleDelete(c.id, c.title)}
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
  const [form, setForm] = useState(EMPTY_CATEGORY_FORM);

  /* ── Subcategory helpers ── */
  const addSub = () =>
    setForm((p) => ({
      ...p,
      subcategories: [...p.subcategories, { id: 0, slug: "", label: "", description: "", count: 0 }],
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
    setShowModal(true);
  };

  const openEdit = (c: Category) => {
    setEditingId(c.id);
    setForm({
      slug: c.slug,
      title: c.title,
      description: c.description,
      subcategories: c.subcategories?.map((s) => ({ ...s })) ?? [],
    });
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
        toast.success("Category updated");
      } else {
        await dispatch(createCategory(body)).unwrap();
        toast.success("Category created");
      }
      tableRef.current?.refresh();
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await dispatch(deleteCategory(id)).unwrap();
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
          <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal">Categories</h1>
          <p className="text-xs text-[var(--text-muted)] font-primary mt-1">
            {total} categor{total !== 1 ? "ies" : "y"}
          </p>
        </div>
        <RoleGuard permission={PERMISSIONS.CATEGORY_CREATE}>
          <button
            className="flex items-center gap-1.5 py-[10px] px-5 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-lg text-sm font-semibold font-primary cursor-pointer hover:opacity-90 transition-opacity"
            onClick={openCreate}
          >
            <Plus size={16} /> Add Category
          </button>
        </RoleGuard>
      </div>

      <DataTable<Category>
        tableRef={tableRef}
        columns={columns}
        fetchData={fetchCategories}
        searchPlaceholder="Title or slug..."
        sortOptions={CATEGORY_SORT_OPTIONS as unknown as { value: string; label: string }[]}
        defaultSort="createdAt"
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
                {editingId ? "Edit Category" : "New Category"}
              </h2>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-muted)]"
                onClick={closeModal}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
              <Section title="Basic Info">
                <Field label="Title" required>
                  <input
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full"
                    value={form.title}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((p) => ({ ...p, title: v, slug: slugify(v) }));
                    }}
                    placeholder="e.g. Tops"
                    required
                  />
                </Field>
                <Field label="Description" span={2}>
                  <textarea
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none w-full resize-y"
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Category description..."
                  />
                </Field>
              </Section>

              {/* Subcategories */}
              <Section title="Subcategories">
                <div className="col-span-2">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-[var(--text-secondary)] font-primary flex items-center gap-1.5">
                      <FolderTree size={14} /> Subcategories
                    </span>
                    <button
                      type="button"
                      className="flex items-center gap-1 py-1 px-2.5 bg-transparent border border-[var(--border-subtle)] rounded-sm text-xs font-primary text-[var(--text-secondary)] cursor-pointer"
                      onClick={addSub}
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  {form.subcategories.length === 0 && (
                    <p className="text-xs text-[var(--text-muted)] py-3">No subcategories yet. Click &quot;Add&quot; to create one.</p>
                  )}
                  {form.subcategories.map((sub, i) => (
                    <div key={i} className="flex gap-1.5 mb-1.5 items-center">
                      <input
                        className="py-1.5 px-2.5 border-0 border-b border-[var(--border-light)] rounded-none text-xs font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none flex-1"
                        placeholder="Label"
                        value={sub.label}
                        onChange={(e) => {
                          const v = e.target.value;
                          updSub(i, "label", v);
                          updSub(i, "slug", slugify(v));
                        }}
                      />
                      <input
                        className="py-1.5 px-2.5 border-0 border-b border-[var(--border-light)] rounded-none text-xs font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none flex-1"
                        placeholder="Description"
                        value={sub.description}
                        onChange={(e) => updSub(i, "description", e.target.value)}
                      />
                      <button
                        type="button"
                        className="flex items-center justify-center w-7 h-7 border-0 bg-transparent cursor-pointer text-[var(--accent-rose)] shrink-0"
                        onClick={() => rmSub(i)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </Section>

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
                  {isSaving ? "Saving..." : editingId ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
