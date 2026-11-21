import { request } from './apiRequest';
import { guestApi } from './guestApi';
export { getAuthToken, removeAuthToken, setAuthToken } from './apiRequest';

export const api = {
  ...guestApi,
  // Auth
  login: (data: { email: string; password: string }) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<any>('/auth/me'),

  // Restaurants
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
