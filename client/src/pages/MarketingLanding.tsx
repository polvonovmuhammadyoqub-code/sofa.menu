import React from 'react';
import { useI18n } from '../lib/i18n';
import InteractivePhoneMockup from '../components/InteractivePhoneMockup';
import { Sparkles, QrCode, Monitor, ChevronRight, Play, CheckCircle2, ShieldCheck, Zap, ArrowRight, Smartphone } from 'lucide-react';

interface MarketingLandingProps {
  onExploreDemo: () => void;
  onOpenDashboard: () => void;
  onLogin: () => void;
}

export const MarketingLanding: React.FC<MarketingLandingProps> = ({ onExploreDemo, onOpenDashboard, onLogin }) => {
  const { t, formatPrice } = useI18n();

  return (
    <div className="bg-[#10100F] text-[#F5F0E8] overflow-hidden">
      
      {/* SECTION 1: CINEMATIC HERO */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
        {/* Cinematic Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1800&q=85"
            className="w-full h-full object-cover opacity-35 filter brightness-75 scale-105 animate-fade-in"
          >
            <source
              src="https://assets.mixkit.co/videos/preview/mixkit-chef-garnishing-a-gourmet-dish-41528-large.mp4"
              type="video/mp4"
            />
          </video>
          {/* Subtle multi-layer gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#10100F] via-[#10100F]/60 to-[#10100F]/80" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#10100F_90%)]" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center py-20">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#1B1A18]/90 border border-[#C6A76A]/40 text-[#C6A76A] text-xs font-semibold uppercase tracking-widest mb-8 shadow-gold-glow">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SOFA — The Future of Dining</span>
          </div>

          <h1 className="font-serif font-extrabold text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-[1.08] text-[#F5F0E8]">
            Restoraningiz uchun <br />
            <span className="gold-gradient-text italic font-serif">yangi raqamli</span> tajriba.
          </h1>

          <p className="mt-6 text-base sm:text-xl text-[#A9A39A] max-w-2xl mx-auto font-sans leading-relaxed">
            {t.heroSubtitle}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onExploreDemo}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold text-sm tracking-widest uppercase flex items-center justify-center space-x-2.5 shadow-gold-glow transition-all hover:scale-105"
            >
              <span>{t.viewDemo}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenDashboard}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#1B1A18] hover:bg-[#24221F] text-[#F5F0E8] border border-[#33302B] hover:border-[#C6A76A]/60 font-semibold text-sm tracking-wider uppercase flex items-center justify-center space-x-2 transition-all"
            >
              <Monitor className="w-4 h-4 text-[#C6A76A]" />
              <span>{t.dashboard}</span>
            </button>
          </div>
        </div>

        {/* Scroll down indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 opacity-60">
          <span className="text-[10px] uppercase tracking-widest text-[#A9A39A]">Pastga suring</span>
          <div className="w-5 h-9 rounded-full border border-[#A9A39A] p-1 flex justify-center">
            <div className="w-1 h-2 bg-[#C6A76A] rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* SECTION 2: WHY SOFA? */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-widest text-[#C6A76A] font-bold">
            {t.whySofa}
          </span>
          <h2 className="font-serif font-bold text-3xl sm:text-5xl text-[#F5F0E8] mt-2">
            {t.whySofaSubtitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="bg-[#1B1A18] border border-[#33302B]/60 hover:border-[#C6A76A]/50 rounded-3xl p-8 relative overflow-hidden group transition-all duration-300 shadow-luxury hover:-translate-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#C6A76A]/10 border border-[#C6A76A]/30 flex items-center justify-center text-[#C6A76A] mb-6 shadow-gold-glow">
              <Play className="w-6 h-6 fill-current" />
            </div>
            <h3 className="font-serif font-bold text-2xl text-[#F5F0E8] group-hover:text-[#D8B98A] transition-colors">
              {t.feature1Title}
            </h3>
            <p className="text-sm text-[#A9A39A] mt-3 leading-relaxed">
              {t.feature1Desc}
            </p>
            <div className="mt-6 pt-6 border-t border-[#33302B]/60">
              <img
                src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"
                alt="Feature 1"
                className="w-full h-44 object-cover rounded-2xl border border-[#33302B]"
              />
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#1B1A18] border border-[#33302B]/60 hover:border-[#C6A76A]/50 rounded-3xl p-8 relative overflow-hidden group transition-all duration-300 shadow-luxury hover:-translate-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#C6A76A]/10 border border-[#C6A76A]/30 flex items-center justify-center text-[#C6A76A] mb-6 shadow-gold-glow">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-2xl text-[#F5F0E8] group-hover:text-[#D8B98A] transition-colors">
              {t.feature2Title}
            </h3>
            <p className="text-sm text-[#A9A39A] mt-3 leading-relaxed">
              {t.feature2Desc}
            </p>
            <div className="mt-6 pt-6 border-t border-[#33302B]/60">
              <img
                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"
                alt="Feature 2"
                className="w-full h-44 object-cover rounded-2xl border border-[#33302B]"
              />
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#1B1A18] border border-[#33302B]/60 hover:border-[#C6A76A]/50 rounded-3xl p-8 relative overflow-hidden group transition-all duration-300 shadow-luxury hover:-translate-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#C6A76A]/10 border border-[#C6A76A]/30 flex items-center justify-center text-[#C6A76A] mb-6 shadow-gold-glow">
              <Monitor className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-2xl text-[#F5F0E8] group-hover:text-[#D8B98A] transition-colors">
              {t.feature3Title}
            </h3>
            <p className="text-sm text-[#A9A39A] mt-3 leading-relaxed">
              {t.feature3Desc}
            </p>
            <div className="mt-6 pt-6 border-t border-[#33302B]/60">
              <img
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80"
                alt="Feature 3"
                className="w-full h-44 object-cover rounded-2xl border border-[#33302B]"
              />
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 3: INTERACTIVE DEMO (PHONE MOCKUP) */}
      <section className="py-24 bg-[#161514] border-y border-[#33302B]/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Description */}
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#C6A76A]/10 text-[#C6A76A] text-xs font-semibold uppercase tracking-wider">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Jonli interaktiv demo</span>
              </div>

              <h2 className="font-serif font-bold text-3xl sm:text-5xl text-[#F5F0E8] leading-tight">
                Telefoningizda <br />
                <span className="text-[#C6A76A] italic">bevosita sinab ko‘ring</span>.
              </h2>

              <p className="text-sm sm:text-base text-[#A9A39A] leading-relaxed">
                O‘ng tarafdagi telefon mockupiga teginib ko‘ring. Kategoriyalarni o‘zgartiring, taomlarni tanlang, videolarni tomosha qiling va savatga qo‘shing.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-3 text-sm text-[#F5F0E8]">
                  <CheckCircle2 className="w-5 h-5 text-[#C6A76A] flex-shrink-0" />
                  <span>Ilova o‘rnatish mutlaqo talab etilmaydi (Web-App)</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-[#F5F0E8]">
                  <CheckCircle2 className="w-5 h-5 text-[#C6A76A] flex-shrink-0" />
                  <span>Stolga bog‘langan alohida QR kodlar</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-[#F5F0E8]">
                  <CheckCircle2 className="w-5 h-5 text-[#C6A76A] flex-shrink-0" />
                  <span>Oshxona displeyi bilan bir zumda sinxronizatsiya</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={onExploreDemo}
                  className="px-8 py-4 rounded-2xl bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold text-xs uppercase tracking-widest shadow-gold-glow flex items-center space-x-2 transition-all"
                >
                  <span>To‘liq menyuni ko‘rish</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Interactive Phone Component */}
            <div className="flex justify-center">
              <InteractivePhoneMockup />
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 4: HOW IT WORKS */}
      <section className="py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs uppercase tracking-widest text-[#C6A76A] font-bold">
            {t.howItWorks}
          </span>
          <h2 className="font-serif font-bold text-3xl sm:text-5xl text-[#F5F0E8] mt-2">
            {t.howItWorksSubtitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { num: '01', title: t.step1, desc: t.step1Desc },
            { num: '02', title: t.step2, desc: t.step2Desc },
            { num: '03', title: t.step3, desc: t.step3Desc },
            { num: '04', title: t.step4, desc: t.step4Desc },
          ].map((step, idx) => (
            <div
              key={step.num}
              className="bg-[#1B1A18] border border-[#33302B]/60 rounded-3xl p-6 relative flex flex-col justify-between hover:border-[#C6A76A]/40 transition-all shadow-sm"
            >
              <div>
                <span className="font-serif font-bold text-4xl text-[#C6A76A]/30 block mb-4">
                  {step.num}
                </span>
                <h3 className="font-serif font-bold text-lg text-[#F5F0E8]">
                  {step.title}
                </h3>
                <p className="text-xs text-[#A9A39A] mt-2 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5: PRICING */}
      <section className="py-24 bg-[#161514] border-t border-[#33302B]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-widest text-[#C6A76A] font-bold">
              {t.pricingTitle}
            </span>
            <h2 className="font-serif font-bold text-3xl sm:text-5xl text-[#F5F0E8] mt-2">
              {t.pricingSubtitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Starter */}
            <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="font-serif font-bold text-2xl text-[#F5F0E8]">{t.starter}</h3>
                <p className="text-xs text-[#A9A39A] mt-1">{t.starterDesc}</p>
                <div className="mt-6">
                  <span className="font-serif font-bold text-3xl sm:text-4xl text-[#C6A76A]">490,000</span>
                  <span className="text-xs text-[#A9A39A] ml-1">so‘m / oy</span>
                </div>

                <ul className="mt-8 space-y-3 text-xs text-[#F5F0E8]">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C6A76A]" />
                    <span>50 tagacha taomlar</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C6A76A]" />
                    <span>15 ta stol uchun QR kodlar</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C6A76A]" />
                    <span>Boshqaruv paneli va statistika</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onLogin}
                className="mt-8 w-full py-3.5 rounded-2xl bg-[#24221F] hover:bg-[#33302B] text-[#F5F0E8] font-bold text-xs uppercase tracking-wider border border-[#33302B] transition-colors"
              >
                {t.selectPlan}
              </button>
            </div>

            {/* Pro Experience (Featured) */}
            <div className="bg-[#1F1D1A] border-2 border-[#C6A76A] rounded-3xl p-8 flex flex-col justify-between relative shadow-gold-glow">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#C6A76A] text-[#10100F] px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                {t.popular}
              </div>

              <div>
                <h3 className="font-serif font-bold text-2xl text-[#F5F0E8]">{t.pro}</h3>
                <p className="text-xs text-[#A9A39A] mt-1">{t.proDesc}</p>
                <div className="mt-6">
                  <span className="font-serif font-bold text-3xl sm:text-4xl text-[#C6A76A]">1,290,000</span>
                  <span className="text-xs text-[#A9A39A] ml-1">so‘m / oy</span>
                </div>

                <ul className="mt-8 space-y-3 text-xs text-[#F5F0E8]">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C6A76A]" />
                    <span>200 tagacha taomlar</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C6A76A]" />
                    <span>50 ta stol uchun QR kodlar</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C6A76A]" />
                    <span className="font-semibold text-[#C6A76A]">Video taomlar (Reels formati)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C6A76A]" />
                    <span>KDS Oshxona displeyi</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C6A76A]" />
                    <span>Brend ranglarini moslash</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onLogin}
                className="mt-8 w-full py-4 rounded-2xl bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold text-xs uppercase tracking-widest shadow-gold-glow transition-all"
              >
                {t.selectPlan}
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-[#1B1A18] border border-[#33302B] rounded-3xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="font-serif font-bold text-2xl text-[#F5F0E8]">{t.enterprise}</h3>
                <p className="text-xs text-[#A9A39A] mt-1">{t.enterpriseDesc}</p>
                <div className="mt-6">
                  <span className="font-serif font-bold text-3xl sm:text-4xl text-[#C6A76A]">2,900,000</span>
                  <span className="text-xs text-[#A9A39A] ml-1">so‘m / oy</span>
                </div>

                <ul className="mt-8 space-y-3 text-xs text-[#F5F0E8]">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C6A76A]" />
                    <span>Cheksiz taomlar va stollar</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C6A76A]" />
                    <span>Maxsus domen va brending</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C6A76A]" />
                    <span>Ofitsiantlar boshqaruvi va API</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C6A76A]" />
                    <span>24/7 Shaxsiy menejer</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onLogin}
                className="mt-8 w-full py-3.5 rounded-2xl bg-[#24221F] hover:bg-[#33302B] text-[#F5F0E8] font-bold text-xs uppercase tracking-wider border border-[#33302B] transition-colors"
              >
                {t.selectPlan}
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 max-w-5xl mx-auto px-4 text-center">
        <div className="bg-gradient-to-br from-[#24221F] to-[#161514] border border-[#C6A76A]/40 rounded-3xl p-10 sm:p-16 shadow-gold-glow">
          <span className="font-serif font-bold text-3xl sm:text-5xl text-[#F5F0E8] block">
            Restoraningiz kelajagi bugundan boshlanadi.
          </span>
          <p className="text-sm sm:text-base text-[#A9A39A] max-w-xl mx-auto mt-4">
            SOFA platformasi bilan mehmonlaringizga unutilmas gastronomiya tajribasini tortiq eting.
          </p>

          <div className="mt-8 flex justify-center">
            <button
              onClick={onExploreDemo}
              className="px-9 py-4 rounded-2xl bg-[#C6A76A] hover:bg-[#D8B98A] text-[#10100F] font-bold text-sm uppercase tracking-widest shadow-gold-glow transition-all hover:scale-105"
            >
              SOFA bilan boshlash
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#33302B]/60 bg-[#0C0B0B] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#C6A76A] text-[#10100F] font-bold font-serif flex items-center justify-center">
              S
            </div>
            <div>
              <span className="font-serif font-bold text-lg text-[#F5F0E8] tracking-widest">SOFA</span>
              <p className="text-[10px] text-[#A9A39A]">The Future of Restaurant Experience</p>
            </div>
          </div>

          <div className="text-xs text-[#A9A39A] text-center md:text-right">
            <p>© {new Date().getFullYear()} SOFA Platform Inc. Barcha huquqlar himoyalangan.</p>
            <p className="mt-1 text-[11px] text-[#A9A39A]/60">Toshkent, O‘zbekiston • info@sofa.uz</p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default MarketingLanding;
