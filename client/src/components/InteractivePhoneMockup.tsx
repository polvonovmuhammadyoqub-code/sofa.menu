import React, { useState } from 'react';
import { Play, Plus, Check, ShoppingBag, Sparkles, Utensils, Award } from 'lucide-react';

export const InteractivePhoneMockup: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('milliy');
  const [cartCount, setCartCount] = useState(1);
  const [selectedDishIndex, setSelectedDishIndex] = useState<number | null>(null);

  const demoCategories = [
    { id: 'milliy', name: 'Milliy' },
    { id: 'steyk', name: 'Steyk & Grill' },
    { id: 'pizza', name: 'Pizza' },
    { id: 'desert', name: 'Desert' },
  ];

  const demoDishes: Record<string, Array<{ name: string; price: string; desc: string; image: string; video?: string; badge: string }>> = {
    milliy: [
      {
        name: 'Palov "SOFA Signature"',
        price: '88,000 so‘m',
        desc: 'Devzira guruchi, sara qo‘zichoq go‘shti, qazi va bedana tuxumi.',
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
        video: 'https://assets.mixkit.co/videos/preview/mixkit-chef-garnishing-a-gourmet-dish-41528-large.mp4',
        badge: "Chef's Choice",
      },
      {
        name: 'Tandir Kabob Samarqand',
        price: '145,000 so‘m',
        desc: 'Archa barglarida dimlangan og‘izda eriydigan go‘sht.',
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80',
        badge: 'Bestseller',
      },
    ],
    steyk: [
      {
        name: 'Ribeye Steak Black Angus',
        price: '245,000 so‘m',
        desc: 'Marmar go‘shti, rozmarin va sarimsoq moyi bilan.',
        image: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=400&q=80',
        badge: 'Prime 250d',
      },
      {
        name: 'Atlantika Losos Steyki',
        price: '195,000 so‘m',
        desc: 'Sarsabil va tsitrus-zanjabil qaylasi bilan.',
        image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=400&q=80',
        badge: 'Fresh Catch',
      },
    ],
    pizza: [
      {
        name: 'Truffle & Burrata Pizza',
        price: '145,000 so‘m',
        desc: 'Yog‘och pechda pishirilgan xamir, qora truffle va burrata.',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
        badge: 'Signature',
      },
    ],
    desert: [
      {
        name: 'Pistachio Fondant & Ice Cream',
        price: '78,000 so‘m',
        desc: 'Oqayotgan pista kremi va Madagaskar vanili.',
        image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80',
        badge: 'Popular',
      },
    ],
  };

  const currentList = demoDishes[activeCategory] || demoDishes['milliy'];

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCartCount((c) => c + 1);
  };

  return (
    <div className="relative mx-auto w-[320px] sm:w-[350px] h-[660px] bg-[#1B1A18] rounded-[52px] p-3 border-4 border-[#33302B] shadow-2xl shadow-black/90">
      {/* Dynamic Island / Speaker */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-end px-3">
        <div className="w-2.5 h-2.5 rounded-full bg-[#1B1A18] border border-[#33302B]" />
      </div>

      {/* Screen Frame */}
      <div className="w-full h-full bg-[#10100F] rounded-[42px] overflow-hidden flex flex-col relative text-left">
        
        {/* Restaurant Header in Phone */}
        <div className="relative h-36 bg-[#161514] overflow-hidden flex-shrink-0">
          <img
            src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"
            alt="Hero"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#10100F] via-transparent to-black/40" />

          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-[#C6A76A] font-semibold">
                Stol №12 • SOFA Signature
              </span>
              <h3 className="font-serif font-bold text-base text-[#F5F0E8] leading-tight">
                Gourmet Dining
              </h3>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#C6A76A] text-[#10100F] flex items-center justify-center font-bold text-xs shadow-gold-glow">
              S
            </div>
          </div>
        </div>

        {/* Categories Bar in Phone */}
        <div className="px-3 pt-3 flex space-x-1.5 overflow-x-auto scrollbar-none border-b border-[#33302B]/60 pb-2 flex-shrink-0">
          {demoCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap transition-colors ${
                activeCategory === c.id
                  ? 'bg-[#C6A76A] text-[#10100F] font-bold'
                  : 'bg-[#24221F] text-[#A9A39A] hover:text-[#F5F0E8]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Video Food Mini Reel */}
        <div className="px-3 pt-2 pb-1 flex-shrink-0">
          <div className="bg-gradient-to-r from-[#24221F] to-[#1B1A18] p-2 rounded-2xl border border-[#C6A76A]/30 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-[#C6A76A] text-[#10100F] flex items-center justify-center">
                <Play className="w-3 h-3 fill-current ml-0.5" />
              </div>
              <span className="text-[11px] font-semibold text-[#F5F0E8]">Jonli video menyu</span>
            </div>
            <span className="text-[9px] uppercase tracking-wider text-[#C6A76A] font-bold">Reels</span>
          </div>
        </div>

        {/* Dishes List in Phone */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5">
          {currentList.map((dish, i) => (
            <div
              key={dish.name}
              onClick={() => setSelectedDishIndex(selectedDishIndex === i ? null : i)}
              className="bg-[#1B1A18] border border-[#33302B]/60 hover:border-[#C6A76A]/40 rounded-2xl p-2.5 flex space-x-2.5 cursor-pointer transition-all"
            >
              <img
                src={dish.image}
                alt={dish.name}
                className="w-16 h-16 rounded-xl object-cover bg-[#24221F] flex-shrink-0"
              />

              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-bold text-xs text-[#F5F0E8] truncate">
                      {dish.name}
                    </h4>
                  </div>
                  <p className="text-[10px] text-[#A9A39A] line-clamp-1 mt-0.5">
                    {dish.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-1.5">
                  <span className="font-serif font-bold text-xs text-[#C6A76A]">
                    {dish.price}
                  </span>
                  <button
                    onClick={handleAdd}
                    className="p-1.5 rounded-lg bg-[#24221F] hover:bg-[#C6A76A] text-[#F5F0E8] hover:text-[#10100F] border border-[#33302B]"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Floating Cart Button in Phone */}
        <div className="p-3 bg-[#10100F]/90 backdrop-blur-md border-t border-[#33302B] flex-shrink-0">
          <div className="bg-[#C6A76A] text-[#10100F] rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-gold-glow cursor-pointer">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4" />
              <span className="text-xs font-bold">Savatda {cartCount} ta</span>
            </div>
            <span className="text-xs font-bold font-serif">176,000 so‘m</span>
          </div>
        </div>

        {/* Home Indicator */}
        <div className="w-28 h-1 bg-[#A9A39A]/40 rounded-full mx-auto my-1.5" />
      </div>
    </div>
  );
};

export default InteractivePhoneMockup;
