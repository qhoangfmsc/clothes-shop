/* ═══════════════════════════════════════════════════════════
   ADMIN API HOOKS — Authenticated data fetching for admin panel

   Uses `apiFetch` from useApiAuth() for authenticated requests.
   Supports BE filter / sort / pagination params.
   ═══════════════════════════════════════════════════════════ */

import useSWR from "swr";
import { useApiAuth } from "./use-api-auth";
import type { Product } from "@/src/types/product";
import type { Category } from "@/src/types/category";
import type { Collection } from "@/src/types/collection";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7001";

const defaultConfig = { revalidateOnFocus: false, dedupingInterval: 10_000, keepPreviousData: true };

type ListResponse<T> = { data: T[]; total: number; page?: number; limit?: number };
type SingleResponse<T> = { data: T };

/* ═══════════════════════════════════════════════════════════
   PRODUCTS — Public GET with BE filters
   ═══════════════════════════════════════════════════════════ */

export interface ProductFilters {
  category?: string;
  subcategory?: string;
  badge?: string;
  sort?: string; // price_asc | price_desc | newest
  limit?: number;
}

/** Shape sent to POST/PATCH /api/admin/products (matches BE DTO) */
export interface ProductFormData {
  name: string; slug: string; price: number; originalPrice: number | null;
  images: string[]; categoryId: string; subcategoryId: number;
  badge: string | null; status: string; description: string;
  material: string; care: string; sizes: string[];
  colors: { name: string; hex: string }[]; tags: string[];
}

export function useAdminProducts(filters: ProductFilters = {}) {
  const { apiFetch } = useApiAuth();

  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.subcategory) params.set("subcategory", filters.subcategory);
  if (filters.badge) params.set("badge", filters.badge);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();

  const { data, error, isLoading, isValidating, mutate } = useSWR<ListResponse<Product>>(
    `${API_URL}/api/products${qs ? `?${qs}` : ""}`,
    (url: string) => apiFetch<ListResponse<Product>>(url, { public: true }),
    defaultConfig
  );

  const createProduct = async (body: ProductFormData) => {
    const res = await apiFetch<SingleResponse<Product>>("/api/admin/products", { method: "POST", body });
    await mutate();
    return res.data;
  };
  const updateProduct = async (id: string, body: Partial<ProductFormData>) => {
    const res = await apiFetch<SingleResponse<Product>>(`/api/admin/products/${id}`, { method: "PATCH", body });
    await mutate();
    return res.data;
  };
  const deleteProduct = async (id: string) => {
    await apiFetch(`/api/admin/products/${id}`, { method: "DELETE" });
    await mutate();
  };

  return {
    products: data?.data ?? [],
    total: data?.total ?? 0,
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
   CATEGORIES — Public GET
   ═══════════════════════════════════════════════════════════ */

export function useAdminCategories() {
  const { apiFetch } = useApiAuth();

  const { data, error, isLoading, isValidating, mutate } = useSWR<ListResponse<Category>>(
    `${API_URL}/api/categories`,
    (url: string) => apiFetch<ListResponse<Category>>(url, { public: true }),
    defaultConfig
  );

  const createCategory = async (body: Partial<Category>) => {
    const res = await apiFetch<SingleResponse<Category>>("/api/admin/categories", { method: "POST", body });
    await mutate();
    return res.data;
  };
  const updateCategory = async (id: string, body: Partial<Category>) => {
    const res = await apiFetch<SingleResponse<Category>>(`/api/admin/categories/${id}`, { method: "PATCH", body });
    await mutate();
    return res.data;
  };
  const deleteCategory = async (id: string) => {
    await apiFetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    await mutate();
  };

  return {
    categories: data?.data ?? [],
    total: data?.total ?? 0,
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
   COLLECTIONS — Public GET
   ═══════════════════════════════════════════════════════════ */

export function useAdminCollections() {
  const { apiFetch } = useApiAuth();

  const { data, error, isLoading, isValidating, mutate } = useSWR<ListResponse<Collection>>(
    `${API_URL}/api/collections`,
    (url: string) => apiFetch<ListResponse<Collection>>(url, { public: true }),
    defaultConfig
  );

  const createCollection = async (body: Partial<Collection>) => {
    const res = await apiFetch<SingleResponse<Collection>>("/api/admin/collections", { method: "POST", body });
    await mutate();
    return res.data;
  };
  const updateCollection = async (id: string, body: Partial<Collection>) => {
    const res = await apiFetch<SingleResponse<Collection>>(`/api/admin/collections/${id}`, { method: "PATCH", body });
    await mutate();
    return res.data;
  };
  const deleteCollection = async (id: string) => {
    await apiFetch(`/api/admin/collections/${id}`, { method: "DELETE" });
    await mutate();
  };

  return {
    collections: data?.data ?? [],
    total: data?.total ?? 0,
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
  page?: number;
  limit?: number;
}

export function useAdminOrders(filters: OrderFilters = {}) {
  const { apiFetch } = useApiAuth();

  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();

  const { data, error, isLoading, isValidating, mutate } = useSWR<ListResponse<AdminOrder>>(
    `${API_URL}/api/admin/orders${qs ? `?${qs}` : ""}`,
    (url: string) => apiFetch<ListResponse<AdminOrder>>(url),
    defaultConfig
  );

  const getOrderDetail = async (orderId: string) => {
    const res = await apiFetch<SingleResponse<AdminOrder>>(`/api/admin/orders/${orderId}`);
    return res.data;
  };
  const updateOrderStatus = async (orderId: string, status: string) => {
    const res = await apiFetch<SingleResponse<AdminOrder>>(`/api/admin/orders/${orderId}/status`, { method: "PATCH", body: { status } });
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
  const { apiFetch } = useApiAuth();

  const params = new URLSearchParams();
  if (filters.role) params.set("role", filters.role);
  if (filters.status) params.set("status", filters.status);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();

  const { data, error, isLoading, isValidating, mutate } = useSWR<ListResponse<AdminUser>>(
    `${API_URL}/api/admin/users${qs ? `?${qs}` : ""}`,
    (url: string) => apiFetch<ListResponse<AdminUser>>(url),
    defaultConfig
  );

  const getUserDetail = async (userId: string) => {
    const res = await apiFetch<SingleResponse<AdminUser>>(`/api/admin/users/${userId}`);
    return res.data;
  };
  const updateUser = async (userId: string, body: AdminUserUpdate) => {
    const res = await apiFetch<SingleResponse<AdminUser>>(`/api/admin/users/${userId}`, { method: "PATCH", body });
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
