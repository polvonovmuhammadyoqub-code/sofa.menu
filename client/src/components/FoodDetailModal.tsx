import React, { useState } from 'react';
import { MenuItem } from '../types';
import { useCart } from '../context/CartContext';
import { useI18n } from '../lib/i18n';
import { X, Clock, Flame, AlertCircle, Plus, Minus, ShoppingBag, Volume2, VolumeX, Check } from 'lucide-react';

interface FoodDetailModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

export const FoodDetailModal: React.FC<FoodDetailModalProps> = ({ item, onClose }) => {
  const { addToCart } = useCart();
  const { formatPrice, t, lang } = useI18n();

  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [specialNotes, setSpecialNotes] = useState('');
  const [activeMedia, setActiveMedia] = useState<'image' | 'video'>('image');
  const [isMuted, setIsMuted] = useState(true);

  if (!item) return null;

  const title = lang === 'ru' && item.name_ru ? item.name_ru : lang === 'en' && item.name_en ? item.name_en : item.name;
  const description = lang === 'ru' && item.description_ru ? item.description_ru : lang === 'en' && item.description_en ? item.description_en : item.description;

  const handleOptionToggle = (optionName: string) => {
    setSelectedOptions((prev) =>
      prev.includes(optionName) ? prev.filter((o) => o !== optionName) : [...prev, optionName]
    );
  };

  // Calculate dynamic unit price with options
  let unitPrice = item.price;
  if (item.options) {
    for (const opt of item.options) {
      if (selectedOptions.includes(opt.name)) {
        unitPrice += opt.price_modifier;
      }
    }
  }
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    addToCart(item, quantity, selectedOptions, specialNotes.trim() ? specialNotes.trim() : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div
        className="relative bg-[#1B1A18] border border-[#33302B] rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-[#10100F]/80 backdrop-blur-md text-[#F5F0E8] hover:text-[#C6A76A] border border-[#33302B] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Media Hero */}
        <div className="relative w-full h-72 sm:h-96 bg-[#10100F] overflow-hidden flex-shrink-0">
          {item.video_url && activeMedia === 'video' ? (
            <div className="relative w-full h-full">
              <video
                src={item.video_url}
                poster={item.video_poster || item.image_url}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="absolute bottom-4 right-4 z-20 p-2 rounded-full bg-[#10100F]/80 backdrop-blur-md text-[#F5F0E8] border border-[#33302B]"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#C6A76A]" />}
              </button>
            </div>
          ) : (
            <img
              src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=85'}
              alt={title}
              className="w-full h-full object-cover"
            />
          )}

          {/* Media Switcher Tab (if video available) */}
          {item.video_url && (
            <div className="absolute bottom-4 left-4 z-20 flex items-center space-x-2 bg-[#10100F]/80 backdrop-blur-md p-1 rounded-xl border border-[#33302B]">
              <button
                onClick={() => setActiveMedia('image')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeMedia === 'image' ? 'bg-[#C6A76A] text-[#10100F] font-semibold' : 'text-[#A9A39A] hover:text-[#F5F0E8]'
                }`}
              >
                Foto
              </button>
              <button
                onClick={() => setActiveMedia('video')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeMedia === 'video' ? 'bg-[#C6A76A] text-[#10100F] font-semibold' : 'text-[#A9A39A] hover:text-[#F5F0E8]'
                }`}
              >
                Video taom
              </button>
            </div>
          )}
        </div>

        {/* Details & Customizations */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[#F5F0E8]">
                {title}
              </h2>
              {item.popularity_badge && (
                <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#C6A76A]/20 text-[#C6A76A] border border-[#C6A76A]/40">
                  {item.popularity_badge}
                </span>
              )}
            </div>

            <p className="text-sm text-[#A9A39A] mt-2 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Metadata Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-[#33302B]/60">
            {item.preparation_time && (
              <div className="bg-[#24221F] p-3 rounded-2xl border border-[#33302B]/40">
                <span className="text-[10px] text-[#A9A39A] uppercase tracking-wider block">{t.prepTime}</span>
                <span className="text-xs font-semibold text-[#F5F0E8] mt-0.5 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-[#C6A76A]" />
                  <span>{item.preparation_time}</span>
                </span>
              </div>
            )}
            {item.weight_or_portion && (
              <div className="bg-[#24221F] p-3 rounded-2xl border border-[#33302B]/40">
                <span className="text-[10px] text-[#A9A39A] uppercase tracking-wider block">{t.portion}</span>
                <span className="text-xs font-semibold text-[#F5F0E8] mt-0.5 block">{item.weight_or_portion}</span>
              </div>
            )}
            {item.calories && (
              <div className="bg-[#24221F] p-3 rounded-2xl border border-[#33302B]/40">
                <span className="text-[10px] text-[#A9A39A] uppercase tracking-wider block">{t.calories}</span>
                <span className="text-xs font-semibold text-[#F5F0E8] mt-0.5 flex items-center space-x-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>{item.calories} kkal</span>
                </span>
              </div>
            )}
            {item.allergens && (
              <div className="bg-[#24221F] p-3 rounded-2xl border border-[#33302B]/40">
                <span className="text-[10px] text-[#A9A39A] uppercase tracking-wider block">{t.allergens}</span>
                <span className="text-xs font-semibold text-rose-300 mt-0.5 flex items-center space-x-1 truncate" title={item.allergens}>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                  <span className="truncate">{item.allergens}</span>
                </span>
              </div>
            )}
          </div>

          {/* Customization Options */}
          {item.options && item.options.length > 0 && (
            <div>
              <h4 className="text-xs uppercase tracking-wider font-semibold text-[#F5F0E8] mb-3">
                {t.options}
              </h4>
              <div className="space-y-2">
                {item.options.map((opt) => {
                  const isChecked = selectedOptions.includes(opt.name);
                  return (
                    <label
                      key={opt.id}
                      onClick={() => handleOptionToggle(opt.name)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-[#C6A76A]/10 border-[#C6A76A] text-[#F5F0E8]'
                          : 'bg-[#24221F] border-[#33302B]/60 text-[#A9A39A] hover:border-[#33302B]'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isChecked ? 'bg-[#C6A76A] border-[#C6A76A] text-[#10100F]' : 'border-[#33302B]'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-sm font-medium">{opt.name}</span>
                      </div>
                      {opt.price_modifier > 0 && (
                        <span className="text-xs font-semibold text-[#C6A76A]">
                          +{formatPrice(opt.price_modifier)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customer Special Notes */}
          <div>
            <label className="text-xs uppercase tracking-wider font-semibold text-[#F5F0E8] block mb-2">
              {t.specialNotes}
            </label>
            <textarea
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              placeholder="Masalan: sousni alohida keltiring, qo‘shimcha limon bilan..."
              rows={2}
              className="w-full bg-[#24221F] border border-[#33302B] rounded-2xl px-4 py-2.5 text-sm text-[#F5F0E8] placeholder-[#A9A39A]/60 focus:outline-none focus:border-[#C6A76A] transition-colors"
            />
          </div>
        </div>

        {/* Modal Footer (Quantity & Add to Cart) */}
        <div className="p-4 sm:p-6 bg-[#161514] border-t border-[#33302B] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-center">
            <span className="text-xs text-[#A9A39A] uppercase tracking-wider mr-1">Soni:</span>
            <div className="flex items-center bg-[#24221F] rounded-2xl border border-[#33302B] p-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 rounded-xl hover:bg-[#33302B] text-[#F5F0E8] transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-bold text-sm text-[#F5F0E8]">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 rounded-xl hover:bg-[#33302B] text-[#F5F0E8] transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full sm:w-auto flex-1 max-w-sm py-3.5 px-6 rounded-2xl bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold text-sm tracking-wide flex items-center justify-between shadow-gold-glow transition-all"
          >
            <span className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4" />
              <span>{t.addToCart}</span>
            </span>
            <span className="font-serif font-bold text-base">{formatPrice(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FoodDetailModal;
