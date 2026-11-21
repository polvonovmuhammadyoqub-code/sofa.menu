import type { Language } from '../lib/i18n';
import type { Restaurant } from '../types';
import { getGuestCopy } from './restaurantGuestCopy';

export type GuestPageProps = {
  restaurant: Restaurant;
  linkTo: (page?: string) => string;
};

export const demoGallery = ['/demo/interior.webp', '/demo/table.webp', '/demo/evening.webp'];
export const demoSlug = 'sofa-signature';
const demoPoster = 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1600&q=85';
export const demoVideo = 'https://assets.mixkit.co/videos/preview/mixkit-chef-garnishing-a-gourmet-dish-41528-large.mp4';
const demoDishPhotos: Record<string, string> = {
  '/photo-1513558161293-cdaf765ed2fd': '/demo/iced-drinks.webp',
  '/photo-1551024709-8f23befc6f87': '/demo/fruit-drinks.webp',
  '/photo-1568901346375-23c9450c58cd': '/demo/burger.webp',
  '/photo-1582878826629-29b7ad1cdc43': '/demo/noodles.webp',
  '/photo-1547592166-23ac45744acd': '/demo/soup.webp',
  '/photo-1541696432-82c6da8ce7bf': '/demo/national-dish.webp',
  '/photo-1603894584373-5ac82b2ae398': '/demo/spiced-chicken.webp',
  '/photo-1555939594-58d7cb561ad1': '/demo/charcoal-grill.webp',
  '/photo-1544025162-d76694265947': '/demo/grill.webp',
  '/photo-1558030006-450675393462': '/demo/steak.webp',
  '/photo-1540420773420-3366772f4999': '/demo/salad.webp',
  '/photo-1513104890138-7c749659a591': '/demo/pizza.webp',
};

export function restaurantHeroPoster(restaurant: Restaurant) {
  if (restaurant.slug === demoSlug && (!restaurant.hero_image || restaurant.hero_image === demoPoster)) return demoGallery[0];
  return restaurant.hero_image;
}

export function restaurantDishPhoto(restaurant: Restaurant, original?: string) {
  if (restaurant.slug !== demoSlug || !original) return original;
  const url = safeExternalUrl(original);
  if (!url) return original;
  const photo = new URL(url);
  return photo.hostname === 'images.unsplash.com' ? demoDishPhotos[photo.pathname] || original : original;
}

export function getPhone(restaurant: Restaurant) {
  const phone = restaurant.phone?.replace(/[\s().-]/g, '') ?? '';
  if (restaurant.slug === demoSlug && phone === '+998712008800') return undefined;
  if (/^\+?[0-9]{9,15}$/.test(phone)) return phone;
}

export function safeExternalUrl(value?: string) {
  try {
    const url = new URL(value ?? '');
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
  } catch {
    return undefined;
  }
}

export function localizedName(item: { name: string; name_ru?: string | null; name_en?: string | null }, lang: Language) {
  if (lang === 'ru') return item.name_ru || item.name;
  if (lang === 'en') return item.name_en || item.name;
  return item.name;
}

export function openingHours(restaurant: Restaurant, lang: Language) {
  if (lang === 'ru' && restaurant.opening_hours_ru) return restaurant.opening_hours_ru;
  if (lang === 'en' && restaurant.opening_hours_en) return restaurant.opening_hours_en;
  const hours = restaurant.opening_hours;
  const daily = hours?.match(/^Dushanba\s*[-–—]\s*Yakshanba:\s*(.+)$/i);
  if (daily && lang === 'ru') return 'Ежедневно · ' + daily[1];
  if (daily && lang === 'en') return 'Daily · ' + daily[1];
  return hours;
}

export function restaurantAddress(restaurant: Restaurant, lang: Language) {
  if (restaurant.slug === demoSlug && restaurant.address === 'Toshkent shahri, Amir Temur shoh ko‘chasi, 108') {
    if (lang === 'ru') return 'Ташкент, проспект Амира Темура, 108';
    if (lang === 'en') return '108 Amir Temur Avenue, Tashkent';
  }
  if (lang === 'ru' && restaurant.address_ru) return restaurant.address_ru;
  if (lang === 'en' && restaurant.address_en) return restaurant.address_en;
  return restaurant.address;
}

export function restaurantWelcome(restaurant: Restaurant, lang: Language) {
  if (lang === 'uz') return restaurant.tagline || getGuestCopy(lang).welcome;
  if (lang === 'ru' && restaurant.tagline_ru) return restaurant.tagline_ru;
  if (lang === 'en' && restaurant.tagline_en) return restaurant.tagline_en;
  if (restaurant.slug === demoSlug && restaurant.tagline === 'Oliy darajadagi gastronomik tajriba va nafis muhit') {
    return lang === 'ru' ? 'Авторская кухня и тёплая атмосфера' : 'Fine dining in a warm, inviting setting';
  }
  return getGuestCopy(lang).welcome;
}
