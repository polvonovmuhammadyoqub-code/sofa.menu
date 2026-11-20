import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Order, OrderStatus } from '../types';
import { useI18n } from '../lib/i18n';
import api from '../lib/api';
import { X, CheckCircle, Clock, UtensilsCrossed, BellRing, Sparkles } from 'lucide-react';

interface LiveOrderModalProps {
  initialOrder: Order;
  onClose: () => void;
}

export const LiveOrderModal: React.FC<LiveOrderModalProps> = ({ initialOrder, onClose }) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const { formatPrice, t } = useI18n();

  useEffect(() => {
    const socket: Socket = io();
    socket.emit('join:order', initialOrder.id);

    socket.on('order:status_update', (updatedOrder: Order) => {
      if (updatedOrder.id === initialOrder.id) {
        setOrder(updatedOrder);
      }
    });

    // Also poll every 10s as fallback
    const interval = setInterval(async () => {
      try {
        const fresh = await api.getOrderById(initialOrder.id);
        if (fresh) setOrder(fresh);
      } catch {
        // ignore
      }
    }, 10000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [initialOrder.id]);

  const stages: Array<{ status: OrderStatus; label: string; icon: any }> = [
    { status: 'Yangi', label: t.statusYangi, icon: Clock },
    { status: 'Qabul qilindi', label: t.statusQabul, icon: BellRing },
    { status: 'Tayyorlanmoqda', label: t.statusTayyorlanmoqda, icon: UtensilsCrossed },
    { status: 'Tayyor', label: t.statusTayyor, icon: Sparkles },
    { status: 'Yetkazildi', label: t.statusYetkazildi, icon: CheckCircle },
  ];

  const currentStageIndex = stages.findIndex((s) => s.status === order.status);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div
        className="relative bg-[#1B1A18] border border-[#33302B] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#A9A39A] hover:text-[#F5F0E8] hover:bg-[#24221F] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header */}
        <div className="text-center pt-2 pb-6 border-b border-[#33302B]">
          <span className="inline-block px-3 py-1 rounded-full bg-[#C6A76A]/10 text-[#C6A76A] text-xs font-semibold uppercase tracking-wider mb-2">
            Buyurtma №{order.order_number}
          </span>
          <h3 className="font-serif font-bold text-2xl text-[#F5F0E8]">
            {t.orderStatus}
          </h3>
          <p className="text-xs text-[#A9A39A] mt-1">
            {order.table?.table_number ? `Stol №${order.table.table_number}` : 'Olib ketish'} • {order.customer_name || 'Mehmon'}
          </p>
        </div>

        {/* Step Progression Timeline */}
        <div className="py-6 space-y-4">
          {stages.map((stage, idx) => {
            const isCompleted = currentStageIndex >= idx;
            const isCurrent = currentStageIndex === idx;
            const Icon = stage.icon;

            return (
              <div key={stage.status} className="flex items-center space-x-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-[#C6A76A] text-[#10100F] shadow-gold-glow animate-pulse'
                      : isCompleted
                      ? 'bg-[#2E2B27] text-[#C6A76A] border border-[#C6A76A]/40'
                      : 'bg-[#24221F] text-[#A9A39A]/40 border border-[#33302B]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1">
                  <h4
                    className={`text-sm font-semibold ${
                      isCurrent
                        ? 'text-[#C6A76A]'
                        : isCompleted
                        ? 'text-[#F5F0E8]'
                        : 'text-[#A9A39A]/50'
                    }`}
                  >
                    {stage.label}
                  </h4>
                  {isCurrent && (
                    <span className="text-[11px] text-[#A9A39A] block mt-0.5">
                      Hozirda bajarilmoqda...
                    </span>
                  )}
                </div>

                {isCompleted && !isCurrent && (
                  <CheckCircle className="w-4 h-4 text-[#C6A76A]" />
                )}
              </div>
            );
          })}
        </div>

        {/* Order Items Summary */}
        <div className="bg-[#24221F] rounded-2xl p-4 border border-[#33302B]/60 space-y-2 mt-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#A9A39A] pb-2 border-b border-[#33302B]">
            <span>Taomlar</span>
            <span>Jami: {formatPrice(order.total_amount)}</span>
          </div>
          {order.items?.map((it) => (
            <div key={it.id} className="flex items-center justify-between text-xs text-[#F5F0E8]">
              <span className="truncate pr-2">
                {it.quantity}x {it.dish_name}
              </span>
              <span className="text-[#C6A76A] font-medium whitespace-nowrap">
                {formatPrice(it.total_price)}
              </span>
            </div>
          ))}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-3.5 rounded-2xl bg-[#24221F] hover:bg-[#33302B] text-[#F5F0E8] text-xs uppercase tracking-wider font-semibold transition-colors border border-[#33302B]"
        >
          Yopish
        </button>
      </div>
    </div>
  );
};

export default LiveOrderModal;
