/* ═══════════════════════════════════════════════════════════
   USERS MODULE TYPES
   ═══════════════════════════════════════════════════════════ */

import type { AdminUser } from "@/src/hooks/use-admin-api";
import type { ListParams } from "@/src/lib/list-query";
import type { UserRole, UserStatus } from "@/src/types/enums";

export interface UserListParams extends ListParams {
  role?: UserRole;
  status?: UserStatus;
}

export interface UserUpdateData {
  role?: UserRole;
  status?: UserStatus;
  permissions?: number[];
}

export interface UserListResult {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
}
