import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { I18nContext, translations, Language } from './lib/i18n';
import Navbar from './components/Navbar';
import MarketingLanding from './pages/MarketingLanding';
import CustomerMenuPage from './pages/CustomerMenuPage';
import DashboardPage from './pages/DashboardPage';
import KitchenDisplayPage from './pages/KitchenDisplayPage';
import WaiterPage from './pages/WaiterPage';
import SuperAdminPage from './pages/SuperAdminPage';
import LoginPage from './pages/LoginPage';

function AppContent() {
  const { user } = useAuth();
  
  // Navigation state: 'marketing' | 'menu' | 'dashboard' | 'kitchen' | 'waiter' | 'super-admin' | 'login'
  const [currentView, setCurrentView] = useState<string>('marketing');
  const [restaurantSlug, setRestaurantSlug] = useState<string>('sofa-signature');
  const [tableNumber, setTableNumber] = useState<string | null>(null);

  // Parse URL on mount
  useEffect(() => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const tableParam = searchParams.get('table');

    if (tableParam) {
      setTableNumber(tableParam);
    }

    if (path.startsWith('/r/')) {
      const slug = path.replace('/r/', '').split('/')[0];
      if (slug) setRestaurantSlug(slug);
      setCurrentView('menu');
    } else if (path === '/dashboard') {
      setCurrentView('dashboard');
    } else if (path === '/kitchen') {
      setCurrentView('kitchen');
    } else if (path === '/waiter') {
      setCurrentView('waiter');
    } else if (path === '/super-admin') {
      setCurrentView('super-admin');
    } else if (path === '/login') {
      setCurrentView('login');
    }
  }, []);

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update browser URL history cleanly
    let newPath = '/';
    if (view === 'menu') newPath = `/r/${restaurantSlug}${tableNumber ? `?table=${tableNumber}` : ''}`;
    else if (view === 'dashboard') newPath = '/dashboard';
    else if (view === 'kitchen') newPath = '/kitchen';
    else if (view === 'waiter') newPath = '/waiter';
    else if (view === 'super-admin') newPath = '/super-admin';
    else if (view === 'login') newPath = '/login';
    window.history.pushState({}, '', newPath);
  };

  const handleLoginSuccess = (role: string) => {
    if (role === 'SUPER_ADMIN') handleNavigate('super-admin');
    else if (role === 'KITCHEN_STAFF') handleNavigate('kitchen');
    else if (role === 'WAITER') handleNavigate('waiter');
    else handleNavigate('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#10100F] text-[#F5F0E8] flex flex-col font-sans selection:bg-[#C6A76A]/30 selection:text-[#F5F0E8]">
      {/* Global Luxury Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        restaurantName="SOFA Signature"
      />

      {/* Main Routed View */}
      <div className="flex-1">
        {currentView === 'marketing' && (
          <MarketingLanding
            onExploreDemo={() => handleNavigate('menu')}
            onOpenDashboard={() => handleNavigate('dashboard')}
            onLogin={() => handleNavigate('login')}
          />
        )}

        {currentView === 'menu' && (
          <CustomerMenuPage
            restaurantSlug={restaurantSlug}
            initialTable={tableNumber}
          />
        )}

        {currentView === 'dashboard' && <DashboardPage />}

        {currentView === 'kitchen' && <KitchenDisplayPage />}

        {currentView === 'waiter' && <WaiterPage />}

        {currentView === 'super-admin' && <SuperAdminPage />}

        {currentView === 'login' && (
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        )}
      </div>
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

  const handleSetLang = (l: Language) => {
    setLang(l);
    localStorage.setItem('sofa_lang', l);
  };

  const formatPrice = (amt: number): string => {
    if (lang === 'en') return `${(amt / 12800).toFixed(1)} USD`;
    return `${amt.toLocaleString('uz-UZ')} so‘m`;
  };

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLang: handleSetLang,
        t: translations[lang] || translations.uz,
        formatPrice,
      }}
    >
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </I18nContext.Provider>
  );
}
