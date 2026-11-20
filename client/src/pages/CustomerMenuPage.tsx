import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Restaurant, MenuItem, Category, Order } from '../types';
import { useCart } from '../context/CartContext';
import { useI18n } from '../lib/i18n';
import api from '../lib/api';
import FoodCard from '../components/FoodCard';
import FoodDetailModal from '../components/FoodDetailModal';
import VideoFoodSection from '../components/VideoFoodSection';
import CartDrawer from '../components/CartDrawer';
import LiveOrderModal from '../components/LiveOrderModal';
import { Search, LayoutGrid, List, Bell, Clock, MapPin, Sparkles, Phone, CheckCircle2 } from 'lucide-react';

interface CustomerMenuPageProps {
  restaurantSlug?: string;
  initialTable?: string | null;
}

export const CustomerMenuPage: React.FC<CustomerMenuPageProps> = ({ restaurantSlug = 'sofa-signature', initialTable }) => {
  const { tableNumber, setTableNumber, setIsCartOpen, totalCount } = useCart();
  const { t, formatPrice, lang } = useI18n();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<MenuItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [activeLiveOrder, setActiveLiveOrder] = useState<Order | null>(null);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Set initial table from props or URL
  useEffect(() => {
    if (initialTable) {
      setTableNumber(initialTable);
    }
  }, [initialTable, setTableNumber]);

  // Load Restaurant & Menu Data
  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        setLoading(true);
        const data = await api.getRestaurantBySlug(restaurantSlug);
        setRestaurant(data);
        if (data.categories) {
          setCategories(data.categories);
          // Flatten all menu items
          const allItems: MenuItem[] = [];
          for (const cat of data.categories) {
            if (cat.menu_items) {
              allItems.push(...cat.menu_items);
            }
          }
          setDishes(allItems);
        }
      } catch (err) {
        console.error('Failed to load menu:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRestaurant();
  }, [restaurantSlug]);

  const handleCallWaiter = () => {
    if (!restaurant) return;
    const socket: Socket = io();
    socket.emit('table:call_waiter', {
      restaurantId: restaurant.id,
      tableNumber: tableNumber || 'Belgilanmagan',
      requestType: 'Mehmon ofitsiantni kutmoqda',
    });
    setWaiterCalled(true);
    setTimeout(() => setWaiterCalled(false), 5000);
  };

  // Filter dishes by category and search
  const filteredDishes = dishes.filter((dish) => {
    const matchesCategory = activeCategoryId === 'all' || dish.category_id === activeCategoryId;
    const title = (lang === 'ru' && dish.name_ru ? dish.name_ru : lang === 'en' && dish.name_en ? dish.name_en : dish.name).toLowerCase();
    const desc = (dish.description || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || title.includes(q) || desc.includes(q);
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#10100F] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#C6A76A]/20 border border-[#C6A76A] flex items-center justify-center animate-pulse mb-4">
          <span className="font-serif font-bold text-xl text-[#C6A76A]">S</span>
        </div>
        <p className="font-serif text-[#F5F0E8] text-lg">Restoran menyusi yuklanmoqda...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#10100F] flex items-center justify-center p-4 text-center">
        <div>
          <h2 className="font-serif font-bold text-2xl text-[#F5F0E8]">Restoran topilmadi</h2>
          <p className="text-xs text-[#A9A39A] mt-2">Iltimos, QR kod yoki havolani qayta tekshiring.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#10100F] text-[#F5F0E8] pb-28">
      
      {/* 1. BRANDED HERO HEADER */}
      <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden bg-[#161514]">
        <img
          src={restaurant.hero_image || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1600&q=85'}
          alt={restaurant.name}
          className="w-full h-full object-cover brightness-75 scale-102"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#10100F] via-[#10100F]/40 to-black/30" />

        {/* Floating Table Badge */}
        {tableNumber && (
          <div className="absolute top-4 left-4 z-20">
            <div className="bg-[#10100F]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#C6A76A]/40 text-[#C6A76A] font-bold text-xs flex items-center space-x-1.5 shadow-gold-glow">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{t.table} №{tableNumber}</span>
            </div>
          </div>
        )}

        {/* Call Waiter Action Button */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={handleCallWaiter}
            className={`px-3.5 py-1.5 rounded-full backdrop-blur-md border text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-lg ${
              waiterCalled
                ? 'bg-emerald-500 text-white border-emerald-400'
                : 'bg-[#10100F]/90 text-[#F5F0E8] hover:text-[#C6A76A] border-[#33302B] hover:border-[#C6A76A]'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-[#C6A76A]" />
            <span>{waiterCalled ? t.waiterCalled : t.callWaiter}</span>
          </button>
        </div>

        {/* Restaurant Title & Info in Hero */}
        <div className="absolute bottom-6 left-4 right-4 max-w-7xl mx-auto flex items-end justify-between">
          <div>
            <div className="flex items-center space-x-2 text-[11px] uppercase tracking-widest text-[#C6A76A] font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Haute Gastronomie</span>
            </div>
            <h1 className="font-serif font-extrabold text-3xl sm:text-5xl text-[#F5F0E8] tracking-tight">
              {restaurant.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#A9A39A] mt-1 max-w-xl line-clamp-2">
              {restaurant.tagline || restaurant.description}
            </p>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & VIEW CONTROLS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex items-center justify-between gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A9A39A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-[#1B1A18] border border-[#33302B] rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm text-[#F5F0E8] placeholder-[#A9A39A]/60 focus:outline-none focus:border-[#C6A76A] transition-colors"
            />
          </div>

          {/* Grid / List Switcher */}
          <div className="flex items-center bg-[#1B1A18] border border-[#33302B] rounded-2xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-colors ${
                viewMode === 'grid' ? 'bg-[#C6A76A] text-[#10100F]' : 'text-[#A9A39A] hover:text-[#F5F0E8]'
              }`}
              title="Katta kartochkalar"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-colors ${
                viewMode === 'list' ? 'bg-[#C6A76A] text-[#10100F]' : 'text-[#A9A39A] hover:text-[#F5F0E8]'
              }`}
              title="Kompakt ro‘yxat"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. STICKY CATEGORIES BAR */}
      <div className="sticky top-20 z-30 bg-[#10100F]/95 backdrop-blur-md border-b border-[#33302B]/60 py-3 mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveCategoryId('all')}
            className={`px-4 py-2 rounded-2xl text-xs uppercase tracking-wider font-semibold whitespace-nowrap transition-all ${
              activeCategoryId === 'all'
                ? 'bg-[#C6A76A] text-[#10100F] shadow-gold-glow'
                : 'bg-[#1B1A18] text-[#A9A39A] hover:text-[#F5F0E8] border border-[#33302B]'
            }`}
          >
            {t.allDishes} ({dishes.length})
          </button>

          {categories.map((cat) => {
            const count = cat.menu_items?.length || 0;
            const catName = lang === 'ru' && cat.name_ru ? cat.name_ru : lang === 'en' && cat.name_en ? cat.name_en : cat.name;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`px-4 py-2 rounded-2xl text-xs uppercase tracking-wider font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                  activeCategoryId === cat.id
                    ? 'bg-[#C6A76A] text-[#10100F] shadow-gold-glow'
                    : 'bg-[#1B1A18] text-[#A9A39A] hover:text-[#F5F0E8] border border-[#33302B]'
                }`}
              >
                <span>{catName}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCategoryId === cat.id ? 'bg-black/20 text-[#10100F]' : 'bg-[#24221F] text-[#A9A39A]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. CINEMATIC VIDEO SECTION ("Taomlarni jonli ko'ring") */}
      {activeCategoryId === 'all' && !searchQuery && (
        <VideoFoodSection items={dishes} onSelectDish={(dish) => setSelectedDish(dish)} />
      )}

      {/* 5. DISHES COLLECTION GRID / LIST */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        
        {/* Category Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#F5F0E8]">
            {activeCategoryId === 'all' ? t.allDishes : categories.find((c) => c.id === activeCategoryId)?.name}
          </h2>
          <span className="text-xs text-[#A9A39A]">
            {filteredDishes.length} ta taom
          </span>
        </div>

        {filteredDishes.length === 0 ? (
          <div className="py-20 text-center bg-[#1B1A18] rounded-3xl border border-[#33302B]">
            <p className="font-serif text-lg text-[#F5F0E8]">Hech qanday taom topilmadi</p>
            <p className="text-xs text-[#A9A39A] mt-1">Boshqa kalit so‘z bilan qidirib ko‘ring.</p>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4 max-w-4xl mx-auto'
            }
          >
            {filteredDishes.map((dish) => (
              <FoodCard
                key={dish.id}
                item={dish}
                onSelect={(selected) => setSelectedDish(selected)}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </main>

      {/* 6. FLOATING BOTTOM CART BAR (MOBILE-FIRST) */}
      {totalCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto animate-slide-up">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full py-4 px-6 rounded-2xl bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold text-sm tracking-wide flex items-center justify-between shadow-2xl shadow-[#C6A76A]/40 transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center space-x-2.5">
              <span className="w-6 h-6 rounded-full bg-[#10100F] text-[#C6A76A] flex items-center justify-center text-xs font-bold">
                {totalCount}
              </span>
              <span>{t.yourOrder}</span>
            </div>

            <span className="font-serif font-bold text-base">
              {t.confirmOrder} →
            </span>
          </button>
        </div>
      )}

      {/* 7. MODALS */}
      <FoodDetailModal
        item={selectedDish}
        onClose={() => setSelectedDish(null)}
      />

      <CartDrawer
        restaurantId={restaurant.id}
        onOrderSuccess={(order) => setActiveLiveOrder(order)}
      />

      {activeLiveOrder && (
        <LiveOrderModal
          initialOrder={activeLiveOrder}
          onClose={() => setActiveLiveOrder(null)}
        />
      )}

    </div>
  );
};

export default CustomerMenuPage;
