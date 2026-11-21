import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Pause, Play, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { dishImage, dishVideo, localName, menuCopy } from '../lib/guestMenu';
import { useI18n } from '../lib/i18n';
import useReducedMotion from '../lib/useReducedMotion';
import type { MenuItem } from '../types';

interface VideoFoodSectionProps {
  items: MenuItem[];
  onSelectDish: (item: MenuItem) => void;
  modalOpen: boolean;
  orderingEnabled: boolean;
}

export default function VideoFoodSection({ items, onSelectDish, modalOpen, orderingEnabled }: VideoFoodSectionProps) {
  const { lang, formatPrice, t } = useI18n();
  const { addToCart } = useCart();
  const copy = menuCopy(lang);
  const reducedMotion = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const [visibleId, setVisibleId] = useState('');
  const [shouldPlay, setShouldPlay] = useState(!reducedMotion);
  const [active, setActive] = useState(!document.hidden);

  useEffect(() => {
    function handleVisibility() {
      setActive(!document.hidden);
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (reducedMotion) setShouldPlay(false);
  }, [reducedMotion]);

  useEffect(() => {
    const cards = railRef.current?.querySelectorAll<HTMLElement>('[data-dish-reel]');
    if (!cards?.length || typeof IntersectionObserver === 'undefined') return;
    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        ratios.set(entry.target, entry.intersectionRatio);
      }
      let best: HTMLElement | null = null;
      let ratio = 0.55;
      for (const card of cards) {
        const visible = ratios.get(card) || 0;
        if (visible > ratio) {
          best = card;
          ratio = visible;
        }
      }
      setVisibleId(best?.dataset.dishReel || '');
    }, { threshold: [0, 0.55, 0.7, 0.85, 1] });
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <section className="qr-reels" id="qr-menu-videos" aria-labelledby="qr-reels-title">
      <div className="qr-section-title">
        <h2 id="qr-reels-title">{copy.videos}</h2>
        <button type="button" className="qr-reel-toggle" onClick={() => setShouldPlay(!shouldPlay)} aria-label={shouldPlay ? copy.pause : copy.play} title={shouldPlay ? copy.pause : copy.play}>
          {shouldPlay ? <Pause size={18} /> : <Play size={18} />}
        </button>
      </div>
      <div className="qr-reels-rail" ref={railRef}>
        {items.map((dish) => {
          const title = localName(dish, lang);
          const photo = dishImage(dish);
          const play = shouldPlay && active && !modalOpen && visibleId === dish.id;
          return (
            <article className="qr-reel" key={dish.id} data-dish-reel={dish.id}>
              <button className="qr-reel-target" type="button" onClick={() => onSelectDish(dish)}>
                {play ? <video src={dishVideo(dish)} poster={photo} autoPlay muted loop playsInline aria-hidden="true" /> : photo && <img src={photo} alt="" decoding="async" loading="lazy" />}
                <span className="qr-reel-icon"><Play size={15} fill="currentColor" /></span>
                <span className="qr-reel-copy">
                  <span>{title}</span>
                  <strong>{formatPrice(dish.price)}</strong>
                  <ArrowUpRight size={20} aria-hidden="true" />
                </span>
              </button>
              {orderingEnabled && dish.is_available && (
                <button type="button" className="qr-reel-add" aria-label={t.addToCart + ' · ' + title} onClick={() => dish.options?.length ? onSelectDish(dish) : addToCart(dish)}>
                  <Plus size={21} />
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
