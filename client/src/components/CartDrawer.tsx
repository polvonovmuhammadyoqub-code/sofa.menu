import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { useCart } from '../context/CartContext';
import { useI18n } from '../lib/i18n';
import api from '../lib/api';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Utensils, CheckCircle } from 'lucide-react';
import { Order } from '../types';

interface CartDrawerProps {
  restaurantId: string;
  onOrderSuccess: (order: Order) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ restaurantId, onOrderSuccess }) => {
  const { items, removeFromCart, updateQuantity, clearCart, totalAmount, totalCount, isCartOpen, setIsCartOpen, tableNumber, setTableNumber } = useCart();
  const { formatPrice, t, lang } = useI18n();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isCartOpen) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        restaurant_id: restaurantId,
        table_number: tableNumber || undefined,
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        notes: orderNotes.trim() || undefined,
        items: items.map((item) => ({
          menu_item_id: item.menuItem.id,
          quantity: item.quantity,
          selected_options: item.selectedOptions,
          notes: item.notes,
        })),
      };

      const result = await api.createOrder(payload);

      // Trigger celebration confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C6A76A', '#D8B98A', '#F5F0E8'],
      });

      clearCart();
      setIsCartOpen(false);
      onOrderSuccess(result.order);
    } catch (err: any) {
      setErrorMessage(err.message || 'Buyurtma berishda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex justify-end animate-fade-in">
      <div
        className="w-full max-w-md bg-[#1B1A18] border-l border-[#33302B] h-full flex flex-col shadow-2xl relative animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#33302B] flex items-center justify-between bg-[#161514]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#C6A76A]/10 text-[#C6A76A]">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#F5F0E8]">{t.cart}</h3>
              <span className="text-xs text-[#A9A39A]">{totalCount} ta taom</span>
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 rounded-xl text-[#A9A39A] hover:text-[#F5F0E8] hover:bg-[#24221F] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#24221F] flex items-center justify-center text-[#A9A39A] mb-4">
                <Utensils className="w-7 h-7 text-[#C6A76A]/60" />
              </div>
              <h4 className="font-serif font-bold text-lg text-[#F5F0E8]">{t.emptyCart}</h4>
              <p className="text-xs text-[#A9A39A] mt-1 max-w-xs mx-auto leading-relaxed">
                {t.emptyCartDesc}
              </p>
            </div>
          ) : (
            items.map((item, index) => {
              const title = lang === 'ru' && item.menuItem.name_ru ? item.menuItem.name_ru : lang === 'en' && item.menuItem.name_en ? item.menuItem.name_en : item.menuItem.name;

              return (
                <div
                  key={`${item.menuItem.id}-${index}`}
                  className="bg-[#24221F] border border-[#33302B]/60 rounded-2xl p-3.5 flex space-x-3.5 relative group"
                >
                  <img
                    src={item.menuItem.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'}
                    alt={title}
                    className="w-16 h-16 rounded-xl object-cover bg-[#10100F] flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className="font-serif font-bold text-sm text-[#F5F0E8] truncate pr-2">
                        {title}
                      </h4>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-[#A9A39A] hover:text-rose-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Selected Options */}
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <p className="text-[11px] text-[#C6A76A] mt-0.5 truncate">
                        + {item.selectedOptions.join(', ')}
                      </p>
                    )}

                    {/* Special notes */}
                    {item.notes && (
                      <p className="text-[10px] text-[#A9A39A] italic mt-0.5 truncate">
                        "{item.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <span className="font-serif font-bold text-sm text-[#C6A76A]">
                        {formatPrice(item.itemTotal)}
                      </span>

                      {/* Quantity Selector */}
                      <div className="flex items-center space-x-1.5 bg-[#1B1A18] rounded-xl border border-[#33302B] p-0.5">
                        <button
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          className="p-1 rounded-lg hover:bg-[#33302B] text-[#A9A39A] hover:text-[#F5F0E8]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-[#F5F0E8]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="p-1 rounded-lg hover:bg-[#33302B] text-[#A9A39A] hover:text-[#F5F0E8]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Checkout Form */}
        {items.length > 0 && (
          <form onSubmit={handleCheckout} className="p-5 bg-[#161514] border-t border-[#33302B] space-y-4">
            
            {/* Table Number & Customer Details */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#A9A39A] block mb-1 font-semibold">
                  {t.table} raqami
                </label>
                <input
                  type="text"
                  value={tableNumber || ''}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="№12"
                  className="w-full bg-[#24221F] border border-[#33302B] rounded-xl px-3 py-2 text-xs text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#A9A39A] block mb-1 font-semibold">
                  Ismingiz (ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Masalan: Sardor"
                  className="w-full bg-[#24221F] border border-[#33302B] rounded-xl px-3 py-2 text-xs text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#A9A39A] block mb-1 font-semibold">
                Oshxona uchun izoh
              </label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Buyurtma bo‘yicha qo‘shimcha eslatma..."
                className="w-full bg-[#24221F] border border-[#33302B] rounded-xl px-3 py-2 text-xs text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
              />
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                {errorMessage}
              </p>
            )}

            {/* Total Row */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs uppercase tracking-wider text-[#A9A39A] font-semibold">
                {t.orderTotal}
              </span>
              <span className="font-serif font-bold text-xl text-[#C6A76A]">
                {formatPrice(totalAmount)}
              </span>
            </div>

            {/* Confirm Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold text-sm tracking-wider uppercase flex items-center justify-center space-x-2 shadow-gold-glow transition-all disabled:opacity-50"
            >
              <span>{submitting ? 'Yuborilmoqda...' : t.confirmOrder}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
