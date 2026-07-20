/* ═══════════════════════════════════════════════════════════
   ADMIN API HOOKS — SWR-based data fetching for admin panel

   Uses `authApi` from lib/auth-api for authenticated requests.
   Supports BE filter / sort / pagination params.
   ═══════════════════════════════════════════════════════════ */

import useSWR from "swr";
import { authApi } from "@/src/lib/auth-api";
import type { Product } from "@/src/types/product";
import type { Category } from "@/src/types/category";
import type { Collection } from "@/src/types/collection";

const defaultConfig = { revalidateOnFocus: false, dedupingInterval: 10_000, keepPreviousData: true };

type ListResponse<T> = { data: T[]; total: number; page?: number; limit?: number };
type SingleResponse<T> = { data: T };

/* ═══════════════════════════════════════════════════════════
   PRODUCTS — Public GET with BE filters
   ═══════════════════════════════════════════════════════════ */

export interface ProductFilters {
  category?: string;
  badge?: string;
  status?: string;
  sort?: string; // createdAt | -createdAt | price | -price | name | -name
  search?: string;
  page?: number;
  limit?: number;
}

/** Shape sent to POST/PATCH /api/admin/products (matches BE DTO) */
export interface ProductFormData {
  name: string; slug: string; price: number; originalPrice: number | null;
  images: string[]; categoryId: string; subcategoryId: string | null;
  badge: string | null; status: string; description: string;
  material: string; care: string; sizes: string[];
  colors: { name: string; hex: string }[]; tags: string[];
}

export function useAdminProducts(filters: ProductFilters = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.badge) params.set("badge", filters.badge);
  if (filters.status) params.set("status", filters.status);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.search) params.set("search", filters.search);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();

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
    limit: data?.limit ?? 25,
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
  sort?: string; // title | -title | createdAt | -createdAt
  page?: number;
  limit?: number;
}

export function useAdminCategories(filters: CategoryFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();

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
    limit: data?.limit ?? 25,
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
  sort?: string; // name | -name | createdAt | -createdAt
  page?: number;
  limit?: number;
}

export function useAdminCollections(filters: CollectionFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.season) params.set("season", filters.season);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();

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
    const res = await authApi.patch<SingleResponse<Collection>>(`/api/admin/collections/${id}`, body);
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
    limit: data?.limit ?? 25,
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
  id: string; productId: string | null; productName: string; productImage: string;
  price: number; quantity: number; size: string; color: string;
}
export interface AdminOrder {
  id: string; userId: string; status: string; subtotal: number; shippingFee: number;
  total: number; shippingMethod: string; shippingAddress: Record<string, unknown>;
  note: string; items: AdminOrderItem[]; createdAt: string; updatedAt: string;
}

export interface OrderFilters {
  status?: string;
  search?: string;
  sort?: string; // createdAt | -createdAt
  page?: number;
  limit?: number;
}

export function useAdminOrders(filters: OrderFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();

  const { data, error, isLoading, isValidating, mutate } = useSWR<ListResponse<AdminOrder>>(
    `/api/admin/orders?${qs}`,
    (path: string) => authApi.get<ListResponse<AdminOrder>>(path),
    defaultConfig
  );

  const getOrderDetail = async (orderId: string) => {
    const res = await authApi.get<SingleResponse<AdminOrder>>(`/api/admin/orders/${orderId}`);
    return res.data;
  };
  const updateOrderStatus = async (orderId: string, status: string) => {
    const res = await authApi.patch<SingleResponse<AdminOrder>>(`/api/admin/orders/${orderId}/status`, { status });
    await mutate();
    return res.data;
  };

  return {
    orders: data?.data ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    limit: data?.limit ?? 25,
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
  id: string; email: string; name: string | null; image: string | null;
  provider: string | null;
  role: string; status: string; permissions?: number[];
  createdAt: string; updatedAt: string;
}

export interface AdminUserUpdate {
  role?: string;
  status?: string;
  permissions?: number[];
}

export interface UserFilters {
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useAdminUsers(filters: UserFilters = {}) {
  const params = new URLSearchParams();
  if (filters.role) params.set("role", filters.role);
  if (filters.status) params.set("status", filters.status);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();

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
    limit: data?.limit ?? 25,
    isLoading,
    isValidating,
    isError: !!error,
    mutate,
    getUserDetail,
    updateUser,
  };
}
