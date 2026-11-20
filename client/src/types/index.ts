export type UserRole = 'SUPER_ADMIN' | 'RESTAURANT_OWNER' | 'MANAGER' | 'WAITER' | 'KITCHEN_STAFF';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  restaurantId?: string;
  restaurant?: Restaurant;
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  logo_url?: string;
  hero_image?: string;
  hero_video?: string;
  brand_color: string;
  secondary_color: string;
  accent_color: string;
  phone?: string;
  address?: string;
  opening_hours?: string;
  currency: string;
  is_active: boolean;
  categories?: Category[];
  tables?: RestaurantTable[];
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  name_ru?: string;
  name_en?: string;
  slug: string;
  description?: string;
  image_url?: string;
  sort_order: number;
  is_active: boolean;
  menu_items?: MenuItem[];
  _count?: { menu_items: number };
}

export interface MenuItemOption {
  id: string;
  menu_item_id: string;
  name: string;
  name_ru?: string;
  name_en?: string;
  price_modifier: number;
  is_required: boolean;
}

export interface MenuItemMedia {
  id: string;
  menu_item_id: string;
  media_type: 'IMAGE' | 'VIDEO';
  url: string;
  thumbnail_url?: string;
  caption?: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  name_ru?: string;
  name_en?: string;
  description?: string;
  description_ru?: string;
  description_en?: string;
  price: number;
  preparation_time?: string;
  weight_or_portion?: string;
  popularity_badge?: string;
  is_available: boolean;
  is_featured: boolean;
  is_video_featured: boolean;
  image_url?: string;
  video_url?: string;
  video_thumbnail?: string;
  video_poster?: string;
  calories?: number;
  allergens?: string;
  sort_order: number;
  category?: Category;
  options?: MenuItemOption[];
  media_gallery?: MenuItemMedia[];
}

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  table_number: string;
  capacity: number;
  section?: string;
  qr_code_url?: string;
  is_active: boolean;
  _count?: { orders: number };
}

export type OrderStatus = 'Yangi' | 'Qabul qilindi' | 'Tayyorlanmoqda' | 'Tayyor' | 'Yetkazildi' | 'Bekor qilindi';

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id?: string;
  dish_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  selected_options?: string;
  notes?: string;
  status: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by?: string;
  notes?: string;
  created_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id?: string;
  order_number: number;
  status: OrderStatus;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  notes?: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  table?: RestaurantTable;
  status_history?: OrderStatusHistory[];
  restaurant?: Restaurant;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedOptions: string[];
  notes?: string;
  itemTotal: number;
}

export interface MenuImportItem {
  id: string;
  job_id: string;
  raw_name: string;
  clean_name: string;
  category_name: string;
  price?: number;
  description?: string;
  image_url?: string;
  confidence: number;
  status: 'CONFIRMED' | 'REQUIRES_REVIEW' | 'REJECTED';
}

export interface MenuImportJob {
  id: string;
  restaurant_id: string;
  source_type: string;
  source_url_or_filename: string;
  status: string;
  detected_categories_count: number;
  detected_items_count: number;
  items: MenuImportItem[];
  created_at: string;
}
