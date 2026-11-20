import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../lib/i18n';
import api from '../lib/api';
import { ShieldCheck, User, Lock, Mail, ArrowRight, Sparkles, ChefHat, UtensilsCrossed, Building2 } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (role: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const { t } = useI18n();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Quick 1-click Demo Login
  const handleQuickDemoLogin = async (demoEmail: string, demoPass: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.login({ email: demoEmail, password: demoPass });
      login(data.token, data.user);
      onLoginSuccess(data.user.role);
    } catch (err: any) {
      setError(err.message || 'Kirishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const data = await api.login({ email, password });
        login(data.token, data.user);
        onLoginSuccess(data.user.role);
      } else {
        const data = await api.register({
          email,
          password,
          full_name: fullName,
          restaurant_name: restaurantName,
        });
        login(data.token, data.user);
        onLoginSuccess(data.user.role);
      }
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-[#10100F]">
      <div className="w-full max-w-md space-y-6">
        
        {/* Logo Monogram */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#C6A76A] text-[#10100F] font-serif font-bold text-2xl flex items-center justify-center mx-auto shadow-gold-glow mb-4">
            S
          </div>
          <h2 className="font-serif font-bold text-3xl text-[#F5F0E8]">
            SOFA Platformasiga kirish
          </h2>
          <p className="text-xs text-[#A9A39A] mt-1">
            Restoran boshqaruvi, oshxona displeyi va ofitsiantlar tizimi
          </p>
        </div>

        {/* 1-CLICK DEMO PERSONAS (CRUCIAL FOR DEMO) */}
        <div className="bg-[#1B1A18] border border-[#C6A76A]/40 rounded-3xl p-5 shadow-gold-glow">
          <span className="text-[11px] uppercase tracking-widest text-[#C6A76A] font-bold block mb-3 text-center">
            ⚡ 1-Tegish bilan tezkor demo kirish
          </span>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('owner@sofa.uz', 'owner123')}
              className="p-3 bg-[#24221F] hover:bg-[#C6A76A] text-[#F5F0E8] hover:text-[#10100F] rounded-2xl border border-[#33302B] hover:border-[#C6A76A] text-left transition-all group"
            >
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-[#C6A76A] group-hover:text-[#10100F]" />
                <span className="text-xs font-bold">Restoran Egasi</span>
              </div>
              <span className="text-[10px] text-[#A9A39A] group-hover:text-[#10100F]/80 block mt-1">Dashboard & Menyu</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('chef@sofa.uz', 'chef123')}
              className="p-3 bg-[#24221F] hover:bg-[#C6A76A] text-[#F5F0E8] hover:text-[#10100F] rounded-2xl border border-[#33302B] hover:border-[#C6A76A] text-left transition-all group"
            >
              <div className="flex items-center space-x-2">
                <ChefHat className="w-4 h-4 text-[#C6A76A] group-hover:text-[#10100F]" />
                <span className="text-xs font-bold">Bosh Oshpaz</span>
              </div>
              <span className="text-[10px] text-[#A9A39A] group-hover:text-[#10100F]/80 block mt-1">KDS Oshxona</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('waiter@sofa.uz', 'waiter123')}
              className="p-3 bg-[#24221F] hover:bg-[#C6A76A] text-[#F5F0E8] hover:text-[#10100F] rounded-2xl border border-[#33302B] hover:border-[#C6A76A] text-left transition-all group"
            >
              <div className="flex items-center space-x-2">
                <UtensilsCrossed className="w-4 h-4 text-[#C6A76A] group-hover:text-[#10100F]" />
                <span className="text-xs font-bold">Ofitsiant</span>
              </div>
              <span className="text-[10px] text-[#A9A39A] group-hover:text-[#10100F]/80 block mt-1">Stollar & Chaqiruv</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin@sofa.uz', 'admin123')}
              className="p-3 bg-[#24221F] hover:bg-[#C6A76A] text-[#F5F0E8] hover:text-[#10100F] rounded-2xl border border-[#33302B] hover:border-[#C6A76A] text-left transition-all group"
            >
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#C6A76A] group-hover:text-[#10100F]" />
                <span className="text-xs font-bold">Super-Admin</span>
              </div>
              <span className="text-[10px] text-[#A9A39A] group-hover:text-[#10100F]/80 block mt-1">SaaS Platforma</span>
            </button>
          </div>
        </div>

        {/* Regular Login / Register Form */}
        <form onSubmit={handleSubmit} className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex border-b border-[#33302B] pb-3 mb-2">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 text-center py-1 text-xs uppercase tracking-wider font-bold transition-colors ${
                mode === 'login' ? 'text-[#C6A76A] border-b-2 border-[#C6A76A]' : 'text-[#A9A39A]'
              }`}
            >
              Kirish
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 text-center py-1 text-xs uppercase tracking-wider font-bold transition-colors ${
                mode === 'register' ? 'text-[#C6A76A] border-b-2 border-[#C6A76A]' : 'text-[#A9A39A]'
              }`}
            >
              Ro‘yxatdan o‘tish
            </button>
          </div>

          {error && (
            <p className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
              {error}
            </p>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#A9A39A] block mb-1 font-semibold">
                  Ism-familiyangiz
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jasur Beknazarov"
                  className="w-full bg-[#24221F] border border-[#33302B] rounded-xl px-4 py-2.5 text-xs text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#A9A39A] block mb-1 font-semibold">
                  Restoran nomi
                </label>
                <input
                  type="text"
                  required
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="SOFA Signature"
                  className="w-full bg-[#24221F] border border-[#33302B] rounded-xl px-4 py-2.5 text-xs text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#A9A39A] block mb-1 font-semibold">
              Elektron pochta
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@sofa.uz"
              className="w-full bg-[#24221F] border border-[#33302B] rounded-xl px-4 py-2.5 text-xs text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#A9A39A] block mb-1 font-semibold">
              Parol
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#24221F] border border-[#33302B] rounded-xl px-4 py-2.5 text-xs text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold text-xs uppercase tracking-wider rounded-2xl shadow-gold-glow transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Bajarilmoqda...' : mode === 'login' ? 'Tizimga kirish' : 'Ro‘yxatdan o‘tish'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default LoginPage;
