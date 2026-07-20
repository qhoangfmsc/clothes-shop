"use client";

import { useState, useMemo, useRef } from "react";
import Image from "next/image";
import { Pencil, X, Shield, Eye, EyeOff } from "lucide-react";
import { useAdminUsers, type AdminUser } from "@/src/hooks/use-admin-api";
import { useToast } from "@/src/app/_components/Toast";
import { RoleGuard } from "@/src/app/_components/RoleGuard";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
  type DataTableRef,
} from "@/src/app/_components/DataTable";
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  permissionsToCodes,
  codesToPermissions,
  type Permission,
} from "@/src/lib/permissions";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { fetchUserList, updateUser } from "./_common/moduleSlice";
import { ROLE_OPTIONS, STATUS_OPTIONS } from "./_common/constants";
import type { UserListResult } from "./_common/types";

/* ═══════════════════════════════ Main Component ═══════════════════════ */

export default function UsersContent() {
  const { toast } = useToast();
  const tableRef = useRef<DataTableRef>(null);
  const dispatch = useAppDispatch();

  const { isUpdating, total } = useAppSelector((s) => s.users);

  /* ── fetchData for DataTable (passes search, role, status, page, limit) ── */
  const fetchUsers = async (params: DataTableFetchParams): Promise<UserListResult> => {
    return dispatch(
      fetchUserList({
        search: params.search || undefined,
        role: params.filters.role || undefined,
        status: params.filters.status || undefined,
        page: params.page,
        limit: params.limit,
      })
    ).unwrap();
  };

  /* ── Columns ── */
  const columns: DataTableColumn<AdminUser>[] = useMemo(
    () => [
      {
        key: "user",
        header: "User",
        render: (u) => (
          <div className="flex items-center gap-3">
            {u.image ? (
              <div className="relative w-8 h-8 shrink-0">
                <Image src={u.image} alt="" fill className="rounded-full object-cover" sizes="32px" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-semibold text-[var(--text-muted)] shrink-0">
                {(u.name ?? u.email).charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-semibold">{u.name ?? "—"}</span>
          </div>
        ),
      },
      {
        key: "email",
        header: "Email",
        render: (u) => <span className="text-xs text-[var(--text-muted)]">{u.email}</span>,
      },
      {
        key: "role",
        header: "Role",
        render: (u) => (
          <span
            className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary capitalize ${
              u.role === "admin"
                ? "bg-[rgba(201,169,110,0.15)] text-[var(--accent-primary)]"
                : "bg-[rgba(143,163,180,0.12)] text-[var(--accent-blue)]"
            }`}
          >
            {u.role}
          </span>
        ),
      },
      {
        key: "provider",
        header: "Provider",
        render: (u) => <span className="text-xs text-[var(--text-muted)]">{u.provider ?? "—"}</span>,
      },
      {
        key: "status",
        header: "Status",
        render: (u) => (
          <span
            className={`inline-block py-0.5 px-2 rounded-full text-xs font-semibold font-primary capitalize ${
              u.status === "active"
                ? "bg-[rgba(163,177,138,0.15)] text-[var(--accent-sage)]"
                : "bg-[rgba(212,165,165,0.15)] text-[var(--accent-rose)]"
            }`}
          >
            {u.status}
          </span>
        ),
      },
      {
        key: "permissions",
        header: "Permissions",
        render: (u) => (
          <span className="text-xs text-[var(--text-secondary)]">
            {(u.permissions?.length ?? 0)} granted
          </span>
        ),
      },
      {
        key: "joined",
        header: "Joined",
        render: (u) => (
          <span className="text-xs text-[var(--text-muted)]">
            {new Date(u.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (u) => (
          <RoleGuard permission={PERMISSIONS.USER_ADMIN_UPDATE}>
            <button
              className="inline-flex items-center gap-1 py-1 px-3 text-xs font-medium font-primary rounded-sm border-0 cursor-pointer bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
              onClick={() => openEdit(u)}
            >
              <Pencil size={14} />
              <span>Edit</span>
            </button>
          </RoleGuard>
        ),
      },
    ],
    []
  );

  /* ── Edit modal state ── */
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<{ role: string; status: string; permissions: Permission[] }>({
    role: "user",
    status: "active",
    permissions: [],
  });

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setForm({
      role: user.role,
      status: user.status,
      permissions: user.permissions ? codesToPermissions(user.permissions) : [],
    });
  };
  const closeEdit = () => setEditingUser(null);

  const togglePermission = (perm: Permission) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleSave = async () => {
    if (!editingUser) return;
    try {
      await dispatch(
        updateUser({
          id: editingUser.id,
          body: {
            role: form.role,
            status: form.status,
            permissions: permissionsToCodes(form.permissions),
          },
        })
      ).unwrap();
      toast.success(`User ${editingUser.email} updated`);
      closeEdit();
      tableRef.current?.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div>
        <h1 className="font-display text-2xl text-[var(--text-heading)] font-normal">Users</h1>
        <p className="text-xs text-[var(--text-muted)] font-primary mt-1">
          {total} user{total !== 1 ? "s" : ""} total
        </p>
      </div>

      <DataTable<AdminUser>
        tableRef={tableRef}
        columns={columns}
        fetchData={fetchUsers}
        searchPlaceholder="Name or email..."
        filters={[
          {
            key: "role",
            label: "Role",
            options: ROLE_OPTIONS.map((r) => ({ value: r, label: r })),
          },
          {
            key: "status",
            label: "Status",
            options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
        ]}
      />

      {/* ═══════════════ EDIT MODAL ═══════════════ */}
      {editingUser && (
        <div
          className="fixed inset-0 bg-[rgba(10,10,8,0.5)] flex items-center justify-center z-100 p-6"
          onClick={closeEdit}
        >
          <div
            className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-160 max-h-[85vh] overflow-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center py-5 px-6 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--bg-primary)] z-1">
              <div>
                <h2 className="font-display text-lg text-[var(--text-heading)] font-normal m-0">
                  Edit User
                </h2>
                <p className="text-xs text-[var(--text-muted)] font-primary mt-0.5">
                  {editingUser.email}
                </p>
              </div>
              <button
                className="flex items-center justify-center w-8 h-8 border-0 rounded-sm bg-transparent cursor-pointer text-[var(--text-muted)]"
                onClick={closeEdit}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {/* Role & Status */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] font-primary">
                    <Shield size={12} /> Role
                  </span>
                  <select
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none"
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  >
                    <option value="user">User (Customer)</option>
                    <option value="admin">Admin (Administrator)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] font-primary">
                    {form.status === "active" ? <Eye size={12} /> : <EyeOff size={12} />} Status
                  </span>
                  <select
                    className="py-2 px-3 border-0 border-b border-[var(--border-light)] rounded-none text-sm font-primary bg-[var(--bg-secondary)] text-[var(--text-primary)] outline-none"
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </label>
              </div>

              {/* Custom Permissions */}
              <div className="mt-6">
                <span className="block text-sm font-semibold text-[var(--text-primary)] font-primary mb-0.5">
                  Custom Permissions
                </span>
                <p className="text-xs text-[var(--text-muted)] font-primary mb-4">
                  Leave all unchecked to use role defaults.
                </p>
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.label} className="mb-3">
                    <span className="block text-xs font-semibold text-[var(--text-muted)] font-primary uppercase tracking-wider mb-1">
                      {group.label}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {group.permissions.map((perm) => {
                        const checked = form.permissions.includes(perm);
                        return (
                          <label
                            key={perm}
                            className={`flex items-center gap-2 py-1.5 px-2.5 rounded-sm cursor-pointer text-sm font-primary transition-colors ${
                              checked ? "bg-[rgba(163,177,138,0.08)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(perm)}
                              className="w-3.5 h-3.5 accent-[var(--accent-sage)] cursor-pointer shrink-0"
                            />
                            <span>{PERMISSION_LABELS[perm] ?? perm}</span>
                            <code className="ml-auto text-[10px] font-mono text-[var(--text-disabled)]">
                              {perm}
                            </code>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  className="py-2 px-4 bg-[var(--bg-elevated)] border-0 rounded-sm text-sm font-primary text-[var(--text-secondary)] cursor-pointer"
                  onClick={closeEdit}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="py-2 px-5 bg-[var(--accent-primary)] text-[var(--text-on-gold)] border-0 rounded-sm text-sm font-semibold font-primary cursor-pointer disabled:opacity-50"
                  disabled={isUpdating}
                  onClick={handleSave}
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
