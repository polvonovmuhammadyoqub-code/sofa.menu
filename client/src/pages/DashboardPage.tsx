import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ResponsiveContainerAny = ResponsiveContainer as any;
const AreaChartAny = AreaChart as any;
const AreaAny = Area as any;
const XAxisAny = XAxis as any;
const YAxisAny = YAxis as any;
const TooltipAny = Tooltip as any;
import { Restaurant, Order, Category, MenuItem, RestaurantTable } from '../types';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../lib/i18n';
import api, { getAuthToken } from '../lib/api';
import {
  TrendingUp, ShoppingBag, Utensils, QrCode, FileSpreadsheet, Settings,
  Plus, Edit, Trash2, CheckCircle2, Clock, Eye, Download, Printer, Link as LinkIcon, AlertCircle, RefreshCw
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { formatPrice, t } = useI18n();

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'menu' | 'tables' | 'import' | 'settings'>('overview');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);

  // New Dish Modal State
  const [showDishModal, setShowDishModal] = useState(false);
  const [dishForm, setDishForm] = useState({
    name: '',
    category_id: '',
    price: 65000,
    description: '',
    preparation_time: '15-20 daq',
    weight_or_portion: '350 g',
    popularity_badge: "Chef's Choice",
    image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    video_url: '',
    is_video_featured: false,
  });

  // Table Print Modal
  const [printableTable, setPrintableTable] = useState<RestaurantTable | null>(null);

  // Smart Import State
  const [importUrl, setImportUrl] = useState('');
  const [importJob, setImportJob] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  // Branding Settings Form
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    tagline: '',
    description: '',
    phone: '',
    address: '',
    brand_color: '#C6A76A',
  });

  const restaurantId = user?.restaurantId || 'sofa-signature';

  const loadAllData = async () => {
    try {
      setLoading(true);
      // Fetch restaurant
      const rest = user?.restaurantId
        ? await api.getRestaurantById(user.restaurantId)
        : user?.role === 'SUPER_ADMIN' ? await api.getRestaurantBySlug('sofa-signature') : null;
      if (!rest) return;
      setRestaurant(rest);
      setSettingsForm({
        name: rest.name,
        tagline: rest.tagline || '',
        description: rest.description || '',
        phone: rest.phone || '',
        address: rest.address || '',
        brand_color: rest.brand_color || '#C6A76A',
      });

      // Fetch stats
      const statsData = await api.getAnalytics(rest.id);
      setStats(statsData);

      // Fetch orders
      const ordersData = await api.listOrders(rest.id);
      setOrders(ordersData);

      // Fetch categories & dishes
      const catsData = await api.getCategories(rest.id);
      setCategories(catsData);

      const dishesData = await api.getMenuItems(rest.id);
      setDishes(dishesData);

      // Fetch tables
      const tablesData = await api.getTables(rest.id);
      setTables(tablesData);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Real-time socket events for new orders & status updates
  useEffect(() => {
    if (!restaurant) return;

    const socket: Socket = io({ auth: { token: getAuthToken() } });
    socket.on('connect', () => {
      socket.emit('join:restaurant', restaurant.id);
    });

    socket.on('order:created', (newOrder: Order) => {
      setOrders((prev) => [newOrder, ...prev]);
    });

    socket.on('order:updated', (updated: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurant]);

  // Status transition handler
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const updated = await api.updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (err: any) {
      alert(err.message || 'Holatni yangilashda xatolik');
    }
  };

  // Dish availability toggle
  const handleToggleDishAvailability = async (dish: MenuItem) => {
    try {
      const updated = await api.updateMenuItem(dish.id, { is_available: !dish.is_available });
      setDishes((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err: any) {
      alert(err.message || 'Taomni yangilashda xatolik');
    }
  };

  // Dish create handler
  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    try {
      const created = await api.createMenuItem(restaurant.id, {
        ...dishForm,
        category_id: dishForm.category_id || categories[0]?.id,
      });
      setDishes((prev) => [...prev, created]);
      setShowDishModal(false);
    } catch (err: any) {
      alert(err.message || 'Taom yaratishda xatolik');
    }
  };

  // Table create handler
  const handleAddTable = async () => {
    if (!restaurant) return;
    const nextNum = String(tables.length + 1);
    try {
      const tbl = await api.createTable(restaurant.id, {
        table_number: nextNum,
        capacity: 4,
        section: 'Asosiy zal',
      });
      setTables((prev) => [...prev, tbl]);
    } catch (err: any) {
      alert(err.message || 'Stol yaratishda xatolik');
    }
  };

  // Smart URL Menu Import
  const handleRunUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !importUrl.trim()) return;
    setImportLoading(true);
    setImportMessage('');
    try {
      const res = await api.parseMenuUrl(restaurant.id, importUrl.trim());
      setImportJob(res.job);
      setImportMessage(`Aniqlangan taomlar: ${res.job.detected_items_count} ta. Tasdiqlash uchun ko‘rib chiqing.`);
    } catch (err: any) {
      setImportMessage(`Xatolik: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  // Commit Import Job to Database
  const handleCommitImport = async () => {
    if (!importJob) return;
    setImportLoading(true);
    try {
      const res = await api.commitImportJob(importJob.id);
      alert(res.message);
      setImportJob(null);
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Importni kiritishda xatolik');
    } finally {
      setImportLoading(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    try {
      const updated = await api.updateRestaurant(restaurant.id, settingsForm);
      setRestaurant(updated);
      alert('Restoran sozlamalari muvaffaqiyatli saqlandi!');
    } catch (err: any) {
      alert(err.message || 'Sozlamalarni saqlashda xatolik');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#10100F] flex items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-[#C6A76A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#10100F] text-[#F5F0E8] flex flex-col md:flex-row">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-[#161514] border-r border-[#33302B]/60 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[#C6A76A] text-[#10100F] flex items-center justify-center font-bold font-serif text-lg">
              S
            </div>
            <div>
              <h2 className="font-serif font-bold text-sm text-[#F5F0E8] leading-tight truncate">
                {restaurant?.name}
              </h2>
              <span className="text-[10px] uppercase tracking-wider text-[#A9A39A]">
                Boshqaruv Paneli
              </span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {[
              { id: 'overview', label: 'Umumiy tahlil', icon: TrendingUp },
              { id: 'orders', label: 'Buyurtmalar', icon: ShoppingBag, count: orders.filter((o) => ['Yangi', 'Qabul qilindi', 'Tayyorlanmoqda', 'Tayyor'].includes(o.status)).length },
              { id: 'menu', label: 'Menyu va Taomlar', icon: Utensils, count: dishes.length },
              { id: 'tables', label: 'Stollar & QR kodlar', icon: QrCode, count: tables.length },
              { id: 'import', label: 'Smart Menyu Import', icon: FileSpreadsheet },
              { id: 'settings', label: 'Restoran Sozlamalari', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs uppercase tracking-wider font-semibold transition-all ${
                    isActive
                      ? 'bg-[#C6A76A] text-[#10100F] shadow-gold-glow'
                      : 'text-[#A9A39A] hover:text-[#F5F0E8] hover:bg-[#24221F]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-black/20 text-[#10100F]' : 'bg-[#24221F] text-[#C6A76A]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-8 pt-4 border-t border-[#33302B]/60 text-[11px] text-[#A9A39A]">
          <p className="font-semibold text-[#F5F0E8] truncate">{user?.full_name}</p>
          <p className="text-[10px] text-[#C6A76A] uppercase font-bold">{user?.role || 'Menejer'}</p>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-7xl">
        
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h1 className="font-serif font-bold text-3xl text-[#F5F0E8]">
                Restoran ko‘rsatkichlari
              </h1>
              <p className="text-xs text-[#A9A39A] mt-1">Bugungi real vaqtli tushum va faol buyurtmalar holati</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-6 shadow-sm">
                <span className="text-[10px] uppercase tracking-wider text-[#A9A39A] font-semibold">Bugungi tushum</span>
                <span className="font-serif font-bold text-2xl sm:text-3xl text-[#C6A76A] block mt-2">
                  {formatPrice(stats?.todayRevenue || 0)}
                </span>
                <span className="text-[10px] text-emerald-400 mt-2 block">Real vaqtda yangilanmoqda</span>
              </div>

              <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-6 shadow-sm">
                <span className="text-[10px] uppercase tracking-wider text-[#A9A39A] font-semibold">Bugungi buyurtmalar</span>
                <span className="font-serif font-bold text-2xl sm:text-3xl text-[#F5F0E8] block mt-2">
                  {stats?.todayOrdersCount || 0} ta
                </span>
                <span className="text-[10px] text-[#A9A39A] mt-2 block">O‘rtacha chek: {formatPrice(stats?.averageOrderValue || 0)}</span>
              </div>

              <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-6 shadow-sm">
                <span className="text-[10px] uppercase tracking-wider text-[#A9A39A] font-semibold">Faol buyurtmalar</span>
                <span className="font-serif font-bold text-2xl sm:text-3xl text-amber-400 block mt-2">
                  {stats?.activeOrdersCount || 0} ta
                </span>
                <span className="text-[10px] text-[#A9A39A] mt-2 block">Oshxonada tayyorlanmoqda</span>
              </div>

              <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-6 shadow-sm">
                <span className="text-[10px] uppercase tracking-wider text-[#A9A39A] font-semibold">Jami taomlar soni</span>
                <span className="font-serif font-bold text-2xl sm:text-3xl text-[#F5F0E8] block mt-2">
                  {stats?.totalDishes || dishes.length} ta
                </span>
                <span className="text-[10px] text-[#A9A39A] mt-2 block">{tables.length} ta faol stol</span>
              </div>
            </div>

            {/* 7-Day Revenue Area Chart */}
            <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-6 shadow-sm">
              <h3 className="font-serif font-bold text-lg text-[#F5F0E8] mb-4">
                Oxirgi 7 kunlik tushum dinamikasi
              </h3>
              <div className="h-64 w-full">
                {stats?.revenueChart && stats.revenueChart.length > 0 ? (
                  <ResponsiveContainerAny width="100%" height="100%">
                    <AreaChartAny data={stats.revenueChart}>
                      <defs>
                        <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#C6A76A" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#C6A76A" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxisAny dataKey="day" stroke="#A9A39A" fontSize={11} tickLine={false} />
                      <YAxisAny stroke="#A9A39A" fontSize={11} tickLine={false} tickFormatter={(val: any) => `${val / 1000}k`} />
                      <TooltipAny
                        contentStyle={{ backgroundColor: '#161514', borderColor: '#33302B', borderRadius: '16px', fontSize: '12px' }}
                        formatter={(val: any) => [formatPrice(val), 'Tushum']}
                      />
                      <AreaAny type="monotone" dataKey="revenue" stroke="#C6A76A" strokeWidth={2} fillOpacity={1} fill="url(#goldGradient)" />
                    </AreaChartAny>
                  </ResponsiveContainerAny>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[#A9A39A]">
                    Grafik uchun ma’lumotlar yetarli emas
                  </div>
                )}
              </div>
            </div>

            {/* Popular Dishes List */}
            <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-6 shadow-sm">
              <h3 className="font-serif font-bold text-lg text-[#F5F0E8] mb-4">
                Eng ko‘p buyurtma qilingan taomlar
              </h3>
              <div className="space-y-3">
                {stats?.popularDishes?.map((p: any, i: number) => (
                  <div key={p.name} className="flex items-center justify-between p-3.5 bg-[#24221F] rounded-2xl border border-[#33302B]/60">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 rounded-full bg-[#C6A76A]/20 text-[#C6A76A] text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="font-semibold text-sm text-[#F5F0E8]">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#C6A76A]">{p.orders} marta</span>
                      <span className="text-[10px] text-[#A9A39A] block">{formatPrice(p.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: ORDERS ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif font-bold text-3xl text-[#F5F0E8]">
                  Buyurtmalar nazorati
                </h1>
                <p className="text-xs text-[#A9A39A] mt-1">Real vaqtda yangilanuvchi buyurtmalar ro‘yxati</p>
              </div>

              <button
                onClick={loadAllData}
                className="px-4 py-2 bg-[#1B1A18] hover:bg-[#24221F] text-xs font-semibold rounded-xl border border-[#33302B] flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#C6A76A]" />
                <span>Yangilash</span>
              </button>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="px-3 py-1 rounded-full bg-[#C6A76A]/10 text-[#C6A76A] font-bold text-xs">
                        №{ord.order_number}
                      </span>
                      <span className="text-xs font-bold text-[#F5F0E8]">
                        {ord.table ? `Stol №${ord.table.table_number}` : ord.delivery_fee != null ? 'Yetkazib berish' : 'Olib ketish'}
                      </span>
                      <span className="text-xs text-[#A9A39A]">
                        {new Date(ord.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-[#A9A39A]">
                      Mijoz: <span className="text-[#F5F0E8] font-medium">{ord.customer_name || 'Mehmon'}</span>
                      {ord.customer_phone && ` (${ord.customer_phone})`}
                    </p>

                    {ord.notes && (
                      <p className="text-xs text-amber-300 italic bg-[#24221F] p-2 rounded-xl border border-[#33302B]">
                        "{ord.notes}"
                      </p>
                    )}

                    <div className="space-y-1 pt-1">
                      {ord.items?.map((it) => (
                        <div key={it.id} className="text-xs text-[#F5F0E8] flex items-center space-x-2">
                          <span className="font-bold text-[#C6A76A]">{it.quantity}x</span>
                          <span>{it.dish_name}</span>
                          <span className="text-[#A9A39A]">({formatPrice(it.total_price)})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-[#A9A39A] uppercase tracking-wider block">Jami</span>
                      <span className="font-serif font-bold text-xl text-[#C6A76A]">
                        {formatPrice(ord.total_amount)}
                      </span>
                    </div>

                    {/* Quick status switch buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      {['Yangi', 'Qabul qilindi', 'Tayyorlanmoqda', 'Tayyor', 'Yetkazildi'].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateOrderStatus(ord.id, st)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            ord.status === st
                              ? 'bg-[#C6A76A] text-[#10100F] shadow-gold-glow'
                              : 'bg-[#24221F] text-[#A9A39A] hover:text-[#F5F0E8] border border-[#33302B]'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: MENU ================= */}
        {activeTab === 'menu' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif font-bold text-3xl text-[#F5F0E8]">
                  Menyu va taomlar
                </h1>
                <p className="text-xs text-[#A9A39A] mt-1">{dishes.length} ta gourmet taom mavjud</p>
              </div>

              <button
                onClick={() => setShowDishModal(true)}
                className="px-5 py-3 rounded-2xl bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-gold-glow transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Yangi taom qo‘shish</span>
              </button>
            </div>

            {/* Dishes Table */}
            <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#161514] border-b border-[#33302B] text-[#A9A39A] uppercase tracking-wider">
                  <tr>
                    <th className="py-4 px-6">Taom</th>
                    <th className="py-4 px-4">Kategoriya</th>
                    <th className="py-4 px-4">Narxi</th>
                    <th className="py-4 px-4">Video</th>
                    <th className="py-4 px-4">Mavjudligi</th>
                    <th className="py-4 px-6 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#33302B]/60">
                  {dishes.map((d) => (
                    <tr key={d.id} className="hover:bg-[#24221F]/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <img
                            src={d.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'}
                            alt={d.name}
                            className="w-12 h-12 rounded-xl object-cover bg-[#24221F]"
                          />
                          <div>
                            <span className="font-serif font-bold text-sm text-[#F5F0E8] block">{d.name}</span>
                            <span className="text-[11px] text-[#A9A39A]">{d.weight_or_portion || '1 porsiya'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#A9A39A]">
                        {d.category?.name || 'Asosiy'}
                      </td>
                      <td className="py-4 px-4 font-serif font-bold text-sm text-[#C6A76A]">
                        {formatPrice(d.price)}
                      </td>
                      <td className="py-4 px-4">
                        {d.video_url ? (
                          <span className="text-emerald-400 font-semibold text-[11px]">✓ Faol</span>
                        ) : (
                          <span className="text-[#A9A39A] text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleDishAvailability(d)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${
                            d.is_available
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {d.is_available ? 'Mavjud' : 'Tugagan'}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={async () => {
                            if (confirm(`"${d.name}" taomini o‘chirmoqchimisiz?`)) {
                              await api.deleteMenuItem(d.id);
                              setDishes((prev) => prev.filter((item) => item.id !== d.id));
                            }
                          }}
                          className="p-2 rounded-xl text-[#A9A39A] hover:text-rose-400 hover:bg-[#24221F] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 4: TABLES & QR CODES ================= */}
        {activeTab === 'tables' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif font-bold text-3xl text-[#F5F0E8]">
                  Stollar va QR kodlar
                </h1>
                <p className="text-xs text-[#A9A39A] mt-1">Har bir stol uchun yuqori aniqlikdagi brendlangan QR kodlar</p>
              </div>

              <button
                onClick={handleAddTable}
                className="px-5 py-3 rounded-2xl bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-gold-glow transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Yangi stol qo‘shish</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {tables.map((tbl) => (
                <div
                  key={tbl.id}
                  className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-5 flex flex-col items-center text-center shadow-sm relative group"
                >
                  <span className="font-serif font-bold text-xl text-[#F5F0E8] mb-1">
                    Stol №{tbl.table_number}
                  </span>
                  <span className="text-[11px] text-[#A9A39A] mb-4">
                    {tbl.section} • {tbl.capacity} kishilik
                  </span>

                  {/* QR Image */}
                  <div className="w-40 h-40 bg-white p-2.5 rounded-2xl shadow-md border border-[#33302B]">
                    {tbl.qr_code_url ? (
                      <img src={tbl.qr_code_url} alt={`QR Stol ${tbl.table_number}`} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-black font-bold">QR</div>
                    )}
                  </div>

                  <p className="text-[10px] text-[#A9A39A] mt-3 font-mono">
                    /r/{restaurant?.slug}/menu?table={encodeURIComponent(tbl.table_number)}
                  </p>

                  <div className="mt-4 flex items-center space-x-2 w-full">
                    <button
                      onClick={() => setPrintableTable(tbl)}
                      className="flex-1 py-2 rounded-xl bg-[#24221F] hover:bg-[#C6A76A] text-[#F5F0E8] hover:text-[#10100F] text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Chop etish</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 5: SMART MENU IMPORT ================= */}
        {activeTab === 'import' && (
          <div className="space-y-6 animate-fade-in max-w-4xl">
            <div>
              <h1 className="font-serif font-bold text-3xl text-[#F5F0E8]">
                Smart Menyu Import Tizimi
              </h1>
              <p className="text-xs text-[#A9A39A] mt-1">
                Sayt havolasi, CSV yoki JSON orqali mavjud restoraningiz menyusini 1 daqiqada yuklang.
              </p>
            </div>

            <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-6 sm:p-8 space-y-6">
              <form onSubmit={handleRunUrlImport} className="space-y-4">
                <label className="text-xs uppercase tracking-wider font-semibold text-[#F5F0E8] block">
                  Restoran menyusi havolasi (URL)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A9A39A]" />
                    <input
                      type="url"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="https://example-restaurant.uz/menu"
                      className="w-full bg-[#24221F] border border-[#33302B] rounded-2xl pl-11 pr-4 py-3 text-sm text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={importLoading}
                    className="px-7 py-3 rounded-2xl bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold text-xs uppercase tracking-wider shadow-gold-glow transition-all disabled:opacity-50"
                  >
                    {importLoading ? 'Tahlil qilinmoqda...' : 'Menyuni tahlil qilish'}
                  </button>
                </div>
              </form>

              {importMessage && (
                <div className="p-4 rounded-2xl bg-[#24221F] border border-[#C6A76A]/40 text-xs text-[#F5F0E8] flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C6A76A] flex-shrink-0" />
                  <span>{importMessage}</span>
                </div>
              )}

              {/* Import Preview Table */}
              {importJob && importJob.items && importJob.items.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-[#33302B]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-lg text-[#F5F0E8]">
                      Import qilinadigan taomlar ({importJob.items.length} ta)
                    </h3>
                    <button
                      onClick={handleCommitImport}
                      disabled={importLoading}
                      className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-all"
                    >
                      Hammasini menyuga kiritish ✓
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto rounded-2xl border border-[#33302B]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#161514] border-b border-[#33302B] text-[#A9A39A]">
                        <tr>
                          <th className="p-3">Nomi</th>
                          <th className="p-3">Kategoriya</th>
                          <th className="p-3">Narxi</th>
                          <th className="p-3">Ishonchlilik</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#33302B]/60">
                        {importJob.items.map((it: any) => (
                          <tr key={it.id}>
                            <td className="p-3 font-semibold text-[#F5F0E8]">{it.clean_name}</td>
                            <td className="p-3 text-[#A9A39A]">{it.category_name}</td>
                            <td className="p-3 font-bold text-[#C6A76A]">{it.price ? formatPrice(it.price) : 'Aniqlanmagan'}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                                {Math.round(it.confidence * 100)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 6: SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in max-w-3xl">
            <div>
              <h1 className="font-serif font-bold text-3xl text-[#F5F0E8]">
                Restoran sozlamalari
              </h1>
              <p className="text-xs text-[#A9A39A] mt-1">Brend ranglari va aloqa ma’lumotlarini boshqaring</p>
            </div>

            <form onSubmit={handleSaveSettings} className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-6 sm:p-8 space-y-5">
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-[#A9A39A] block mb-1">
                  Restoran nomi
                </label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="w-full bg-[#24221F] border border-[#33302B] rounded-2xl px-4 py-3 text-sm text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-[#A9A39A] block mb-1">
                  Shior (Tagline)
                </label>
                <input
                  type="text"
                  value={settingsForm.tagline}
                  onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                  className="w-full bg-[#24221F] border border-[#33302B] rounded-2xl px-4 py-3 text-sm text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-[#A9A39A] block mb-1">
                  Tavsif
                </label>
                <textarea
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                  rows={3}
                  className="w-full bg-[#24221F] border border-[#33302B] rounded-2xl px-4 py-3 text-sm text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider font-semibold text-[#A9A39A] block mb-1">
                    Telefon raqam
                  </label>
                  <input
                    type="text"
                    value={settingsForm.phone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                    className="w-full bg-[#24221F] border border-[#33302B] rounded-2xl px-4 py-3 text-sm text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider font-semibold text-[#A9A39A] block mb-1">
                    Manzil
                  </label>
                  <input
                    type="text"
                    value={settingsForm.address}
                    onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                    className="w-full bg-[#24221F] border border-[#33302B] rounded-2xl px-4 py-3 text-sm text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                  />
                </div>
              </div>

              {/* Brand Color Chooser */}
              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-[#A9A39A] block mb-2">
                  Brend rangi
                </label>
                <div className="flex items-center space-x-3">
                  {['#C6A76A', '#10B981', '#3B82F6', '#E11D48', '#8B5CF6', '#F59E0B'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, brand_color: color })}
                      className={`w-9 h-9 rounded-full border-2 transition-transform ${
                        settingsForm.brand_color === color ? 'scale-125 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold text-xs uppercase tracking-wider shadow-gold-glow transition-all"
              >
                Sozlamalarni saqlash
              </button>
            </form>
          </div>
        )}

      </main>

      {/* PRINT TABLE QR MODAL */}
      {printableTable && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-black p-8 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h2 className="font-serif font-bold text-2xl tracking-tight text-[#10100F]">
              {restaurant?.name}
            </h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
              Stol №{printableTable.table_number}
            </p>

            <div className="w-56 h-56 mx-auto bg-gray-50 p-3 rounded-2xl border-2 border-gray-200">
              <img src={printableTable.qr_code_url} alt="QR" className="w-full h-full object-contain" />
            </div>

            <p className="text-xs text-gray-600 font-medium leading-relaxed">
              Menyuni ko‘rish uchun skanerlang
            </p>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-[#10100F] text-white rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Chop etish
              </button>
              <button
                onClick={() => setPrintableTable(null)}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl text-xs font-bold uppercase"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE DISH MODAL */}
      {showDishModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#33302B]">
              <h3 className="font-serif font-bold text-xl text-[#F5F0E8]">Yangi taom qo‘shish</h3>
              <button onClick={() => setShowDishModal(false)} className="text-[#A9A39A] hover:text-[#F5F0E8]">✕</button>
            </div>

            <form onSubmit={handleCreateDish} className="space-y-4 text-xs">
              <div>
                <label className="text-[#A9A39A] uppercase tracking-wider block mb-1">Nomi</label>
                <input
                  type="text"
                  required
                  value={dishForm.name}
                  onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                  placeholder="Masalan: Wagyu Burger Gold"
                  className="w-full bg-[#24221F] border border-[#33302B] rounded-xl px-3 py-2.5 text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#A9A39A] uppercase tracking-wider block mb-1">Kategoriya</label>
                <select
                  value={dishForm.category_id}
                  onChange={(e) => setDishForm({ ...dishForm, category_id: e.target.value })}
                  className="w-full bg-[#24221F] border border-[#33302B] rounded-xl px-3 py-2.5 text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#A9A39A] uppercase tracking-wider block mb-1">Narxi (so‘m)</label>
                <input
                  type="number"
                  required
                  value={dishForm.price}
                  onChange={(e) => setDishForm({ ...dishForm, price: parseInt(e.target.value, 10) })}
                  className="w-full bg-[#24221F] border border-[#33302B] rounded-xl px-3 py-2.5 text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#A9A39A] uppercase tracking-wider block mb-1">Tavsifi</label>
                <textarea
                  value={dishForm.description}
                  onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
                  rows={2}
                  className="w-full bg-[#24221F] border border-[#33302B] rounded-xl px-3 py-2 text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#A9A39A] uppercase tracking-wider block mb-1">Foto URL</label>
                <input
                  type="url"
                  value={dishForm.image_url}
                  onChange={(e) => setDishForm({ ...dishForm, image_url: e.target.value })}
                  className="w-full bg-[#24221F] border border-[#33302B] rounded-xl px-3 py-2.5 text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#A9A39A] uppercase tracking-wider block mb-1">Qisqa Video URL (MP4 / WebM)</label>
                <input
                  type="url"
                  value={dishForm.video_url}
                  onChange={(e) => setDishForm({ ...dishForm, video_url: e.target.value })}
                  placeholder="https://.../video.mp4"
                  className="w-full bg-[#24221F] border border-[#33302B] rounded-xl px-3 py-2.5 text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold rounded-2xl uppercase tracking-wider shadow-gold-glow mt-4"
              >
                Taomni saqlash
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardPage;
