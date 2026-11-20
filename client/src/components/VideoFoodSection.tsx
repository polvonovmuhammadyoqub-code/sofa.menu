import React, { useRef, useState, useEffect } from 'react';
import { MenuItem } from '../types';
import { useCart } from '../context/CartContext';
import { useI18n } from '../lib/i18n';
import { Play, Plus, Sparkles, Volume2, VolumeX } from 'lucide-react';

interface VideoFoodSectionProps {
  items: MenuItem[];
  onSelectDish: (dish: MenuItem) => void;
}

export const VideoFoodSection: React.FC<VideoFoodSectionProps> = ({ items, onSelectDish }) => {
  const { addToCart } = useCart();
  const { formatPrice, t, lang } = useI18n();
  const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  const videoItems = items.filter((item) => item.video_url || item.is_video_featured);

  if (videoItems.length === 0) return null;

  return (
    <section className="py-12 border-y border-[#33302B]/60 bg-[#161514]/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#C6A76A]/10 border border-[#C6A76A]/30 text-[#C6A76A] text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cinematic Experience</span>
            </div>
            <h2 className="font-serif font-bold text-2xl sm:text-4xl text-[#F5F0E8]">
              {t.seeLiveDishes}
            </h2>
            <p className="text-xs sm:text-sm text-[#A9A39A] mt-1">
              {t.liveVideoSubtitle}
            </p>
          </div>

          <div className="mt-4 sm:mt-0 flex items-center space-x-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="px-3 py-1.5 rounded-xl border border-[#33302B] bg-[#1B1A18] text-xs text-[#A9A39A] hover:text-[#F5F0E8] flex items-center space-x-1.5 transition-colors"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#C6A76A]" />}
              <span>{isMuted ? 'Ovozsiz' : 'Ovozli'}</span>
            </button>
          </div>
        </div>

        {/* Video Cards Horizontal Reel */}
        <div className="flex space-x-4 sm:space-x-6 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin">
          {videoItems.map((dish, idx) => {
            const title = lang === 'ru' && dish.name_ru ? dish.name_ru : lang === 'en' && dish.name_en ? dish.name_en : dish.name;
            const isHovered = activeVideoIndex === idx;

            return (
              <div
                key={dish.id}
                onMouseEnter={() => setActiveVideoIndex(idx)}
                onMouseLeave={() => setActiveVideoIndex(null)}
                onClick={() => onSelectDish(dish)}
                className="snap-start flex-shrink-0 w-64 sm:w-72 h-[420px] rounded-3xl overflow-hidden relative group cursor-pointer border border-[#33302B]/60 hover:border-[#C6A76A]/60 shadow-luxury transition-all duration-300 hover:-translate-y-1.5"
              >
                {/* Background Video / Poster */}
                {dish.video_url ? (
                  <video
                    src={dish.video_url}
                    poster={dish.video_poster || dish.image_url}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <img
                    src={dish.image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                )}

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/30 pointer-events-none" />

                {/* Top Badge */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                  <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-semibold uppercase tracking-wider text-[#C6A76A] border border-[#C6A76A]/30">
                    {dish.popularity_badge || 'Signature'}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-[#C6A76A]">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Bottom Dish Information */}
                <div className="absolute bottom-4 left-4 right-4 z-10">
                  <h3 className="font-serif font-bold text-lg text-[#F5F0E8] group-hover:text-[#D8B98A] transition-colors line-clamp-1">
                    {title}
                  </h3>
                  <p className="text-xs text-[#A9A39A] line-clamp-2 mt-1">
                    {dish.description}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                    <span className="font-serif font-bold text-base text-[#C6A76A]">
                      {formatPrice(dish.price)}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(dish, 1);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold text-xs flex items-center space-x-1 shadow-gold-glow transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.addToCart}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default VideoFoodSection;
