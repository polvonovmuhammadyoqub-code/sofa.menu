import { useEffect, useState } from 'react';
import { guestApi } from '../lib/guestApi';
import { menuCopy } from '../lib/guestMenu';
import { useI18n } from '../lib/i18n';
import type { Restaurant } from '../types';
import CustomerMenuPage from './CustomerMenuPage';

function menuRoute(pathname: string) {
  const match = /^\/r\/([^/]+)\/(menu|contact)\/?$/.exec(pathname);
  if (!match) return null;
  try {
    return { slug: decodeURIComponent(match[1]), contact: match[2] === 'contact' };
  } catch {
    return null;
  }
}

export default function GuestMenuSite() {
  const { lang } = useI18n();
  const copy = menuCopy(lang);
  const [route] = useState(() => menuRoute(location.pathname));
  const [result, setResult] = useState<{ restaurant?: Restaurant; missing?: boolean }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!route) return;
    const controller = new AbortController();
    guestApi.getRestaurantBySlug(route.slug, controller.signal)
      .then((restaurant) => setResult({ restaurant }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ missing: error instanceof Error && 'status' in error && error.status === 404 });
      });
    return () => controller.abort();
  }, [route, attempt]);

  const restaurant = result?.restaurant;
  useEffect(() => {
    document.title = restaurant ? `${restaurant.name} · ${copy.menu}` : copy.menu;
  }, [restaurant, copy.menu]);

  if (!route || !restaurant) {
    return (
      <main className="qr-standalone-status">
        <h1 role={result ? 'alert' : 'status'}>
          {!route || result?.missing ? copy.missing : result ? copy.loadError : copy.loading}
        </h1>
        {route && result && !result.missing && (
          <button type="button" onClick={() => { setResult(undefined); setAttempt((value) => value + 1); }}>
            {copy.retry}
          </button>
        )}
      </main>
    );
  }

  const query = new URLSearchParams(location.search);
  const table = restaurant.tables?.find(({ table_number }) => table_number === query.get('table'))?.table_number ?? null;
  const menuPath = '/r/' + encodeURIComponent(restaurant.slug) + '/menu';
  return (
    <CustomerMenuPage
      restaurant={restaurant}
      initialTable={table}
      initialContact={route.contact}
      menuPath={menuPath}
    />
  );
}
