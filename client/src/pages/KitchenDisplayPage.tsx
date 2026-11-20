import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Order } from '../types';
import { useI18n } from '../lib/i18n';
import api from '../lib/api';
import { ChefHat, Clock, AlertTriangle, CheckCircle, Bell, RefreshCw } from 'lucide-react';

export const KitchenDisplayPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Play audio chime on new orders
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // audio permission
    }
  };

  const loadKitchenOrders = async () => {
    try {
      setLoading(true);
      const rest = await api.getRestaurantBySlug('sofa-signature');
      setRestaurantId(rest.id);
      const list = await api.listOrders(rest.id);
      // Kitchen cares about active orders
      const active = list.filter((o) => ['Yangi', 'Qabul qilindi', 'Tayyorlanmoqda', 'Tayyor'].includes(o.status));
      setOrders(active);
    } catch (err) {
      console.error('Failed to load kitchen orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKitchenOrders();
  }, []);

  // Real-time socket listener
  useEffect(() => {
    if (!restaurantId) return;

    const socket: Socket = io();
    socket.emit('join:kitchen', restaurantId);

    socket.on('kitchen:new_order', (newOrder: Order) => {
      setOrders((prev) => [newOrder, ...prev]);
      playChime();
    });

    socket.on('kitchen:order_updated', (updated: Order) => {
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
  }, [restaurantId, soundEnabled]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const updated = await api.updateOrderStatus(orderId, status);
      if (['Yetkazildi', 'Bekor qilindi'].includes(status)) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      }
    } catch (err: any) {
      alert(err.message || 'Holatni yangilashda xatolik');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0C0B0B] flex items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-[#C6A76A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0C0B0B] text-[#F5F0E8] p-4 sm:p-6">
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#24221F] mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C6A76A] text-[#10100F] flex items-center justify-center font-bold">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-2xl tracking-wide text-[#F5F0E8]">
              Oshxona Displeyi (KDS)
            </h1>
            <span className="text-xs text-[#A9A39A]">
              Faol buyurtmalar: <strong className="text-[#C6A76A]">{orders.length} ta</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              soundEnabled
                ? 'bg-[#C6A76A]/10 border-[#C6A76A] text-[#C6A76A]'
                : 'bg-[#1B1A18] border-[#33302B] text-[#A9A39A]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{soundEnabled ? 'Ovozli signal: Yoqilgan' : 'Ovoz o‘chirilgan'}</span>
          </button>

          <button
            onClick={loadKitchenOrders}
            className="p-2 rounded-xl bg-[#1B1A18] border border-[#33302B] text-[#A9A39A] hover:text-[#F5F0E8]"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {orders.length === 0 ? (
        <div className="py-32 text-center">
          <div className="w-16 h-16 rounded-full bg-[#1B1A18] flex items-center justify-center mx-auto text-[#A9A39A] mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="font-serif font-bold text-xl text-[#F5F0E8]">Barcha buyurtmalar tayyor!</h3>
          <p className="text-xs text-[#A9A39A] mt-1">Yangi buyurtmalar kelishi bilan avtomatik ekranda paydo bo‘ladi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {orders.map((ord) => {
            const isNew = ord.status === 'Yangi';
            const isCooking = ord.status === 'Tayyorlanmoqda';
            const isReady = ord.status === 'Tayyor';

            return (
              <div
                key={ord.id}
                className={`rounded-3xl p-6 flex flex-col justify-between border-2 transition-all shadow-xl ${
                  isNew
                    ? 'bg-[#1B1A18] border-amber-500/80 animate-pulse'
                    : isCooking
                    ? 'bg-[#1B1A18] border-[#C6A76A]'
                    : isReady
                    ? 'bg-[#18231C] border-emerald-500'
                    : 'bg-[#1B1A18] border-[#33302B]'
                }`}
              >
                <div>
                  {/* Ticket Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#33302B]">
                    <div>
                      <span className="font-serif font-bold text-2xl text-[#F5F0E8]">
                        №{ord.order_number}
                      </span>
                      <span className="ml-2 font-bold text-base text-[#C6A76A]">
                        {ord.table ? `Stol №${ord.table.table_number}` : 'Olib ketish'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-xs text-[#A9A39A]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(ord.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Customer Notes */}
                  {ord.notes && (
                    <div className="my-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 font-medium flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>"{ord.notes}"</span>
                    </div>
                  )}

                  {/* Dish Items */}
                  <div className="py-4 space-y-3">
                    {ord.items?.map((it) => (
                      <div key={it.id} className="flex items-start justify-between bg-[#121110] p-3 rounded-xl border border-[#24221F]">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-lg bg-[#C6A76A] text-[#10100F] font-bold text-xs flex items-center justify-center">
                              {it.quantity}x
                            </span>
                            <span className="font-serif font-bold text-sm text-[#F5F0E8]">{it.dish_name}</span>
                          </div>
                          {it.selected_options && (
                            <p className="text-[11px] text-[#C6A76A] ml-8 mt-1">
                              + {it.selected_options.replace(/[[\]"]/g, '')}
                            </p>
                          )}
                          {it.notes && (
                            <p className="text-[10px] text-amber-300 italic ml-8 mt-0.5">
                              "{it.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Advancement Buttons */}
                <div className="pt-4 border-t border-[#33302B] flex items-center gap-2">
                  {isNew && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'Qabul qilindi')}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all"
                    >
                      Qabul qilish ✓
                    </button>
                  )}

                  {(isNew || ord.status === 'Qabul qilindi') && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'Tayyorlanmoqda')}
                      className="flex-1 py-3 bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold text-xs uppercase tracking-wider rounded-xl shadow-gold-glow transition-all"
                    >
                      Pishirishni boshlash 🍳
                    </button>
                  )}

                  {isCooking && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'Tayyor')}
                      className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all"
                    >
                      Tayyor (Ofitsiantni chaqirish) ✨
                    </button>
                  )}

                  {isReady && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'Yetkazildi')}
                      className="flex-1 py-3 bg-[#24221F] hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                    >
                      Stolga yetkazildi ✓
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default KitchenDisplayPage;
