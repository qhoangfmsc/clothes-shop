/* ═══════════════════════════════════════════════════════════
   ADMIN API HOOKS — SWR-based data fetching for admin panel

   Uses `authApi` from lib/auth-api for authenticated requests.
   Supports BE filter / sort / pagination params.
   ═══════════════════════════════════════════════════════════ */

import useSWR from "swr";
import { authApi } from "@/src/lib/auth-api";
import { buildListQuery, LIST_DEFAULT_LIMIT } from "@/src/lib/list-query";
import type { Product } from "@/src/types/product";
import type { Category } from "@/src/types/category";
import type { Collection } from "@/src/types/collection";
import type {
  OrderStatus,
  OrderPaymentStatus,
  ProductBadge,
  ProductStatus,
  UserRole,
  UserStatus,
} from "@/src/types/enums";

const defaultConfig = {
  revalidateOnFocus: false,
  dedupingInterval: 10_000,
  keepPreviousData: true,
};

type ListResponse<T> = { data: T[]; total: number; page?: number; limit?: number };
type SingleResponse<T> = { data: T };

/* ═══════════════════════════════════════════════════════════
   PRODUCTS — Public GET with BE filters
   ═══════════════════════════════════════════════════════════ */

export interface ProductFilters {
  category?: string;
  badge?: ProductBadge;
  status?: ProductStatus;
  sort?: string; // field = ascending, -field = descending: price | name | createdAt
  search?: string;
  page?: number;
  limit?: number;
}

/** Shape sent to POST/PATCH /api/admin/products (matches BE DTO) */
export interface ProductFormData {
  name: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  images: string[];
  categoryId: string;
  subcategoryId: string | null;
  badge: ProductBadge | null;
  status: ProductStatus;
  description: string;
  material: string;
  care: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
  tags: string[];
}

export function useAdminProducts(filters: ProductFilters = {}) {
  const qs = buildListQuery(filters, { category: filters.category, badge: filters.badge, status: filters.status });

  const { data, error, isLoading, isValidating, mutate } = useSWR<ListResponse<Product>>(
    `/api/admin/products?${qs}`,
    (path: string) => authApi.get<ListResponse<Product>>(path),
    defaultConfig
  );

  const createProduct = async (body: ProductFormData) => {
    const res = await authApi.post<SingleResponse<Product>>("/api/admin/products", body);
    await mutate();
    return res.data;
  };
  const updateProduct = async (id: string, body: Partial<ProductFormData>) => {
    const res = await authApi.patch<SingleResponse<Product>>(`/api/admin/products/${id}`, body);
    await mutate();
    return res.data;
  };
  const deleteProduct = async (id: string) => {
    await authApi.delete(`/api/admin/products/${id}`);
    await mutate();
  };

  return {
    products: data?.data ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    limit: data?.limit ?? LIST_DEFAULT_LIMIT,
    isLoading,
    isValidating,
    isError: !!error,
    mutate,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}

/* ═══════════════════════════════════════════════════════════
   CATEGORIES — Admin GET with BE filters
   ═══════════════════════════════════════════════════════════ */

export interface CategoryFilters {
  search?: string;
  sort?: string; // field = ascending, -field = descending: priority | title | createdAt
  page?: number;
  limit?: number;
}

export function useAdminCategories(filters: CategoryFilters = {}) {
  const qs = buildListQuery(filters);

  const { data, error, isLoading, isValidating, mutate } = useSWR<ListResponse<Category>>(
    `/api/admin/categories?${qs}`,
    (path: string) => authApi.get<ListResponse<Category>>(path),
    defaultConfig
  );

  const createCategory = async (body: Partial<Category>) => {
    const res = await authApi.post<SingleResponse<Category>>("/api/admin/categories", body);
    await mutate();
    return res.data;
  };
  const updateCategory = async (id: string, body: Partial<Category>) => {
    const res = await authApi.patch<SingleResponse<Category>>(`/api/admin/categories/${id}`, body);
    await mutate();
    return res.data;
  };
  const deleteCategory = async (id: string) => {
    await authApi.delete(`/api/admin/categories/${id}`);
    await mutate();
  };

  return {
    categories: data?.data ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    limit: data?.limit ?? LIST_DEFAULT_LIMIT,
    isLoading,
    isValidating,
    isError: !!error,
    mutate,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

/* ═══════════════════════════════════════════════════════════
   COLLECTIONS — Admin GET with BE filters
   ═══════════════════════════════════════════════════════════ */

export interface CollectionFilters {
  search?: string;
  season?: string;
  sort?: string; // field = ascending, -field = descending: name | createdAt
  page?: number;
  limit?: number;
}

export function useAdminCollections(filters: CollectionFilters = {}) {
  const qs = buildListQuery(filters, { season: filters.season });

  const { data, error, isLoading, isValidating, mutate } = useSWR<ListResponse<Collection>>(
    `/api/admin/collections?${qs}`,
    (path: string) => authApi.get<ListResponse<Collection>>(path),
    defaultConfig
  );

  const createCollection = async (body: Partial<Collection>) => {
    const res = await authApi.post<SingleResponse<Collection>>("/api/admin/collections", body);
    await mutate();
    return res.data;
  };
  const updateCollection = async (id: string, body: Partial<Collection>) => {
    const res = await authApi.patch<SingleResponse<Collection>>(
      `/api/admin/collections/${id}`,
      body
    );
    await mutate();
    return res.data;
  };
  const deleteCollection = async (id: string) => {
    await authApi.delete(`/api/admin/collections/${id}`);
    await mutate();
  };

  return {
    collections: data?.data ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    limit: data?.limit ?? LIST_DEFAULT_LIMIT,
    isLoading,
    isValidating,
    isError: !!error,
    mutate,
    createCollection,
    updateCollection,
    deleteCollection,
  };
}

/* ═══════════════════════════════════════════════════════════
   ORDERS — Admin GET with BE filters + pagination
   ═══════════════════════════════════════════════════════════ */

export interface AdminOrderItem {
  id: string;
  productId: string | null;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
}
export interface AdminOrder {
  id: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paidAt: string | null;
  subtotal: number;
  shippingFee: number;
  total: number;
  shippingMethod: string;
  shippingAddress: Record<string, unknown>;
  note: string;
  items: AdminOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  search?: string;
  sort?: string; // field = ascending, -field = descending: createdAt | total
  page?: number;
  limit?: number;
}

export function useAdminOrders(filters: OrderFilters = {}) {
  const qs = buildListQuery(filters, { status: filters.status });

  const { data, error, isLoading, isValidating, mutate } = useSWR<ListResponse<AdminOrder>>(
    `/api/admin/orders?${qs}`,
    (path: string) => authApi.get<ListResponse<AdminOrder>>(path),
    defaultConfig
  );

  const getOrderDetail = async (orderId: string) => {
    const res = await authApi.get<SingleResponse<AdminOrder>>(`/api/admin/orders/${orderId}`);
    return res.data;
  };
  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const res = await authApi.patch<SingleResponse<AdminOrder>>(
      `/api/admin/orders/${orderId}/status`,
      { status }
    );
    await mutate();
    return res.data;
  };

  return {
    orders: data?.data ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    limit: data?.limit ?? LIST_DEFAULT_LIMIT,
    isLoading,
    isValidating,
    isError: !!error,
    mutate,
    getOrderDetail,
    updateOrderStatus,
  };
}

/* ═══════════════════════════════════════════════════════════
   USERS — Admin GET with BE filters + pagination
   ═══════════════════════════════════════════════════════════ */

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string | null;
  role: UserRole;
  status: UserStatus;
  permissions?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserUpdate {
  role?: UserRole;
  status?: UserStatus;
  permissions?: number[];
}

export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  sort?: string; // field = ascending, -field = descending: name | email | createdAt
  page?: number;
  limit?: number;
}

export function useAdminUsers(filters: UserFilters = {}) {
  const qs = buildListQuery(filters, { role: filters.role, status: filters.status });

  const { data, error, isLoading, isValidating, mutate } = useSWR<ListResponse<AdminUser>>(
    `/api/admin/users?${qs}`,
    (path: string) => authApi.get<ListResponse<AdminUser>>(path),
    defaultConfig
  );

  const getUserDetail = async (userId: string) => {
    const res = await authApi.get<SingleResponse<AdminUser>>(`/api/admin/users/${userId}`);
    return res.data;
  };
  const updateUser = async (userId: string, body: AdminUserUpdate) => {
    const res = await authApi.patch<SingleResponse<AdminUser>>(`/api/admin/users/${userId}`, body);
    await mutate();
    return res.data;
  };

  return {
    users: data?.data ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    limit: data?.limit ?? LIST_DEFAULT_LIMIT,
    isLoading,
    isValidating,
    isError: !!error,
    mutate,
    getUserDetail,
    updateUser,
  };
}
