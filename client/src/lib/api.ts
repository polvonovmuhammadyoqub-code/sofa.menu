import type { Restaurant } from '../types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('sofa_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('sofa_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('sofa_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}, guest = false): Promise<T> {
  const token = guest ? null : getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'Xatolik yuz berdi';
    try {
      const errData = await response.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch {
      // fallback
    }
    throw Object.assign(new Error(errorMsg), { status: response.status });
  }

  return response.json();
}

export const api = {
  // Auth
  login: (data: { email: string; password: string }) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<any>('/auth/me'),

  // Restaurants
  getRestaurantBySlug: (slug: string, signal?: AbortSignal) => request<Restaurant>(`/restaurants/by-slug/${encodeURIComponent(slug)}`, { signal }, true),
  getRestaurantById: (id: string) => request<any>(`/restaurants/${id}`),
  updateRestaurant: (id: string, data: any) => request<any>(`/restaurants/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Categories & Menu Items
  getCategories: (restaurantId: string) => request<any[]>(`/menu/restaurants/${restaurantId}/categories`),
  createCategory: (restaurantId: string, data: any) => request<any>(`/menu/restaurants/${restaurantId}/categories`, { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: any) => request<any>(`/menu/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => request<any>(`/menu/categories/${id}`, { method: 'DELETE' }),

  getMenuItems: (restaurantId: string, params?: { category_id?: string; is_featured?: boolean; is_video_featured?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.category_id) qs.set('category_id', params.category_id);
    if (params?.is_featured) qs.set('is_featured', 'true');
    if (params?.is_video_featured) qs.set('is_video_featured', 'true');
    return request<any[]>(`/menu/restaurants/${restaurantId}/items?${qs.toString()}`);
  },
  createMenuItem: (restaurantId: string, data: any) => request<any>(`/menu/restaurants/${restaurantId}/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateMenuItem: (id: string, data: any) => request<any>(`/menu/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMenuItem: (id: string) => request<any>(`/menu/items/${id}`, { method: 'DELETE' }),

  // Tables
  getTables: (restaurantId: string) => request<any[]>(`/tables/restaurants/${restaurantId}/tables`),
  createTable: (restaurantId: string, data: any) => request<any>(`/tables/restaurants/${restaurantId}/tables`, { method: 'POST', body: JSON.stringify(data) }),
  deleteTable: (id: string) => request<any>(`/tables/${id}`, { method: 'DELETE' }),

  // Orders
  createOrder: (data: any) => request<any>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  getOrderById: (id: string) => request<any>(`/orders/${id}`),
  listOrders: (restaurantId: string, params?: { status?: string; table_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.table_id) qs.set('table_id', params.table_id);
    return request<any[]>(`/orders/restaurants/${restaurantId}/list?${qs.toString()}`);
  },
  updateOrderStatus: (id: string, status: string, notes?: string) => request<any>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),

  // Import
  parseMenuUrl: (restaurantId: string, url: string) => request<any>('/menu-import/parse-url', { method: 'POST', body: JSON.stringify({ restaurant_id: restaurantId, url }) }),
  parseMenuData: (restaurantId: string, data: string, format: string, filename?: string) => request<any>('/menu-import/parse-data', { method: 'POST', body: JSON.stringify({ restaurant_id: restaurantId, data, format, filename }) }),
  getImportJob: (id: string) => request<any>(`/menu-import/jobs/${id}`),
  updateImportItem: (id: string, data: any) => request<any>(`/menu-import/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  commitImportJob: (id: string) => request<any>(`/menu-import/jobs/${id}/commit`, { method: 'POST' }),

  // Analytics
  recordMenuEvent: (restaurantId: string, itemId?: string) => fetch(
    `/api/analytics/restaurants/${encodeURIComponent(restaurantId)}/menu-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
      keepalive: true,
    },
  ).catch(() => undefined),
  getAnalytics: (restaurantId: string) => request<any>(`/analytics/restaurants/${restaurantId}/stats`),

  // Super Admin
  getSuperAdminStats: () => request<any>('/super-admin/stats'),
  getSuperAdminRestaurants: () => request<any[]>('/super-admin/restaurants'),
  createSuperAdminRestaurant: (data: any) => request<any>('/super-admin/restaurants', { method: 'POST', body: JSON.stringify(data) }),
  toggleRestaurantStatus: (id: string, is_active: boolean) => request<any>(`/super-admin/restaurants/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),

  // Media Upload
  uploadMedia: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>('/uploads', {
      method: 'POST',
      body: formData,
    });
  },
};

export default api;
