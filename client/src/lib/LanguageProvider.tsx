import { useEffect, useState, type PropsWithChildren } from 'react';
import { I18nContext, translations, type Language } from './i18n';

export default function LanguageProvider({ children }: PropsWithChildren) {
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
      // The choice is still available for the current visit.
    }
  }, [lang]);

  const locale = { uz: 'uz-UZ', ru: 'ru-UZ', en: 'en-UZ' }[lang];
  const number = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    useGrouping: true,
  });
  const formatPrice = (amount: number) => `${number.format(amount).replace(/[,\u00a0\u202f]/g, '\u202f')} ${lang === 'uz' ? 'so‘m' : 'UZS'}`;

  return <I18nContext.Provider value={{ lang, setLang, t: translations[lang], formatPrice }}>{children}</I18nContext.Provider>;
}
