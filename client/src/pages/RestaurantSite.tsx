import { lazy, Suspense, useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
import { Globe2 } from 'lucide-react';
import { useI18n, type Language } from '../lib/i18n';
import api from '../lib/api';
import type { Restaurant } from '../types';
import './restaurant-site.css';

const MenuPage = lazy(() => import('./CustomerMenuPage'));
const Homepage = lazy(() => import('./RestaurantGuestPages').then(module => ({ default: module.RestaurantHomepage })));
const ReservationPage = lazy(() => import('./RestaurantReservationPage').then(module => ({ default: module.RestaurantReservationPage })));
const ContactPage = lazy(() => import('./RestaurantGuestPages').then(module => ({ default: module.RestaurantContactPage })));
const DeliveryPage = lazy(() => import('./RestaurantDeliveryPage'));

const labels = {
  uz: { menu: 'Menyu', reservation: 'Stol bron qilish', contact: 'Aloqa', delivery: 'Yetkazib berish', home: 'Bosh sahifa', language: 'Til', loading: 'Yuklanmoqda…', missing: 'Restoran yoki sahifa topilmadi.', failed: 'Sahifani yuklab bo‘lmadi.', retry: 'Qayta urinish', skip: 'Asosiy mazmunga o‘tish' },
  ru: { menu: 'Меню', reservation: 'Забронировать стол', contact: 'Контакты', delivery: 'Доставка', home: 'Главная', language: 'Язык', loading: 'Загрузка…', missing: 'Ресторан или страница не найдены.', failed: 'Не удалось загрузить страницу.', retry: 'Повторить', skip: 'Перейти к содержимому' },
  en: { menu: 'Menu', reservation: 'Reserve a table', contact: 'Contact', delivery: 'Delivery', home: 'Home', language: 'Language', loading: 'Loading…', missing: 'Restaurant or page unavailable.', failed: 'The page couldn’t load.', retry: 'Try again', skip: 'Skip to content' },
};

const pages = ['menu', 'reservation', 'contact', 'delivery'] as const;

function getRoute() {
  const [, , rawSlug, segment, ...extra] = location.pathname.replace(/\/$/, '').split('/');
  const query = new URLSearchParams(location.search);
  const rawTable = query.get('table');
  const table = rawTable && rawTable.length <= 64 ? rawTable : null;
  const page = segment || (table && query.get('view') !== 'home' ? 'menu' : '');
  try {
    const slug = decodeURIComponent(rawSlug || '');
    if (slug && extra.length === 0 && (!page || pages.some(name => name === page))) {
      return { slug, page, table };
    }
  } catch {
    // A malformed URL uses the same state as a missing restaurant.
  }
  return null;
}

export default function RestaurantSite() {
  const { lang, setLang } = useI18n();
  const copy = labels[lang];
  const [route, setRoute] = useState(getRoute);
  const [result, setResult] = useState<{ slug: string; restaurant?: Restaurant; missing?: boolean }>();
  const [attempt, setAttempt] = useState(0);
  const [failedLogo, setFailedLogo] = useState<string>();
  const slug = route?.slug;

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    api.getRestaurantBySlug(slug, controller.signal)
      .then(restaurant => setResult({ slug, restaurant }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          const missing = error instanceof Error && 'status' in error && error.status === 404;
          setResult({ slug, missing });
        }
      });
    return () => controller.abort();
  }, [slug, attempt]);

  useEffect(() => {
    const onBack = () => setRoute(getRoute());
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);

  const current = result && result.slug === slug ? result : undefined;
  const restaurant = current?.restaurant;
  const page = route?.page;
  const storedLogo = restaurant?.logo_url;
  const isDemoLogo = slug === 'sofa-signature' && storedLogo?.startsWith('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?');
  const logo = !isDemoLogo && storedLogo !== failedLogo ? storedLogo : undefined;
  const table = restaurant?.tables?.find(entry => entry.table_number === route?.table)?.table_number ?? null;
  const base = '/r/' + encodeURIComponent(slug || '');
  const linkTo = (next = '') => {
    if (!table) return base + (next ? '/' + next : '');
    const query = new URLSearchParams({ table });
    if (!next) query.set('view', 'home');
    return base + (next ? '/' + next : '') + '?' + query.toString();
  };

  useEffect(() => {
    document.title = restaurant ? (page ? copy[page as typeof pages[number]] + ' | ' : '') + restaurant.name : 'SOFA.MENU';
  }, [restaurant, page, copy]);

  const navigate = (event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element).closest('a[href]');
    if (!(anchor instanceof HTMLAnchorElement) || anchor.origin !== location.origin || anchor.target || anchor.hasAttribute('download')) return;
    if (anchor.pathname !== base && !anchor.pathname.startsWith(base + '/')) return;
    if (anchor.hash) return;
    event.preventDefault();
    if (anchor.href === location.href) return;
    history.pushState({}, '', anchor.href);
    setRoute(getRoute());
    window.scrollTo(0, 0);
    requestAnimationFrame(() => document.getElementById('guest-content')?.focus({ preventScroll: true }));
  };

  if (!route || !restaurant) {
    return <div className="restaurant-site restaurant-status" role={current?.restaurant || !current ? 'status' : 'alert'}>
      <h1>{!route || current?.missing ? copy.missing : current ? copy.failed : copy.loading}</h1>
      {current && !current.missing && <button onClick={() => { setResult(undefined); setAttempt(attempt + 1); }}>{copy.retry}</button>}
    </div>;
  }

  return (
    <div className="restaurant-site" onClick={navigate} style={{
      '--guest-brand': /^#[a-f0-9]{6}$/i.test(restaurant.brand_color) ? restaurant.brand_color : '#c6a76a',
    } as CSSProperties}>
      <a className="restaurant-skip" href="#guest-content">{copy.skip}</a>
      {page !== 'menu' && <header className="restaurant-site-header">
        <div className="restaurant-site-bar">
          <a className="restaurant-wordmark" href={linkTo()} aria-label={copy.home + ' · ' + restaurant.name}>
            {logo
              ? <img src={logo} alt="" width="34" height="34" onError={() => setFailedLogo(logo)} />
              : <span className="restaurant-monogram" aria-hidden="true">{Array.from(restaurant.name)[0]}</span>}
            <span>{restaurant.name}</span>
          </a>
          <nav className="restaurant-site-nav" aria-label={restaurant.name}>
            <a href={linkTo('menu')} >{copy.menu}</a>
            <a href={linkTo('reservation')} aria-current={page === 'reservation' ? 'page' : undefined}>{copy.reservation}</a>
            <a className="restaurant-nav-contact" href={linkTo('contact')} aria-current={page === 'contact' ? 'page' : undefined}>{copy.contact}</a>
          </nav>
          <label className="restaurant-language">
            <Globe2 size={16} aria-hidden="true" />
            <select value={lang} onChange={event => setLang(event.target.value as Language)} aria-label={copy.language}>
              <option value="uz" lang="uz">UZ</option>
              <option value="ru" lang="ru">RU</option>
              <option value="en" lang="en">EN</option>
            </select>
          </label>
        </div>
      </header>}
      <div id="guest-content" tabIndex={-1} key={restaurant.id + ':' + page + ':' + (table || '')}>
        <Suspense fallback={<div className="restaurant-status" role="status">{copy.loading}</div>}>
          {page === 'menu' ? <MenuPage restaurant={restaurant} initialTable={table} menuPath={base + '/menu'} />
            : page === 'reservation' ? <ReservationPage restaurant={restaurant} linkTo={linkTo} />
            : page === 'contact' ? <ContactPage restaurant={restaurant} linkTo={linkTo} />
            : page === 'delivery' ? <DeliveryPage restaurant={restaurant} linkTo={linkTo} />
            : <Homepage restaurant={restaurant} linkTo={linkTo} />}
        </Suspense>
      </div>
    </div>
  );
}
