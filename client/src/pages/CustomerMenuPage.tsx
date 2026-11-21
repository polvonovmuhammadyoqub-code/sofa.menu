import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ShoppingBag, X } from 'lucide-react';
import CartDrawer from '../components/CartDrawer';
import FoodCard from '../components/FoodCard';
import FoodDetailModal from '../components/FoodDetailModal';
import LiveOrderModal from '../components/LiveOrderModal';
import MenuContactDialog from '../components/MenuContactDialog';
import MenuTableTools from '../components/MenuTableTools';
import MenuVideo from '../components/MenuVideo';
import { CartProvider, useCart } from '../context/CartContext';
import { defaultMenuCategory, localDescription, localIngredients, localName, menuCopy, normalizeMenuSearch } from '../lib/guestMenu';
import { guestApi } from '../lib/guestApi';
import { useI18n, type Language } from '../lib/i18n';
import { menuClips, signatureMedia, signatureSlug } from '../lib/menuMedia';
import { menuPhoto } from '../lib/menuPhotos';
import type { Category, MenuItem, Order, Restaurant } from '../types';
import './customer-menu.css';

type Props = {
  restaurant: Restaurant;
  initialTable: string | null;
  menuPath: string;
  initialContact?: boolean;
};

type PopulatedCategory = Category & { menu_items: MenuItem[] };
const favoritesSection = 'favorites';

export default function CustomerMenuPage(props: Props) {
  const { restaurant, initialTable } = props;
  const orderingEnabled = restaurant.menu_ordering_enabled === true && initialTable !== null;
  const cartKey = `sofa_cart:${restaurant.id}:${initialTable ?? ''}`;
  const categories = useMemo(() => (restaurant.categories ?? [])
    .map((category) => ({
      ...category,
      menu_items: (category.menu_items ?? []).map((dish) => ({
        ...dish,
        image_url: menuPhoto(dish, restaurant.slug),
      })),
    }))
    .filter((category) => category.menu_items.length > 0), [restaurant]);
  const dishes = useMemo(() => categories.flatMap((category) => category.menu_items), [categories]);

  return (
    <CartProvider key={cartKey} storageKey={cartKey} initialTable={initialTable} menuItems={dishes}>
      <MenuContent {...props} orderingEnabled={orderingEnabled} dishes={dishes} categories={categories} />
    </CartProvider>
  );
}

function currentDishId() {
  return new URLSearchParams(window.location.search).get('dish');
}

function MenuContent({ restaurant, initialTable, menuPath, initialContact = false, orderingEnabled, dishes, categories }: Props & {
  orderingEnabled: boolean;
  dishes: MenuItem[];
  categories: PopulatedCategory[];
}) {
  const { t, lang, setLang, formatPrice } = useI18n();
  const copy = menuCopy(lang);
  const { isCartOpen, setIsCartOpen, totalCount, totalAmount } = useCart();
  const favoriteKey = `sofa_favorites:${restaurant.id}`;
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(favoriteKey) || '[]');
      return Array.isArray(saved) ? saved.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  });
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(() => defaultMenuCategory(categories)?.id || '');
  const [selectedId, setSelectedId] = useState(currentDishId);
  const [contactOpen, setContactOpen] = useState(initialContact);
  const [order, setOrder] = useState<Order | null>(null);
  const [shareStatus, setShareStatus] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const trackedView = useRef(false);
  const lastTrackedDish = useRef<string>();

  const selectValue = categoryId === favoritesSection
    ? categoryId
    : categories.find((category) => category.id === categoryId)?.id || defaultMenuCategory(categories)?.id || '';
  const query = normalizeMenuSearch(search);
  const selectedDish = dishes.find((dish) => dish.id === selectedId);
  const selectedCategory = categories.find((category) => category.id === selectValue);
  const clips = useMemo(() => menuClips(restaurant), [restaurant]);

  const visibleDishes = query
    ? categories.flatMap((category) => category.menu_items.filter((dish) => {
      const words = normalizeMenuSearch([
        dish.name, dish.name_en, dish.name_ru, localDescription(dish, lang), localIngredients(dish, lang),
        localName(category, lang),
      ].filter(Boolean).join(' '));
      return query.split(' ').every((term) => words.includes(term));
    }))
    : selectValue === favoritesSection ? dishes.filter((dish) => favorites.includes(dish.id))
    : selectedCategory?.menu_items ?? [];

  useEffect(() => {
    try {
      localStorage.setItem(favoriteKey, JSON.stringify(favorites));
    } catch {
      // Keep the selection for the current visit.
    }
  }, [favoriteKey, favorites]);

  useEffect(() => {
    if (trackedView.current) return;
    trackedView.current = true;
    void guestApi.recordMenuEvent(restaurant.id);
  }, [restaurant.id]);

  useEffect(() => {
    if (selectedDish && !contactOpen && selectedDish.id !== lastTrackedDish.current) {
      void guestApi.recordMenuEvent(restaurant.id, selectedDish.id);
    }
    lastTrackedDish.current = !contactOpen ? selectedDish?.id : undefined;
  }, [restaurant.id, selectedDish, contactOpen]);

  useEffect(() => {
    const updateRoute = () => {
      setSelectedId(currentDishId());
      setContactOpen(location.pathname.replace(/\/$/, '').endsWith('/contact'));
    };
    window.addEventListener('popstate', updateRoute);
    return () => window.removeEventListener('popstate', updateRoute);
  }, []);

  function showDish(dish: MenuItem | null) {
    const href = new URL(window.location.href);
    if (dish) href.searchParams.set('dish', dish.id);
    else href.searchParams.delete('dish');
    history.replaceState(history.state, '', href);
    setSelectedId(dish?.id ?? null);
  }

  function closeContact() {
    setContactOpen(false);
    if (location.pathname.replace(/\/$/, '').endsWith('/contact')) {
      history.replaceState(history.state, '', menuPath + location.search);
    }
  }

  function toggleFavorite(id: string) {
    setFavorites((current) => current.includes(id) ? current.filter((dishId) => dishId !== id) : [...current, id]);
  }

  async function share() {
    const url = new URL(menuPath, location.origin).href;
    try {
      if (navigator.share) await navigator.share({ title: restaurant.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareStatus(copy.copied);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setShareStatus(url);
    }
  }

  const heading = query ? copy.searchResults : selectValue === favoritesSection
    ? copy.favorites : selectedCategory ? localName(selectedCategory, lang) : copy.menu;

  return (
    <div className="qr-menu-page" data-cart-visible={orderingEnabled && totalCount > 0 ? 'true' : undefined}>
      <MenuVideo clips={clips} fallbackPoster={restaurant.hero_image} covered={Boolean(selectedDish || contactOpen || isCartOpen || order)} />
      <div className="qr-menu-band">
        <div className="qr-menu-width qr-menu-identity">
          <h1>{restaurant.name}</h1>
          <select className="qr-language" aria-label={copy.language} value={lang} onChange={(event) => setLang(event.target.value as Language)}>
            <option value="uz" lang="uz">UZ</option>
            <option value="ru" lang="ru">RU</option>
            <option value="en" lang="en">EN</option>
          </select>
          <button type="button" className="qr-contact-button" onClick={() => setContactOpen(true)}>{copy.contact}</button>
        </div>
      </div>
      <main className="qr-menu-width qr-menu-content">
        {initialTable && <MenuTableTools restaurantId={restaurant.id} tableNumber={initialTable} orderingEnabled={orderingEnabled} />}
        <div className="qr-menu-tools">
          <div className="qr-menu-search">
            <Search size={20} aria-hidden="true" />
            <input ref={searchRef} type="search" value={search} onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.search} aria-label={copy.search} />
            {search && <button type="button" aria-label={copy.close} onClick={() => { setSearch(''); searchRef.current?.focus(); }}><X size={18} aria-hidden="true" /></button>}
          </div>
          {categories.length > 0 && (
            <label className="qr-category-control">
              <span>{copy.chooseSection}</span>
              <select value={selectValue} onChange={(event) => { setCategoryId(event.target.value); setSearch(''); }}>
                {categories.map((category) => <option key={category.id} value={category.id}>{localName(category, lang)}</option>)}
                <option value={favoritesSection}>{copy.favorites}</option>
              </select>
            </label>
          )}
        </div>
        <section className="qr-results" aria-label={heading}>
          {query && <h2>{heading}</h2>}
          {visibleDishes.length ? (
            <div className="qr-dish-grid">
              {visibleDishes.map((dish) => <FoodCard key={dish.id} item={dish} onSelect={showDish} />)}
            </div>
          ) : <p role="status" className="qr-no-results">
            {query ? copy.noDishes : selectValue === favoritesSection ? copy.noFavorites : copy.emptyMenu}
          </p>}
        </section>
      </main>
      <footer className="qr-menu-width qr-menu-footer">
        {restaurant.slug === signatureSlug && <a href={signatureMedia + '/sources.html'}>{copy.mediaCredits}</a>}
        <button type="button" onClick={share}>{copy.share}</button>
        {shareStatus && <p role="status">{shareStatus}</p>}
      </footer>
      {orderingEnabled && totalCount > 0 && (
        <button type="button" className="qr-cart-trigger" onClick={() => setIsCartOpen(true)}>
          <ShoppingBag size={21} aria-hidden="true" /><span>{t.cart} · {totalCount}</span><strong>{formatPrice(totalAmount)}</strong>
        </button>
      )}
      {contactOpen ? <MenuContactDialog restaurant={restaurant} onClose={closeContact} /> : selectedDish && (
        <FoodDetailModal
          key={selectedDish.id}
          item={selectedDish}
          onClose={() => showDish(null)}
          orderingEnabled={orderingEnabled}
          favorite={favorites.includes(selectedDish.id)}
          onToggleFavorite={() => toggleFavorite(selectedDish.id)}
        />
      )}
      {orderingEnabled && <CartDrawer restaurantId={restaurant.id} onOrderSuccess={setOrder} />}
      {order && <LiveOrderModal initialOrder={order} dishes={dishes} onClose={() => setOrder(null)} />}
    </div>
  );
}
