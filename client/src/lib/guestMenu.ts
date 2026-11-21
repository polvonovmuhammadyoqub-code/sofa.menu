import type { Language } from './i18n';
import type { Category, MenuItem } from '../types';

const copy = {
  uz: {
    chooseSection: 'Bo‘lim tanlang', language: 'Til', contact: 'Aloqa', contactTitle: 'Biz bilan bog‘laning', call: 'Qo‘ng‘iroq qilish', writeTelegram: 'Telegram orqali yozish', contactMissing: 'Aloqa ma’lumotlari ko‘rsatilmagan.', mediaCredits: 'Media manbalari', searchResults: 'Qidiruv natijalari', loading: 'Menyu yuklanmoqda…', missing: 'Restoran topilmadi.', loadError: 'Menyuni yuklab bo‘lmadi.', retry: 'Qayta urinish',
    menu: 'Menyu', search: 'Taom yoki masalliq qidiring', favorites: 'Saralanganlar', share: 'Menyuni ulashish',
    copied: 'Havola nusxalandi.', waiterSent: 'So‘rov yuborildi.', waiterError: 'So‘rov yuborilmadi. Qayta urinib ko‘ring.', popular: 'Mashhur', chef: 'Oshpaz tavsiyasi',
    newDishes: 'Yangi', seasonal: 'Mavsumiy', menuCategories: 'Menyu bo‘limlari', all: 'Barchasi',
    noDishes: 'Taom topilmadi', noResults: 'Boshqa so‘z bilan qidirib ko‘ring.', emptyMenu: 'Menyu yangilanmoqda.',
    noFavorites: 'Taomni ochib, saralanganlarga qo‘shing.',
    unavailable: 'Hozir mavjud emas', addFavorite: 'Saralanganlarga qo‘shish', removeFavorite: 'Saralanganlardan olib tashlash',
    pause: 'Videoni to‘xtatish', play: 'Davom ettirish',
    demoMedia: 'Namuna media', video: 'Video', photo: 'Rasm', close: 'Yopish', ingredients: 'Masalliqlar', required: 'Majburiy',
    less: 'Soni kamaytirish', more: 'Soni oshirish', quantity: 'Soni', pairings: 'Birga tatib ko‘ring',
    orderError: 'Buyurtmani yuborib bo‘lmadi. Iltimos, taomlar mavjudligini tekshirib, qayta urinib ko‘ring.',
    submitting: 'Yuborilmoqda…', orderName: 'Ismingiz (ixtiyoriy)', kitchenNotes: 'Oshxona uchun izoh (ixtiyoriy)',
    orderNumber: 'Buyurtma', items: 'Taomlar', remove: 'Olib tashlash',
  },
  ru: {
    chooseSection: 'Выберите раздел', language: 'Язык', contact: 'Контакты', contactTitle: 'Свяжитесь с нами', call: 'Позвонить', writeTelegram: 'Написать в Telegram', contactMissing: 'Контактные данные отсутствуют.', mediaCredits: 'Источники медиа', searchResults: 'Результаты поиска', loading: 'Загрузка меню…', missing: 'Ресторан не найден.', loadError: 'Не удалось загрузить меню.', retry: 'Повторить',
    menu: 'Меню', search: 'Поиск по блюдам и ингредиентам', favorites: 'Избранное', share: 'Поделиться меню',
    copied: 'Ссылка скопирована.', waiterSent: 'Запрос отправлен.', waiterError: 'Не удалось отправить запрос. Попробуйте снова.', popular: 'Популярное', chef: 'Совет шефа',
    newDishes: 'Новинки', seasonal: 'Сезонное', menuCategories: 'Разделы меню', all: 'Все блюда',
    noDishes: 'Блюда не найдены', noResults: 'Попробуйте другой запрос.', emptyMenu: 'Меню обновляется.',
    noFavorites: 'Откройте блюдо, чтобы добавить его в избранное.',
    unavailable: 'Сейчас недоступно', addFavorite: 'Добавить в избранное', removeFavorite: 'Убрать из избранного',
    pause: 'Приостановить видео', play: 'Продолжить',
    demoMedia: 'Демонстрационные кадры', video: 'Видео', photo: 'Фото', close: 'Закрыть', ingredients: 'Ингредиенты', required: 'Обязательно',
    less: 'Уменьшить количество', more: 'Увеличить количество', quantity: 'Количество', pairings: 'Попробуйте вместе',
    orderError: 'Не удалось отправить заказ. Проверьте наличие блюд и попробуйте снова.',
    submitting: 'Отправка…', orderName: 'Ваше имя (необязательно)', kitchenNotes: 'Пожелания к заказу (необязательно)',
    orderNumber: 'Заказ', items: 'Блюда', remove: 'Удалить',
  },
  en: {
    chooseSection: 'Choose a section', language: 'Language', contact: 'Contact', contactTitle: 'Get in touch', call: 'Call us', writeTelegram: 'Message us on Telegram', contactMissing: 'Contact details are unavailable.', mediaCredits: 'Media credits', searchResults: 'Search results', loading: 'Loading menu…', missing: 'Restaurant unavailable.', loadError: 'The menu couldn’t load.', retry: 'Try again',
    menu: 'Menu', search: 'Search dishes or ingredients', favorites: 'Favourites', share: 'Share menu',
    copied: 'Link copied.', waiterSent: 'Request sent.', waiterError: 'Request failed. Try again.', popular: 'Popular', chef: 'Chef’s selection',
    newDishes: 'New dishes', seasonal: 'Seasonal', menuCategories: 'Menu categories', all: 'All dishes',
    noDishes: 'No dishes found', noResults: 'Try a different search.', emptyMenu: 'The menu is being updated.',
    noFavorites: 'Open a dish to save it to favourites.',
    unavailable: 'Currently unavailable', addFavorite: 'Save to favourites', removeFavorite: 'Remove from favourites',
    pause: 'Pause video', play: 'Resume video',
    demoMedia: 'Demo imagery', video: 'Video', photo: 'Photo', close: 'Close', ingredients: 'Ingredients', required: 'Required',
    less: 'Decrease quantity', more: 'Increase quantity', quantity: 'Quantity', pairings: 'Try it with',
    orderError: 'We couldn’t send the order. Check dish availability and try again.',
    submitting: 'Sending…', orderName: 'Your name (optional)', kitchenNotes: 'Order notes (optional)',
    orderNumber: 'Order', items: 'Dishes', remove: 'Remove',
  },
};

type Translations = { name: string; name_ru?: string; name_en?: string };
type Descriptions = { description?: string; description_ru?: string; description_en?: string };

export const menuCopy = (language: Language) => copy[language];

export function localName(value: Translations, language: Language) {
  if (language === 'ru') return value.name_ru || value.name;
  if (language === 'en') return value.name_en || value.name;
  return value.name;
}

export function localDescription(value: Descriptions, language: Language) {
  if (language === 'ru') return value.description_ru || value.description;
  if (language === 'en') return value.description_en || value.description;
  return value.description;
}

export function localIngredients(item: MenuItem, language: Language) {
  if (language === 'ru') return item.ingredients_ru || item.ingredients;
  if (language === 'en') return item.ingredients_en || item.ingredients;
  return item.ingredients;
}

export const dishImage = (item: MenuItem) =>
  item.image_url || item.video_poster || item.video_thumbnail || item.media_gallery?.find((media) => media.media_type === 'IMAGE')?.url;

export const normalizeMenuSearch = (text: string) =>
  text.toLocaleLowerCase().replace(/['‘’ʻʼ`]/g, '').normalize('NFKD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim();

export function defaultMenuCategory(categories: Category[]) {
  const populated = categories.filter((category) => category.menu_items?.length);
  return populated.find((category) => normalizeMenuSearch(category.name) === 'milliy taomlar') || populated[0];
}
