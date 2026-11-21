import { describe, expect, it } from 'vitest';
import { defaultMenuCategory, localDescription, localName, normalizeMenuSearch } from '../src/lib/guestMenu';
import { menuContacts } from '../src/lib/menuContacts';
import { menuClips } from '../src/lib/menuMedia';
import { menuPhoto } from '../src/lib/menuPhotos';
import type { Category, MenuItem, Restaurant } from '../src/types';

const dish: MenuItem = {
  id: 'pilaf',
  restaurant_id: 'restaurant',
  category_id: 'mains',
  name: 'To‘y palovi',
  name_en: 'SOFA Signature Wedding Pilaf',
  name_ru: 'Свадебный плов',
  description: 'Devzira guruchi bilan',
  description_en: 'With devzira rice',
  price: 88_000,
  is_featured: true,
  is_video_featured: false,
  is_available: true,
  sort_order: 1,
};

const signature = {
  slug: 'sofa-signature',
  phone: '+998 71 200 88 00',
  telegram_url: 'https://t.me/previous_owner',
  hero_video: 'https://assets.mixkit.co/videos/preview/mixkit-chef-garnishing-a-gourmet-dish-41528-large.mp4',
  menu_hero_video: '/demo/chef.mp4',
} as Restaurant;

describe('guest menu', () => {
  it('finds Uzbek words across keyboard apostrophes and normalizes accented names', () => {
    expect(normalizeMenuSearch(dish.name)).toBe(normalizeMenuSearch("  TO'Y   palovi "));
    expect(normalizeMenuSearch('Toʻy palovi')).toBe('toy palovi');
    expect(normalizeMenuSearch('Crème brûlée')).toBe('creme brulee');
  });

  it('uses a saved translation and falls back to the dish’s original text', () => {
    expect(localName(dish, 'ru')).toBe('Свадебный плов');
    expect(localName({ ...dish, name_en: undefined }, 'en')).toBe(dish.name);
    expect(localDescription(dish, 'en')).toBe('With devzira rice');
  });

  it('starts in Milliy taomlar and falls back to the first populated section', () => {
    const salad = { id: 'salad', name: 'Salatlar', menu_items: [dish] } as Category;
    const national = { id: 'national', name: 'Milliy taomlar', menu_items: [dish] } as Category;
    expect(defaultMenuCategory([salad, national])).toBe(national);
    expect(defaultMenuCategory([{ ...national, menu_items: [] }, salad])).toBe(salad);
    expect(defaultMenuCategory([])).toBeUndefined();
  });

  it('uses the verified Signature playlist even when both saved videos are stale', () => {
    expect(menuClips(signature).map(({ src }) => src)).toEqual([
      '/media/sofa-signature/plov.mp4',
      '/media/sofa-signature/grill.mp4',
      '/media/sofa-signature/pizza.mp4',
    ]);
    expect(menuClips({ ...signature, slug: 'another', menu_hero_video: '/uploads/menu.mp4' }))
      .toEqual([{ src: '/uploads/menu.mp4', poster: undefined }]);
  });

  it('uses the supplied contact details only for Signature', () => {
    expect(menuContacts(signature)).toEqual({
      phone: { text: '+998 92 198 50 99', href: 'tel:+998921985099' },
      telegram: { text: '@mupolvonov', href: 'https://t.me/mupolvonov' },
    });
    expect(menuContacts({ ...signature, slug: 'another' }).phone?.href).toBe('tel:+998712008800');
    expect(menuContacts({ ...signature, slug: 'another' }).telegram?.href).toBe('https://t.me/previous_owner');
  });

  it('prefers restaurant photographs, replaces known sample mistakes, and omits unverified stock', () => {
    const oldPhoto = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200';
    const original = { ...dish, image_url: oldPhoto };
    expect(menuPhoto(original, signature.slug)).toBe('/media/sofa-signature/toshkent-toy-oshi.webp');
    expect(menuPhoto({ ...original, name_en: 'Unreviewed dish' }, signature.slug)).toBeUndefined();

    const withGallery: MenuItem = {
      ...original,
      media_gallery: [
        { id: 'video', menu_item_id: dish.id, media_type: 'VIDEO', url: '/uploads/food.mp4', sort_order: 0 },
        { id: 'photo', menu_item_id: dish.id, media_type: 'IMAGE', url: '/uploads/kitchen.webp', sort_order: 1 },
      ],
    };
    expect(menuPhoto(withGallery, signature.slug)).toBe('/uploads/kitchen.webp');
    expect(menuPhoto({ ...withGallery, image_url: '/uploads/owner-photo.webp' }, signature.slug)).toBe('/uploads/owner-photo.webp');
    expect(menuPhoto(original, 'another')).toBe(oldPhoto);
  });
});
