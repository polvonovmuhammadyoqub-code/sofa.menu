import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Order, RestaurantTable } from '../types';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../context/AuthContext';
import api, { getAuthToken } from '../lib/api';
import { UtensilsCrossed, Bell, CheckCircle2, Clock, MapPin, Sparkles, AlertCircle } from 'lucide-react';

export const WaiterPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; time: string }>>([]);
  const [loading, setLoading] = useState(true);
  const { formatPrice } = useI18n();

  const loadWaiterData = async () => {
    try {
      setLoading(true);
      const id = user?.restaurantId ?? (user?.role === 'SUPER_ADMIN'
        ? (await api.getRestaurantBySlug('sofa-signature')).id : undefined);
      if (!id) return;
      setRestaurantId(id);

      const tablesList = await api.getTables(id);
      setTables(tablesList);

      const ordersList = await api.listOrders(id);
      setOrders(ordersList.filter((o) => ['Yangi', 'Qabul qilindi', 'Tayyorlanmoqda', 'Tayyor'].includes(o.status)));
    } catch (err) {
      console.error('Failed to load waiter data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWaiterData();
  }, []);

  // Socket for waiter calls & orders
  useEffect(() => {
    if (!restaurantId) return;

    const socket: Socket = io({ auth: { token: getAuthToken() } });
    socket.on('connect', () => {
      socket.emit('join:waiter', restaurantId);
      socket.emit('join:restaurant', restaurantId);
    });

    socket.on('waiter:notification', (data: any) => {
      setNotifications((prev) => [
        {
          id: Date.now().toString(),
          title: data.title || 'Ofitsiant chaqirildi',
          message: data.message || 'Mijoz kutmoqda',
          time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
    });

    socket.on('waiter:new_order', (newOrder: Order) => {
      setOrders((prev) => [newOrder, ...prev]);
    });

    socket.on('waiter:order_updated', (updated: Order) => {
      setOrders((prev) => {
        if (['Yetkazildi', 'Bekor qilindi'].includes(updated.status)) {
          return prev.filter((o) => o.id !== updated.id);
        }
        return prev.map((o) => (o.id === updated.id ? updated : o));
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurantId]);

  const handleMarkDelivered = async (orderId: string) => {
    try {
      await api.updateOrderStatus(orderId, 'Yetkazildi');
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: any) {
      alert(err.message || 'Holatni yangilashda xatolik');
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#10100F] flex items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-[#C6A76A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const readyOrders = orders.filter((o) => o.status === 'Tayyor');

  return (
    <div className="min-h-screen bg-[#10100F] text-[#F5F0E8] p-4 sm:p-6 max-w-5xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#33302B] mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C6A76A] text-[#10100F] flex items-center justify-center font-bold">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-2xl text-[#F5F0E8]">
              Ofitsiant Paneli
            </h1>
            <span className="text-xs text-[#A9A39A]">Faol stollar va yetkazish nazorati</span>
          </div>
        </div>
      </div>

      {/* Guest Call Notifications */}
      {notifications.length > 0 && (
        <div className="mb-6 space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between text-amber-200 animate-slide-up"
            >
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5 text-amber-400 animate-bounce" />
                <div>
                  <h4 className="font-bold text-sm text-[#F5F0E8]">{n.title}</h4>
                  <p className="text-xs text-amber-300">{n.message} • {n.time}</p>
                </div>
              </div>
              <button
                onClick={() => dismissNotification(n.id)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-black font-bold text-xs"
              >
                Qabul qildim ✓
              </button>
            </div>
          ))}
        </div>
      )}

      {/* READY ORDERS (PRIORITY ALERT) */}
      {readyOrders.length > 0 && (
        <div className="mb-8 bg-[#18231C] border border-emerald-500/50 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm mb-4 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Stolga yetkazishga tayyor taomlar!</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readyOrders.map((ord) => (
              <div key={ord.id} className="bg-[#10100F] border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="font-serif font-bold text-xl text-[#F5F0E8]">
                    {ord.table ? `Stol №${ord.table.table_number}` : ord.delivery_fee != null ? 'Yetkazib berish' : 'Olib ketish'}
                  </span>
                  <p className="text-xs text-[#C6A76A] mt-0.5">
                    Buyurtma №{ord.order_number} • {ord.items?.length} ta taom
                  </p>
                </div>

                <button
                  onClick={() => handleMarkDelivered(ord.id)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Yetkazildi</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVE ORDERS LIST */}
      <div>
        <h3 className="font-serif font-bold text-xl text-[#F5F0E8] mb-4">
          Barcha faol buyurtmalar ({orders.length} ta)
        </h3>

        <div className="space-y-4">
          {orders.map((ord) => (
            <div
              key={ord.id}
              className="bg-[#1B1A18] border border-[#33302B] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-serif font-bold text-lg text-[#F5F0E8]">
                    {ord.table ? `Stol №${ord.table.table_number}` : ord.delivery_fee != null ? 'Yetkazib berish' : 'Olib ketish'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#C6A76A]/10 text-[#C6A76A] text-xs font-bold">
                    №{ord.order_number}
                  </span>
                  <span className="text-xs text-[#A9A39A]">
                    {ord.status}
                  </span>
                </div>

                <p className="text-xs text-[#A9A39A] mt-1">
                  {ord.items?.map((i) => `${i.quantity}x ${i.dish_name}`).join(', ')}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <span className="font-serif font-bold text-sm text-[#C6A76A]">
                  {formatPrice(ord.total_amount)}
                </span>
                {ord.status === 'Tayyor' && (
                  <button
                    onClick={() => handleMarkDelivered(ord.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs"
                  >
                    Yetkazildi ✓
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default WaiterPage;
