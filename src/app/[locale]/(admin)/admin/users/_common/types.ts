/* ═══════════════════════════════════════════════════════════
   USERS MODULE TYPES
   ═══════════════════════════════════════════════════════════ */

import type { AdminUser } from "@/src/hooks/use-admin-api";

export interface UserListParams {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface UserUpdateData {
  role?: string;
  status?: string;
  permissions?: number[];
}

export interface UserListResult {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
}
