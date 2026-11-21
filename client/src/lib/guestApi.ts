import type { Order, Restaurant } from '../types';
import { request } from './apiRequest';

export const guestApi = {
  getRestaurantBySlug: (slug: string, signal?: AbortSignal) =>
    request<Restaurant>(`/restaurants/by-slug/${encodeURIComponent(slug)}`, { signal }, true),
  createOrder: (data: unknown) =>
    request<{ order: Order }>('/orders', { method: 'POST', body: JSON.stringify(data) }, true),
  getOrderById: (id: string) =>
    request<Order>(`/orders/${encodeURIComponent(id)}`, {}, true),
  recordMenuEvent: (restaurantId: string, itemId?: string) => fetch(
    `/api/analytics/restaurants/${encodeURIComponent(restaurantId)}/menu-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
      keepalive: true,
    },
  ).catch(() => undefined),
};
