import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../lib/i18n';
import api from '../lib/api';
import { ShieldCheck, Plus, Building2, TrendingUp, Users, DollarSign, CheckCircle2, XCircle } from 'lucide-react';

export const SuperAdminPage: React.FC = () => {
  const { user } = useAuth();
  const { formatPrice } = useI18n();

  const [stats, setStats] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    phone: '+998 71 200 00 00',
    address: 'Toshkent sh.',
    plan_code: 'PRO',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const s = await api.getSuperAdminStats();
      setStats(s);
      const r = await api.getSuperAdminRestaurants();
      setRestaurants(r);
    } catch (err) {
      console.error('Super-admin error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSuperAdminRestaurant(form);
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Restoran yaratishda xatolik');
    }
  };

  const handleToggleStatus = async (restaurantId: string, currentStatus: boolean) => {
    try {
      await api.toggleRestaurantStatus(restaurantId, !currentStatus);
      setRestaurants((prev) =>
        prev.map((r) => (r.id === restaurantId ? { ...r, is_active: !currentStatus } : r))
      );
    } catch (err: any) {
      alert(err.message || 'Holatni yangilashda xatolik');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#10100F] flex items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-[#C6A76A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#10100F] text-[#F5F0E8] p-4 sm:p-8 max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#33302B]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C6A76A] text-[#10100F] flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-3xl text-[#F5F0E8]">
              SOFA Super-Admin Console
            </h1>
            <span className="text-xs text-[#A9A39A]">Platforma nazorati va ko‘p ijarachilik (Multi-Tenant) boshqaruvi</span>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-3 rounded-2xl bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-gold-glow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi restoran qo‘shish</span>
        </button>
      </div>

      {/* Platform Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-6 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-[#A9A39A] font-semibold">Jami Restoranlar</span>
          <span className="font-serif font-bold text-3xl text-[#C6A76A] block mt-2">
            {stats?.totalRestaurants || restaurants.length}
          </span>
          <span className="text-[10px] text-emerald-400 mt-2 block">Aktiv ijarachilar</span>
        </div>

        <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-6 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-[#A9A39A] font-semibold">Platforma Tushumi</span>
          <span className="font-serif font-bold text-3xl text-[#F5F0E8] block mt-2">
            {formatPrice(stats?.platformRevenue || 0)}
          </span>
          <span className="text-[10px] text-[#A9A39A] mt-2 block">Barcha buyurtmalar bo‘yicha</span>
        </div>

        <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-6 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-[#A9A39A] font-semibold">Jami Buyurtmalar</span>
          <span className="font-serif font-bold text-3xl text-[#F5F0E8] block mt-2">
            {stats?.totalOrders || 0} ta
          </span>
          <span className="text-[10px] text-[#A9A39A] mt-2 block">Stollardan berilgan</span>
        </div>

        <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-6 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-[#A9A39A] font-semibold">Taomlar Bazasi</span>
          <span className="font-serif font-bold text-3xl text-[#C6A76A] block mt-2">
            {stats?.totalDishes || 0} ta
          </span>
          <span className="text-[10px] text-[#A9A39A] mt-2 block">Fotosurat va videoli</span>
        </div>
      </div>

      {/* Restaurants Table */}
      <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[#33302B] flex items-center justify-between">
          <h3 className="font-serif font-bold text-lg text-[#F5F0E8]">
            Platformadagi barcha restoranlar ({restaurants.length})
          </h3>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#161514] border-b border-[#33302B] text-[#A9A39A] uppercase tracking-wider">
            <tr>
              <th className="py-4 px-6">Restoran</th>
              <th className="py-4 px-4">Slug / Havola</th>
              <th className="py-4 px-4">Taomlar</th>
              <th className="py-4 px-4">Stollar</th>
              <th className="py-4 px-4">Tarif</th>
              <th className="py-4 px-4">Holat</th>
              <th className="py-4 px-6 text-right">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#33302B]/60">
            {restaurants.map((r) => (
              <tr key={r.id} className="hover:bg-[#24221F]/50 transition-colors">
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-[#24221F] border border-[#33302B] flex items-center justify-center font-bold text-[#C6A76A]">
                      {r.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-serif font-bold text-sm text-[#F5F0E8] block">{r.name}</span>
                      <span className="text-[10px] text-[#A9A39A]">{r.address || 'Toshkent'}</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 font-mono text-xs text-[#C6A76A]">
                  /r/{r.slug}
                </td>
                <td className="py-4 px-4 text-[#F5F0E8]">
                  {r._count?.menu_items || 0} ta
                </td>
                <td className="py-4 px-4 text-[#F5F0E8]">
                  {r._count?.tables || 0} ta
                </td>
                <td className="py-4 px-4">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#C6A76A]/20 text-[#C6A76A] font-bold text-[10px]">
                    {r.subscriptions?.[0]?.plan?.name || 'PRO'}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${r.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {r.is_active ? 'Faol' : 'To‘xtatilgan'}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <button
                    onClick={() => handleToggleStatus(r.id, r.is_active)}
                    className="px-3 py-1.5 rounded-xl bg-[#24221F] hover:bg-[#33302B] text-xs font-semibold text-[#F5F0E8]"
                  >
                    {r.is_active ? 'To‘xtatish' : 'Faollashtirish'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE RESTAURANT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#33302B]">
              <h3 className="font-serif font-bold text-xl text-[#F5F0E8]">Yangi restoran ochish</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#A9A39A] hover:text-[#F5F0E8]">✕</button>
            </div>

            <form onSubmit={handleCreateRestaurant} className="space-y-4 text-xs">
              <div>
                <label className="text-[#A9A39A] uppercase tracking-wider block mb-1">Restoran nomi</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    setForm({ ...form, name, slug });
                  }}
                  placeholder="Masalan: Rayhon Signature"
                  className="w-full bg-[#24221F] border border-[#33302B] rounded-xl px-3 py-2.5 text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#A9A39A] uppercase tracking-wider block mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full bg-[#24221F] border border-[#33302B] rounded-xl px-3 py-2.5 text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#A9A39A] uppercase tracking-wider block mb-1">Tarif rejasi</label>
                <select
                  value={form.plan_code}
                  onChange={(e) => setForm({ ...form, plan_code: e.target.value })}
                  className="w-full bg-[#24221F] border border-[#33302B] rounded-xl px-3 py-2.5 text-[#F5F0E8] focus:border-[#C6A76A] focus:outline-none"
                >
                  <option value="STARTER">Starter</option>
                  <option value="PRO">Pro Experience</option>
                  <option value="ENTERPRISE">Signature Enterprise</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold rounded-2xl uppercase tracking-wider shadow-gold-glow mt-4"
              >
                Restoranni yaratish
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SuperAdminPage;
