import type { MenuItem, Restaurant } from '../types';

export const signatureSlug = 'sofa-signature';
export const signatureMedia = '/media/sofa-signature';

export type MenuClip = {
  src: string;
  poster?: string;
};

const signatureClips: MenuClip[] = ['plov', 'grill', 'pizza'].map((name) => ({
  src: `${signatureMedia}/${name}.mp4`,
  poster: `${signatureMedia}/${name}-poster.webp`,
}));

export function menuClips(restaurant: Restaurant): MenuClip[] {
  if (restaurant.slug === signatureSlug) return signatureClips;
  const src = restaurant.menu_hero_video || restaurant.hero_video;
  return src ? [{ src, poster: restaurant.hero_image }] : [];
}
