import { describe, expect, it } from 'vitest';
import { dishCollection, dishImage, dishVideo, localDescription, localName, normalizeMenuSearch } from '../src/lib/guestMenu';
import type { MenuItem } from '../src/types';

const dish: MenuItem = {
  id: 'pilaf',
  restaurant_id: 'restaurant',
  category_id: 'mains',
  name: 'To‘y palovi',
  name_ru: 'Свадебный плов',
  description: 'Devzira guruchi bilan',
  description_en: 'With devzira rice',
  price: 88_000,
  is_featured: true,
  is_video_featured: false,
  is_available: true,
  sort_order: 1,
};

describe('guest menu', () => {
  it('finds Uzbek words across keyboard apostrophes and normalizes accented names', () => {
    expect(normalizeMenuSearch(dish.name)).toBe(normalizeMenuSearch("  TO'Y   palovi "));
    expect(normalizeMenuSearch('Toʻy palovi')).toBe('toy palovi');
    expect(normalizeMenuSearch('Crème brûlée')).toBe('creme brulee');
  });

  it('uses a saved translation and falls back to the dish’s original text', () => {
    expect(localName(dish, 'ru')).toBe('Свадебный плов');
    expect(localName(dish, 'en')).toBe(dish.name);
    expect(localDescription(dish, 'en')).toBe('With devzira rice');
  });

  it('keeps explicitly categorized badges when the dish is also featured', () => {
    expect(dishCollection(dish)).toBe('chef');
    expect(dishCollection({ ...dish, popularity_badge: 'Bestseller' })).toBe('popular');
    expect(dishCollection({ ...dish, popularity_badge: 'Mavsumiy' })).toBe('seasonal');
    expect(dishCollection({ ...dish, popularity_badge: 'Yangi' })).toBe('newDishes');
  });

  it('loads configured gallery stills and video when direct media is absent', () => {
    const withGallery: MenuItem = {
      ...dish,
      media_gallery: [
        { id: 'photo', menu_item_id: dish.id, media_type: 'IMAGE', url: '/menu/pilaf.webp', sort_order: 0 },
        { id: 'video', menu_item_id: dish.id, media_type: 'VIDEO', url: '/menu/pilaf.mp4', sort_order: 1 },
      ],
    };
    expect(dishImage(withGallery)).toBe('/menu/pilaf.webp');
    expect(dishVideo(withGallery)).toBe('/menu/pilaf.mp4');
    expect(dishImage({ ...withGallery, image_url: '/menu/pilaf-new.webp' })).toBe('/menu/pilaf-new.webp');
  });
});
