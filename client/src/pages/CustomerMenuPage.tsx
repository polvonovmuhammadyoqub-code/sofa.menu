import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bell, Heart, Pause, Play, Search, Share2, ShoppingBag, Utensils, X } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import CartDrawer from '../components/CartDrawer';
import FoodCard from '../components/FoodCard';
import FoodDetailModal from '../components/FoodDetailModal';
import LiveOrderModal from '../components/LiveOrderModal';
import VideoFoodSection from '../components/VideoFoodSection';
import { CartProvider, useCart } from '../context/CartContext';
import api from '../lib/api';
import { dishCollection, dishVideo, localDescription, localIngredients, localName, menuCopy, normalizeMenuSearch } from '../lib/guestMenu';
import { useI18n } from '../lib/i18n';
import useReducedMotion from '../lib/useReducedMotion';
import type { Category, MenuItem, Order, Restaurant } from '../types';
import { demoGallery, demoSlug, demoVideo, restaurantDishPhoto, restaurantHeroPoster } from './restaurantGuestData';
import './customer-menu.css';

interface CustomerMenuPageProps {
  restaurant: Restaurant;
  initialTable: string | null;
  linkTo: (page?: string) => string;
}

const collections = ['popular', 'chef', 'newDishes', 'seasonal'] as const;
type Collection = (typeof collections)[number];
type Filter = 'all' | 'favorites' | Collection;

function demoDish(restaurant: Restaurant, item: MenuItem): MenuItem {
  if (restaurant.slug !== demoSlug) return item;
  const video = item.video_url;
  const id = video?.match(/^https:\/\/assets\.mixkit\.co\/videos\/preview\/mixkit-.+-(41528|43339|43343|43338|43340)-large\.mp4$/)?.[1];
  return {
    ...item,
    image_url: restaurantDishPhoto(restaurant, item.image_url),
    video_url: video === demoVideo ? '/demo/chef.mp4' : id ? `https://assets.mixkit.co/videos/${id}/${id}-360.mp4` : video,
  };
}

function isNewDish(item: MenuItem) {
  if (!item.created_at) return false;
  const age = Date.now() - Date.parse(item.created_at);
  return age >= 0 && age <= 30 * 24 * 60 * 60 * 1000;
}

function isDessertOrDrink(category: Category) {
  return /des[sz]ert|shirinlik|ichimlik|coffee|drink|напит|десерт/i.test([category.slug, category.name, category.name_en, category.name_ru].join(' '));
}

function MenuHero({ restaurant, initialTable, modalOpen, orderingEnabled }: Pick<CustomerMenuPageProps, 'restaurant' | 'initialTable'> & { modalOpen: boolean; orderingEnabled: boolean }) {
  const { t, lang } = useI18n();
  const copy = menuCopy(lang);
  const reducedMotion = useReducedMotion();
  const [playing, setPlaying] = useState(!reducedMotion);
  const [visible, setVisible] = useState(true);
  const [videoFailed, setVideoFailed] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const staffSocket = useRef<Socket | null>(null);
  const waiterCooldown = useRef<number>();
  const [waiterStatus, setWaiterStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const videoSource = restaurant.menu_hero_video || restaurant.hero_video;
  const video = restaurant.slug === demoSlug && videoSource === demoVideo ? '/demo/chef.mp4' : videoSource;
  const poster = restaurantHeroPoster(restaurant);

  useEffect(() => {
    if (reducedMotion) setPlaying(false);
  }, [reducedMotion]);

  useEffect(() => {
    if (!heroRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    staffSocket.current?.disconnect();
    window.clearTimeout(waiterCooldown.current);
  }, []);

  function callWaiter() {
    if (!orderingEnabled || !initialTable || waiterStatus === 'sending' || waiterStatus === 'sent') return;
    const socket = staffSocket.current ?? io();
    staffSocket.current = socket;
    setWaiterStatus('sending');
    socket.timeout(5000).emit('table:call_waiter', { restaurantId: restaurant.id, tableNumber: initialTable }, (error: Error | null, result?: { ok: boolean }) => {
      if (!error && result?.ok) {
        setWaiterStatus('sent');
        waiterCooldown.current = window.setTimeout(() => setWaiterStatus('idle'), 30_000);
      } else {
        setWaiterStatus('failed');
      }
    });
  }

  return (
    <div className="qr-hero" ref={heroRef}>
      {poster && <img src={poster} srcSet={poster === demoGallery[0] ? '/demo/interior-small.webp 900w, /demo/interior.webp 1600w' : undefined} sizes="100vw" alt="" fetchPriority="high" />}
      {video && !videoFailed && playing && visible && !modalOpen && (
        <video src={video} poster={poster} autoPlay muted loop playsInline aria-hidden="true" onError={() => setVideoFailed(true)} />
      )}
      <div className="qr-hero-copy">
        <p>{restaurant.name}</p>
        <h1>{copy.menu}</h1>
        {initialTable && <span className="qr-hero-table">{t.table} {initialTable}</span>}
      </div>
      {poster === demoGallery[0] && <span className="qr-demo-label">{copy.demoMedia}</span>}
      {orderingEnabled && (
        <div className="qr-waiter">
          <button type="button" onClick={callWaiter} disabled={waiterStatus === 'sending' || waiterStatus === 'sent'}>
            <Bell size={16} />{t.callWaiter}
          </button>
          <span role="status">{waiterStatus === 'sending' ? copy.submitting : waiterStatus === 'sent' ? copy.waiterSent : waiterStatus === 'failed' ? copy.waiterError : ''}</span>
        </div>
      )}
      {video && !videoFailed && (
        <button type="button" className="qr-hero-toggle" onClick={() => setPlaying(!playing)} title={playing ? copy.pause : copy.play} aria-label={playing ? copy.pause : copy.play}>
          {playing ? <Pause size={19} /> : <Play size={19} />}
        </button>
      )}
    </div>
  );
}

export default function CustomerMenuPage(props: CustomerMenuPageProps) {
  const { restaurant, initialTable } = props;
  const orderingEnabled = restaurant.menu_ordering_enabled === true && Boolean(initialTable);
  const cartKey = `sofa_cart:${restaurant.id}:${initialTable ?? ''}`;
  const categories = useMemo(() => (restaurant.categories ?? []).map((category) => ({
    ...category,
    menu_items: (category.menu_items ?? []).map((dish) => demoDish(restaurant, dish)),
  })), [restaurant]);
  const dishes = useMemo(() => categories.flatMap((category) => category.menu_items), [categories]);

  return (
    <CartProvider key={cartKey} storageKey={cartKey} initialTable={initialTable} menuItems={dishes}>
      <MenuContent {...props} orderingEnabled={orderingEnabled} dishes={dishes} categories={categories} />
    </CartProvider>
  );
}

function MenuContent({ restaurant, initialTable, linkTo, orderingEnabled, dishes, categories }: CustomerMenuPageProps & { orderingEnabled: boolean; dishes: MenuItem[]; categories: Category[] }) {
  const { t, lang, formatPrice } = useI18n();
  const copy = menuCopy(lang);
  const reducedMotion = useReducedMotion();
  const { setIsCartOpen, totalCount, totalAmount } = useCart();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [currentCategory, setCurrentCategory] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const favoriteKey = `sofa_favorites:${restaurant.id}`;
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(favoriteKey) || '[]');
      return Array.isArray(saved) ? saved.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  });
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(() => {
    const dishId = new URLSearchParams(window.location.search).get('dish');
    return dishes.find((dish) => dish.id === dishId) || null;
  });
  const [order, setOrder] = useState<Order | null>(null);
  const trackedView = useRef(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const query = normalizeMenuSearch(search);
  const videoDishes = useMemo(() => dishes.filter((dish) => Boolean(dishVideo(dish))), [dishes]);
  const availableCollections = collections.filter((group) => dishes.some((dish) => group === 'newDishes' ? isNewDish(dish) || dishCollection(dish) === group : dishCollection(dish) === group));
  const visibleCategories = categories
    .map((category) => ({
      ...category,
      menu_items: (category.menu_items ?? []).filter((dish) => {
        if (filter === 'favorites' && !favorites.includes(dish.id)) return false;
        if (filter !== 'all' && filter !== 'favorites' && dishCollection(dish) !== filter && !(filter === 'newDishes' && isNewDish(dish))) return false;
        if (!query) return true;
        const text = [
          localName(dish, lang),
          localDescription(dish, lang),
          localIngredients(dish, lang),
          localName(category, lang),
        ].filter(Boolean).join(' ');
        return query.split(' ').every((term) => normalizeMenuSearch(text).includes(term));
      }),
    }))
    .filter((category) => category.menu_items.length > 0);

  const pairingCategories = selectedDish ? categories.filter((category) => category.id !== selectedDish.category_id && isDessertOrDrink(category)) : [];
  const recommendations = pairingCategories
    .map((category) => category.menu_items?.find((dish) => dish.is_available && dish.is_featured) || category.menu_items?.find((dish) => dish.is_available))
    .filter((dish): dish is MenuItem => Boolean(dish))
    .slice(0, 3);

  useEffect(() => {
    try {
      localStorage.setItem(favoriteKey, JSON.stringify(favorites));
    } catch {
      // Keep favourites available for the current visit when local storage is disabled.
    }
  }, [favoriteKey, favorites]);

  useEffect(() => {
    if (trackedView.current) return;
    trackedView.current = true;
    void api.recordMenuEvent(restaurant.id);
    if (selectedDish) void api.recordMenuEvent(restaurant.id, selectedDish.id);
  }, [restaurant.id, selectedDish]);

  function openDish(dish: MenuItem) {
    setSelectedDish(dish);
    void api.recordMenuEvent(restaurant.id, dish.id);
  }

  function switchFilter(next: Filter) {
    setCurrentCategory('');
    setFilter(next);
  }

  function selectCategory(id: string) {
    setCurrentCategory(id);
    document.getElementById(id ? `qr-category-${id}` : 'qr-menu-results')?.scrollIntoView({
      behavior: reducedMotion ? 'instant' : 'smooth',
      block: 'start',
    });
  }

  async function shareMenu() {
    const url = new URL(linkTo('menu'), window.location.origin);
    url.search = '';
    setShareStatus('');
    try {
      if (navigator.share) {
        await navigator.share({ title: restaurant.name, url: url.href });
        return;
      }
      await navigator.clipboard.writeText(url.href);
      setShareStatus(copy.copied);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setShareStatus(url.href);
    }
  }

  function toggleFavorite(id: string) {
    setFavorites((current) => current.includes(id) ? current.filter((dishId) => dishId !== id) : [...current, id]);
  }

  return (
    <div className="qr-menu-page">
      <MenuHero restaurant={restaurant} initialTable={initialTable} modalOpen={Boolean(selectedDish)} orderingEnabled={orderingEnabled} />
      <div className="qr-menu-tools qr-menu-width">
        <div className="qr-menu-search">
          <Search size={21} aria-hidden="true" />
          <input
            ref={searchInput}
            type="search"
            value={search}
            placeholder={copy.search}
            aria-label={copy.search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentCategory('');
            }}
          />
          {search && <button type="button" aria-label={copy.close} onClick={() => { setSearch(''); searchInput.current?.focus(); }}><X size={19} /></button>}
        </div>
        <button type="button" className="qr-menu-tool" aria-pressed={filter === 'favorites'} onClick={() => switchFilter(filter === 'favorites' ? 'all' : 'favorites')} aria-label={copy.favorites} title={copy.favorites}>
          <Heart size={21} fill={filter === 'favorites' ? 'currentColor' : 'none'} /><span>{copy.favorites}</span>
        </button>
        <button type="button" className="qr-menu-tool" onClick={shareMenu} aria-label={copy.share} title={copy.share}>
          <Share2 size={19} /><span>{copy.share}</span>
        </button>
        <p className="qr-share-status" aria-live="polite">{shareStatus}</p>
      </div>
      {visibleCategories.length > 0 && (
        <nav className="qr-category-nav" aria-label={copy.menuCategories}>
          <div className="qr-category-track qr-menu-width">
            <button type="button" aria-current={!currentCategory ? 'true' : undefined} onClick={() => selectCategory('')}>
              {filter === 'all' ? copy.all : copy[filter]}
            </button>
            {visibleCategories.map((category) => (
              <button type="button" key={category.id} aria-current={category.id === currentCategory ? 'true' : undefined} onClick={() => selectCategory(category.id)}>
                {localName(category, lang)}
              </button>
            ))}
          </div>
        </nav>
      )}
      <main className="qr-menu-width qr-menu-content" id="qr-menu-results">
        {(availableCollections.length > 0 || (filter === 'all' && !query && videoDishes.length > 0)) && (
          <div className="qr-collections" aria-label={copy.menuCategories} role="group">
            {availableCollections.map((group) => (
              <button key={group} type="button" aria-pressed={filter === group} onClick={() => switchFilter(filter === group ? 'all' : group)}>{copy[group]}</button>
            ))}
            {filter === 'all' && !query && videoDishes.length > 0 && <a href="#qr-menu-videos"><Play size={14} />{copy.videos}</a>}
          </div>
        )}
        {visibleCategories.length === 0 && (
          <div className="qr-no-results">
            <Utensils size={28} aria-hidden="true" />
            <h2>{filter === 'favorites' ? copy.favorites : copy.noDishes}</h2>
            <p role="status">{filter === 'favorites' ? copy.noFavorites : query ? copy.noResults : copy.emptyMenu}</p>
          </div>
        )}
        {visibleCategories.map((category) => (
          <section key={category.id} id={`qr-category-${category.id}`} className="qr-category">
            <div className="qr-section-title"><h2>{localName(category, lang)}</h2></div>
            <div className="qr-dish-grid">
              {category.menu_items.map((dish) => (
                <FoodCard key={dish.id} item={dish} favorite={favorites.includes(dish.id)} onSelect={openDish} onToggleFavorite={() => toggleFavorite(dish.id)} />
              ))}
            </div>
          </section>
        ))}
        {filter === 'all' && !query && (
          <VideoFoodSection items={videoDishes} onSelectDish={openDish} modalOpen={Boolean(selectedDish)} orderingEnabled={orderingEnabled} />
        )}
      </main>
      {orderingEnabled && totalCount > 0 && (
        <button type="button" className="qr-cart-trigger" onClick={() => setIsCartOpen(true)}>
          <ShoppingBag size={19} /><span>{t.cart} · {totalCount}</span><strong>{formatPrice(totalAmount)}</strong><ArrowRight size={18} />
        </button>
      )}
      {selectedDish && (
        <FoodDetailModal key={selectedDish.id} item={selectedDish} onClose={() => setSelectedDish(null)} orderingEnabled={orderingEnabled} recommendations={recommendations} onSelect={openDish} />
      )}
      {orderingEnabled && <CartDrawer restaurantId={restaurant.id} onOrderSuccess={setOrder} />}
      {order && <LiveOrderModal initialOrder={order} dishes={dishes} onClose={() => setOrder(null)} />}
    </div>
  );
}
