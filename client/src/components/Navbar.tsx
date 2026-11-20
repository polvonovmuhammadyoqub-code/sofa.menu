import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useI18n, Language } from '../lib/i18n';
import { ShoppingBag, Globe, Menu as MenuIcon, X, User, UtensilsCrossed, Monitor, LayoutDashboard, ChevronDown } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  restaurantName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, restaurantName }) => {
  const { user, logout } = useAuth();
  const { totalCount, setIsCartOpen } = useCart();
  const { lang, setLang, t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navItems = [
    { id: 'marketing', label: 'SOFA' },
    { id: 'menu', label: restaurantName || t.menu },
    { id: 'kitchen', label: t.kitchen, icon: Monitor },
    { id: 'waiter', label: t.waiter, icon: UtensilsCrossed },
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
  ];

  if (user?.role === 'SUPER_ADMIN') {
    navItems.push({ id: 'super-admin', label: t.superAdmin, icon: LayoutDashboard });
  }

  const handleLangSelect = (selectedLang: Language) => {
    setLang(selectedLang);
    setLangDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#10100F]/90 backdrop-blur-md border-b border-[#33302B]/60 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Monogram */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('marketing')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#24221F] to-[#161514] border border-[#C6A76A]/40 flex items-center justify-center shadow-gold-glow">
              <span className="font-serif font-bold text-xl text-[#C6A76A]">S</span>
            </div>
            <div>
              <span className="font-serif font-bold tracking-[0.2em] text-xl text-[#F5F0E8] block leading-none">
                SOFA
              </span>
              <span className="text-[10px] tracking-widest text-[#A9A39A] uppercase">
                Haute Experience
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 bg-[#1B1A18]/60 px-3 py-1.5 rounded-full border border-[#33302B]/40">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-4 py-2 text-xs uppercase tracking-wider rounded-full transition-all duration-200 flex items-center space-x-1.5 ${
                  currentView === item.id
                    ? 'bg-[#C6A76A] text-[#10100F] font-semibold shadow-gold-glow'
                    : 'text-[#A9A39A] hover:text-[#F5F0E8] hover:bg-[#24221F]'
                }`}
              >
                {item.icon && <item.icon className="w-3.5 h-3.5" />}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Right Tools (Language, Cart, Auth) */}
          <div className="flex items-center space-x-3">
            
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center space-x-1.5 text-xs text-[#A9A39A] hover:text-[#F5F0E8] px-2.5 py-1.5 rounded-lg border border-[#33302B]/60 bg-[#1B1A18]/80 transition-colors"
                title="Tilni tanlash"
              >
                <Globe className="w-3.5 h-3.5 text-[#C6A76A]" />
                <span className="uppercase font-medium">{lang}</span>
                <ChevronDown className="w-3 h-3 text-[#A9A39A]" />
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-[#1B1A18] border border-[#33302B] rounded-xl shadow-2xl py-1 z-50 text-xs">
                  <button
                    onClick={() => handleLangSelect('uz')}
                    className={`w-full text-left px-3 py-2 hover:bg-[#24221F] flex items-center justify-between ${lang === 'uz' ? 'text-[#C6A76A] font-medium' : 'text-[#F5F0E8]'}`}
                  >
                    <span>O‘zbekcha</span>
                    {lang === 'uz' && <span className="text-[10px]">✓</span>}
                  </button>
                  <button
                    onClick={() => handleLangSelect('ru')}
                    className={`w-full text-left px-3 py-2 hover:bg-[#24221F] flex items-center justify-between ${lang === 'ru' ? 'text-[#C6A76A] font-medium' : 'text-[#F5F0E8]'}`}
                  >
                    <span>Русский</span>
                    {lang === 'ru' && <span className="text-[10px]">✓</span>}
                  </button>
                  <button
                    onClick={() => handleLangSelect('en')}
                    className={`w-full text-left px-3 py-2 hover:bg-[#24221F] flex items-center justify-between ${lang === 'en' ? 'text-[#C6A76A] font-medium' : 'text-[#F5F0E8]'}`}
                  >
                    <span>English</span>
                    {lang === 'en' && <span className="text-[10px]">✓</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Shopping Cart Pill */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl bg-[#1B1A18] border border-[#33302B] text-[#F5F0E8] hover:border-[#C6A76A]/50 transition-colors group"
              title="Savat"
            >
              <ShoppingBag className="w-5 h-5 text-[#C6A76A] group-hover:scale-105 transition-transform" />
              {totalCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#C6A76A] text-[#10100F] font-bold text-[11px] w-5 h-5 rounded-full flex items-center justify-center shadow-gold-glow animate-pulse">
                  {totalCount}
                </span>
              )}
            </button>

            {/* User Profile / Login */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 text-xs bg-[#1B1A18] border border-[#33302B] px-3 py-2 rounded-xl text-[#F5F0E8] hover:border-[#C6A76A]/50 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-[#C6A76A]/20 border border-[#C6A76A]/60 flex items-center justify-center text-[#C6A76A] font-bold">
                    {user.full_name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden sm:inline font-medium max-w-[100px] truncate">{user.full_name}</span>
                  <ChevronDown className="w-3 h-3 text-[#A9A39A]" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-[#1B1A18] border border-[#33302B] rounded-xl shadow-2xl py-2 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-[#33302B]/60">
                      <p className="font-semibold text-[#F5F0E8] truncate">{user.full_name}</p>
                      <p className="text-[10px] text-[#A9A39A] truncate">{user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-[#C6A76A]/10 text-[#C6A76A] text-[9px] font-semibold uppercase">
                        {user.role}
                      </span>
                    </div>

                    <button
                      onClick={() => { onNavigate('dashboard'); setUserDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-[#24221F] text-[#F5F0E8] flex items-center space-x-2"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-[#C6A76A]" />
                      <span>{t.dashboard}</span>
                    </button>

                    <button
                      onClick={() => { logout(); setUserDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-[#24221F] text-rose-400 flex items-center space-x-2"
                    >
                      <span>{t.logout}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="hidden sm:inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-semibold bg-[#24221F] hover:bg-[#C6A76A] text-[#F5F0E8] hover:text-[#10100F] border border-[#33302B] hover:border-[#C6A76A] transition-all shadow-sm"
              >
                <User className="w-3.5 h-3.5" />
                <span>{t.login}</span>
              </button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#A9A39A] hover:text-[#F5F0E8]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#161514] border-b border-[#33302B] px-4 pt-2 pb-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm flex items-center space-x-3 ${
                currentView === item.id
                  ? 'bg-[#C6A76A] text-[#10100F] font-semibold'
                  : 'text-[#F5F0E8] hover:bg-[#24221F]'
              }`}
            >
              {item.icon && <item.icon className="w-4 h-4" />}
              <span>{item.label}</span>
            </button>
          ))}
          {!user && (
            <button
              onClick={() => {
                onNavigate('login');
                setMobileMenuOpen(false);
              }}
              className="w-full mt-4 py-3 bg-[#C6A76A] text-[#10100F] font-semibold text-center rounded-xl text-sm uppercase tracking-wider"
            >
              {t.login}
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
