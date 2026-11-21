import { lazy, Suspense, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { I18nContext, translations, Language } from './lib/i18n';
import Navbar from './components/Navbar';
import RestaurantSite from './pages/RestaurantSite';

const MarketingLanding = lazy(() => import('./pages/MarketingLanding'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const KitchenDisplayPage = lazy(() => import('./pages/KitchenDisplayPage'));
const WaiterPage = lazy(() => import('./pages/WaiterPage'));
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

const staffAccess: Record<string, string[]> = {
  dashboard: ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER'],
  kitchen: ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER', 'KITCHEN_STAFF'],
  waiter: ['SUPER_ADMIN', 'RESTAURANT_OWNER', 'MANAGER', 'WAITER'],
  'super-admin': ['SUPER_ADMIN'],
};

function staffView() {
  const path = window.location.pathname.replace(/^\/|\/$/g, '');
  return path === 'login' || Object.prototype.hasOwnProperty.call(staffAccess, path) ? path : 'marketing';
}

function StaffAndCorporateSite() {
  const { user, loading } = useAuth();
  const [view, setView] = useState(staffView);

  useEffect(() => {
    const onBack = () => setView(staffView());
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);

  const navigate = (next: string) => {
    if (next === 'menu') {
      window.location.assign('/r/sofa-signature/menu');
      return;
    }
    window.history.pushState({}, '', next === 'marketing' ? '/' : '/' + next);
    setView(staffView());
    window.scrollTo(0, 0);
  };

  const loginSuccess = (role: string) => {
    const target: Record<string, string> = {
      SUPER_ADMIN: 'super-admin', KITCHEN_STAFF: 'kitchen', WAITER: 'waiter',
    };
    navigate(target[role] || 'dashboard');
  };

  const needsLogin = !!staffAccess[view] && !user;
  const forbidden = !!staffAccess[view] && !!user && !staffAccess[view].includes(user.role);

  return (
    <div className="min-h-screen bg-[#10100F] text-[#F5F0E8] flex flex-col font-sans">
      <Navbar currentView={needsLogin ? 'login' : view} onNavigate={navigate} restaurantName="SOFA Signature" />
      <Suspense fallback={<div className="p-8" role="status">Yuklanmoqda…</div>}>
        {loading && staffAccess[view] ? <div className="p-8" role="status">Yuklanmoqda…</div>
          : forbidden ? <main className="p-8">Ushbu sahifaga kirish ruxsati yo‘q.</main>
          : needsLogin || view === 'login' ? <LoginPage onLoginSuccess={loginSuccess} />
          : view === 'dashboard' ? <DashboardPage />
          : view === 'kitchen' ? <KitchenDisplayPage />
          : view === 'waiter' ? <WaiterPage />
          : view === 'super-admin' ? <SuperAdminPage />
          : <MarketingLanding onExploreDemo={() => navigate('menu')} onOpenDashboard={() => navigate('dashboard')} onLogin={() => navigate('login')} />}
      </Suspense>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('sofa_lang') as Language;
      return ['uz', 'ru', 'en'].includes(saved) ? saved : 'uz';
    } catch {
      return 'uz';
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('sofa_lang', lang);
    } catch {
      // Language switching still works when storage is disabled.
    }
  }, [lang]);

  const locale = { uz: 'uz-UZ', ru: 'ru-UZ', en: 'en-UZ' }[lang];
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const formatPrice = (amount: number) => `${number.format(amount)} ${lang === 'uz' ? 'so‘m' : 'UZS'}`;

  return (
    <I18nContext.Provider value={{ lang, setLang, t: translations[lang], formatPrice }}>
      {/^\/r(?:\/|$)/.test(window.location.pathname) ? <RestaurantSite /> : (
        <AuthProvider>
          <CartProvider><StaffAndCorporateSite /></CartProvider>
        </AuthProvider>
      )}
    </I18nContext.Provider>
  );
}
