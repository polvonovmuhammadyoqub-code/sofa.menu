import type { Restaurant } from '../types';
import { signatureSlug } from './menuMedia';

export function menuContacts(restaurant: Restaurant) {
  if (restaurant.slug === signatureSlug) {
    return {
      phone: { text: '+998 92 198 50 99', href: 'tel:+998921985099' },
      telegram: { text: '@mupolvonov', href: 'https://t.me/mupolvonov' },
    };
  }

  const phoneNumber = restaurant.phone?.replace(/[\s().-]/g, '');
  const telegram = restaurant.telegram_url?.match(/^https:\/\/t\.me\/([a-zA-Z0-9_]{5,32})\/?$/i);
  return {
    phone: phoneNumber && /^\+?[0-9]{9,15}$/.test(phoneNumber)
      ? { text: restaurant.phone, href: 'tel:' + phoneNumber }
      : undefined,
    telegram: telegram ? { text: '@' + telegram[1], href: 'https://t.me/' + telegram[1] } : undefined,
  };
}
