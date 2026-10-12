/* ═══════════════════════════════════════════════════════════
   USERS MODULE TYPES
   ═══════════════════════════════════════════════════════════ */

import type { AdminUser } from "@/src/hooks/use-admin-api";
import type { ListParams } from "@/src/lib/list-query";

export interface UserListParams extends ListParams {
  role?: string;
  status?: string;
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
