import React from 'react';
import { MenuItem } from '../types';
import { useCart } from '../context/CartContext';
import { useI18n } from '../lib/i18n';
import { Clock, Plus, Play, Sparkles } from 'lucide-react';

interface FoodCardProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
  viewMode?: 'grid' | 'list';
}

export const FoodCard: React.FC<FoodCardProps> = ({ item, onSelect, viewMode = 'grid' }) => {
  const { addToCart } = useCart();
  const { formatPrice, t, lang } = useI18n();

  const title = lang === 'ru' && item.name_ru ? item.name_ru : lang === 'en' && item.name_en ? item.name_en : item.name;
  const description = lang === 'ru' && item.description_ru ? item.description_ru : lang === 'en' && item.description_en ? item.description_en : item.description;

  const handleAddQuick = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(item, 1);
  };

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onSelect(item)}
        className="group bg-[#1B1A18] hover:bg-[#24221F] border border-[#33302B]/60 hover:border-[#C6A76A]/40 rounded-2xl p-4 flex items-center space-x-4 cursor-pointer transition-all duration-300 shadow-sm"
      >
        {/* Thumbnail */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-[#24221F]">
          <img
            src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          {item.video_url && (
            <div className="absolute top-1.5 left-1.5 bg-[#10100F]/80 backdrop-blur-md p-1 rounded-full text-[#C6A76A]">
              <Play className="w-3 h-3 fill-current" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="font-serif font-bold text-base sm:text-lg text-[#F5F0E8] group-hover:text-[#D8B98A] transition-colors truncate">
              {title}
            </h4>
            {item.popularity_badge && (
              <span className="hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#C6A76A]/15 text-[#C6A76A] border border-[#C6A76A]/30">
                {item.popularity_badge}
              </span>
            )}
          </div>

          <p className="text-xs text-[#A9A39A] line-clamp-2 mt-1 leading-relaxed">
            {description}
          </p>

          <div className="flex items-center justify-between mt-3">
            <span className="font-serif font-bold text-base sm:text-lg text-[#C6A76A]">
              {formatPrice(item.price)}
            </span>

            <button
              onClick={handleAddQuick}
              className="px-3.5 py-1.5 rounded-xl bg-[#24221F] hover:bg-[#C6A76A] text-[#F5F0E8] hover:text-[#10100F] border border-[#33302B] hover:border-[#C6A76A] text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addToCart}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect(item)}
      className="group bg-[#1B1A18] hover:bg-[#24221F] border border-[#33302B]/60 hover:border-[#C6A76A]/50 rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col shadow-luxury hover:-translate-y-1"
    >
      {/* Media Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#24221F]">
        <img
          src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
          loading="lazy"
        />

        {/* Gradient shadow overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1B1A18] via-transparent to-black/20" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          {item.popularity_badge && (
            <span className="inline-flex items-center space-x-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#10100F]/85 backdrop-blur-md text-[#C6A76A] border border-[#C6A76A]/40 shadow-sm">
              <Sparkles className="w-3 h-3 text-[#C6A76A]" />
              <span>{item.popularity_badge}</span>
            </span>
          )}
        </div>

        {/* Video Reel Badge */}
        {item.video_url && (
          <div className="absolute top-3 right-3 bg-[#10100F]/85 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium text-[#F5F0E8] border border-[#33302B] flex items-center space-x-1 shadow-sm">
            <Play className="w-2.5 h-2.5 fill-[#C6A76A] text-[#C6A76A]" />
            <span>Video</span>
          </div>
        )}

        {/* Prep Time & Portion pills */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-[#A9A39A] z-10">
          {item.preparation_time && (
            <span className="inline-flex items-center space-x-1 bg-[#10100F]/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#33302B]/60">
              <Clock className="w-3 h-3 text-[#C6A76A]" />
              <span>{item.preparation_time}</span>
            </span>
          )}
          {item.weight_or_portion && (
            <span className="bg-[#10100F]/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-[#33302B]/60">
              {item.weight_or_portion}
            </span>
          )}
        </div>
      </div>

      {/* Card Info */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-serif font-bold text-lg sm:text-xl text-[#F5F0E8] group-hover:text-[#D8B98A] transition-colors line-clamp-1">
            {title}
          </h3>

          <p className="text-xs sm:text-sm text-[#A9A39A] line-clamp-2 mt-2 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Bottom Price & Add Action */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#33302B]/40">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#A9A39A] block leading-none">
              {t.orderTotal}
            </span>
            <span className="font-serif font-bold text-lg sm:text-xl text-[#C6A76A] block mt-1">
              {formatPrice(item.price)}
            </span>
          </div>

          <button
            onClick={handleAddQuick}
            className="px-4 py-2 rounded-2xl bg-[#24221F] hover:bg-[#C6A76A] text-[#F5F0E8] hover:text-[#10100F] border border-[#33302B] hover:border-[#C6A76A] text-xs uppercase tracking-wider font-semibold flex items-center space-x-1.5 transition-all shadow-sm group-hover:border-[#C6A76A]/60"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addToCart}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FoodCard;
